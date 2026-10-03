// ============================================================
// Server Actions del panel de mostrador.
// Operan con el cliente de servidor con sesión (respeta RLS: solo
// staff autenticado). El "tomar" usa un UPDATE condicional atómico
// para el bloqueo anti-duplicidad entre terminales.
// ============================================================
"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireStaff, requireAdmin } from "@/lib/auth";
import { puedeImprimirAhora } from "@/lib/rules/antimerma";
import { urlFirmadaAdjunto } from "@/lib/whatsapp/media";
import { overrideDesdeFlag } from "@/lib/rules/horario";
import { enviarMensajeTexto } from "@/lib/whatsapp/sender";
import { FLAG_MODULO_TRAMITES, FLAG_FUERA_DE_HORARIO } from "@/lib/types";

export interface ResultadoAccion {
  ok: boolean;
  mensaje?: string;
}

/**
 * Obtiene el teléfono del cliente dueño de un ticket (para notificarle).
 * Devuelve null si no se encuentra.
 */
async function telefonoDelTicket(ticketId: string): Promise<string | null> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("tickets_atencion")
    .select("clientes(telefono)")
    .eq("id", ticketId)
    .maybeSingle();
  // La relación puede venir como objeto o arreglo según el join.
  const rel = (data as { clientes?: { telefono?: string } | { telefono?: string }[] } | null)
    ?.clientes;
  const tel = Array.isArray(rel) ? rel[0]?.telefono : rel?.telefono;
  return tel ?? null;
}

/** Notifica al cliente del ticket por WhatsApp (mock en local). */
async function notificarCliente(ticketId: string, texto: string): Promise<void> {
  const tel = await telefonoDelTicket(ticketId);
  if (tel) {
    try {
      await enviarMensajeTexto(tel, texto);
    } catch (e) {
      console.error("[panel] No se pudo notificar al cliente:", e);
    }
  }
}

/**
 * Toma un ticket para una terminal, con bloqueo anti-duplicidad.
 * UPDATE condicional: solo tiene efecto si atendido_por_terminal IS NULL.
 */
export async function tomarTicket(
  ticketId: string,
  terminal: string
): Promise<ResultadoAccion> {
  const perfil = await requireStaff();
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("tickets_atencion")
    .update({
      atendido_por_terminal: terminal,
      atendido_por_usuario: perfil.nombre ?? perfil.id,
    })
    .eq("id", ticketId)
    .is("atendido_por_terminal", null)
    .select("id")
    .maybeSingle();

  revalidatePath("/panel");

  if (error) return { ok: false, mensaje: error.message };
  if (!data) {
    return {
      ok: false,
      mensaje: "El ticket ya fue tomado por otra terminal.",
    };
  }
  return { ok: true };
}

/** Libera un ticket (quita el bloqueo de terminal). */
export async function liberarTicket(
  ticketId: string
): Promise<ResultadoAccion> {
  await requireStaff();
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("tickets_atencion")
    .update({ atendido_por_terminal: null, atendido_por_usuario: null })
    .eq("id", ticketId);

  revalidatePath("/panel");
  return error ? { ok: false, mensaje: error.message } : { ok: true };
}

/**
 * Confirma el pago de un ticket con pago previo (CoDi/transferencia).
 * pendiente_validacion_pago -> pagado_imprimir, pago_confirmado = true.
 */
export async function confirmarPago(
  ticketId: string
): Promise<ResultadoAccion> {
  await requireStaff();
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("tickets_atencion")
    .update({ estado: "pagado_imprimir", pago_confirmado: true })
    .eq("id", ticketId)
    .eq("estado", "pendiente_validacion_pago")
    .select("id")
    .maybeSingle();

  revalidatePath("/panel");
  if (error) return { ok: false, mensaje: error.message };
  if (!data) return { ok: false, mensaje: "El ticket no está en validación de pago." };
  return { ok: true };
}

/**
 * El empleado confirma el TOTAL a pagar de un ticket de impresión con pago
 * previo. Guarda el total en detalles_json y notifica al cliente para que
 * envíe su comprobante (CoDi/transferencia). No cambia el estado.
 */
export async function confirmarTotal(
  ticketId: string,
  total: number
): Promise<ResultadoAccion> {
  await requireStaff();
  if (!(total > 0)) {
    return { ok: false, mensaje: "El total debe ser mayor a 0." };
  }
  const supabase = await createSupabaseServerClient();

  // Lee los detalles actuales para no perder lo ya capturado.
  const { data: actual } = await supabase
    .from("tickets_atencion")
    .select("detalles_json")
    .eq("id", ticketId)
    .maybeSingle();

  const detalles = {
    ...((actual?.detalles_json as Record<string, unknown>) ?? {}),
    total,
  };

  const { error } = await supabase
    .from("tickets_atencion")
    .update({ detalles_json: detalles })
    .eq("id", ticketId);

  if (error) return { ok: false, mensaje: error.message };

  await notificarCliente(
    ticketId,
    `El total de tu impresión es $${total.toFixed(2)} MXN. ` +
      "Realiza tu pago por CoDi/transferencia y envía aquí tu comprobante " +
      "para procesar la impresión."
  );

  revalidatePath("/panel");
  return { ok: true };
}

/**
 * Envía a impresión (en_proceso). Aplica el invariante anti-merma:
 * - pagado_imprimir requiere pago_confirmado.
 * - pendiente_presencial permite (el cobro ocurre en caja al imprimir).
 */
export async function imprimirTicket(
  ticketId: string
): Promise<ResultadoAccion> {
  await requireStaff();
  const supabase = await createSupabaseServerClient();

  const { data: ticket, error: errLeer } = await supabase
    .from("tickets_atencion")
    .select("estado, pago_confirmado")
    .eq("id", ticketId)
    .maybeSingle();

  if (errLeer) return { ok: false, mensaje: errLeer.message };
  if (!ticket) return { ok: false, mensaje: "Ticket no encontrado." };

  if (!puedeImprimirAhora(ticket.estado, ticket.pago_confirmado ?? false)) {
    return {
      ok: false,
      mensaje: "No se puede imprimir: el pago no está confirmado.",
    };
  }

  const { error } = await supabase
    .from("tickets_atencion")
    .update({ estado: "en_proceso" })
    .eq("id", ticketId);

  if (!error) {
    await notificarCliente(
      ticketId,
      "✅ ¡Tu pago fue validado! Tus impresiones ya están en proceso y listas " +
        "para recoger en el mostrador. Gracias por tu preferencia."
    );
  }

  revalidatePath("/panel");
  return error ? { ok: false, mensaje: error.message } : { ok: true };
}

/** Pausa un ticket presencial (vuelve a espera de confirmación en caja). */
export async function pausarTicket(
  ticketId: string
): Promise<ResultadoAccion> {
  await requireStaff();
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("tickets_atencion")
    .update({ estado: "pendiente_presencial" })
    .eq("id", ticketId)
    .in("estado", ["en_proceso", "fuera_horario_incompleto"]);

  revalidatePath("/panel");
  return error ? { ok: false, mensaje: error.message } : { ok: true };
}

/** Marca el ticket como completado. */
export async function completarTicket(
  ticketId: string
): Promise<ResultadoAccion> {
  await requireStaff();
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("tickets_atencion")
    .update({ estado: "completado" })
    .eq("id", ticketId);

  revalidatePath("/panel");
  return error ? { ok: false, mensaje: error.message } : { ok: true };
}

/** Cancela el ticket. */
export async function cancelarTicket(
  ticketId: string
): Promise<ResultadoAccion> {
  await requireStaff();
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("tickets_atencion")
    .update({ estado: "cancelado" })
    .eq("id", ticketId);

  revalidatePath("/panel");
  return error ? { ok: false, mensaje: error.message } : { ok: true };
}

/** Genera una URL firmada temporal para ver el comprobante adjunto. */
export async function obtenerUrlComprobante(
  path: string
): Promise<string | null> {
  await requireStaff();
  return urlFirmadaAdjunto(path, 3600);
}

// ============================================================
// Acciones de ADMIN: feature flags y override de horario.
// ============================================================

/** Activa/desactiva el módulo de trámites (solo admin). */
export async function toggleModuloTramites(
  activo: boolean
): Promise<ResultadoAccion> {
  await requireAdmin();
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("configuracion_sistema")
    .update({ valor_boolean: activo })
    .eq("clave", FLAG_MODULO_TRAMITES);

  revalidatePath("/panel");
  return error ? { ok: false, mensaje: error.message } : { ok: true };
}

/** Fuerza/quita el modo fuera de horario (override manual, solo admin). */
export async function toggleFueraDeHorario(
  activo: boolean
): Promise<ResultadoAccion> {
  await requireAdmin();
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("configuracion_sistema")
    .update({ valor_boolean: activo })
    .eq("clave", FLAG_FUERA_DE_HORARIO);

  revalidatePath("/panel");
  // overrideDesdeFlag documenta cómo el flag se traduce a comportamiento.
  void overrideDesdeFlag(activo);
  return error ? { ok: false, mensaje: error.message } : { ok: true };
}
