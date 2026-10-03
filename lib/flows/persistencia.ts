// ============================================================
// Persistencia del motor conversacional (admin client / backend).
//  - Carga/guarda/cierra la sesión de conversación por cliente.
//  - Materializa la acción AccionCrearTicket en tickets_atencion,
//    aplicando el filtro anti-merma para el estado inicial y
//    marcando es_nocturno si corresponde.
// ============================================================
import "server-only";

import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { estadoInicialPorPago } from "@/lib/rules/antimerma";
import type { EstadoConversacion } from "./tipos";
import type { AccionCrearTicket } from "./tipos";
import type { EstadoTicket } from "@/lib/types";
import type { Json } from "@/lib/database.types";

/** Carga la sesión activa del cliente (o null si no hay). */
export async function cargarSesion(
  clienteId: string
): Promise<EstadoConversacion | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("sesiones_conversacion")
    .select("paso, datos_json")
    .eq("cliente_id", clienteId)
    .maybeSingle();

  if (error || !data) return null;

  return {
    paso: data.paso as EstadoConversacion["paso"],
    datos: (data.datos_json ?? {}) as EstadoConversacion["datos"],
  };
}

/** Guarda (upsert) el estado de la conversación del cliente. */
export async function guardarSesion(
  clienteId: string,
  estado: EstadoConversacion
): Promise<void> {
  const supabase = getSupabaseAdmin();
  await supabase.from("sesiones_conversacion").upsert(
    {
      cliente_id: clienteId,
      paso: estado.paso,
      datos_json: estado.datos as unknown as NonNullable<Json>,
    },
    { onConflict: "cliente_id" }
  );
}

/** Cierra (elimina) la sesión del cliente al finalizar la conversación. */
export async function cerrarSesion(clienteId: string): Promise<void> {
  const supabase = getSupabaseAdmin();
  await supabase
    .from("sesiones_conversacion")
    .delete()
    .eq("cliente_id", clienteId);
}

/**
 * Materializa la acción de crear ticket en tickets_atencion.
 * - Impresiones: estado inicial según método de pago (anti-merma).
 * - Cotización/Facturación: no imprimen; entran en_proceso para gestión.
 * Devuelve el folio del ticket creado.
 */
export async function crearTicketDesdeAccion(
  clienteId: string,
  accion: AccionCrearTicket,
  esNocturno: boolean
): Promise<{ folio: number } | null> {
  const supabase = getSupabaseAdmin();

  const estado = estadoInicialTicket(accion, esNocturno);

  const { data, error } = await supabase
    .from("tickets_atencion")
    .insert({
      cliente_id: clienteId,
      tipo_flujo: accion.tipoFlujo,
      estado,
      metodo_pago: accion.metodoPago ?? null,
      comprobante_url: accion.comprobantePath ?? null,
      detalles_json: accion.detalles as unknown as NonNullable<Json>,
      es_nocturno: esNocturno,
    })
    .select("folio")
    .single();

  // Si es facturación, persistimos RFC / No. Cliente en el cliente.
  if (!error && accion.tipoFlujo === "facturacion") {
    await actualizarDatosFiscales(clienteId, accion.detalles);
  }

  if (error || !data) return null;
  return { folio: data.folio };
}

/** Decide el estado inicial del ticket según el tipo de flujo y el pago. */
function estadoInicialTicket(
  accion: AccionCrearTicket,
  esNocturno: boolean
): EstadoTicket {
  // Fuera de horario: trabajos de impresión quedan como incompletos
  // nocturnos a la espera de la apertura.
  if (esNocturno && accion.tipoFlujo.startsWith("impresion")) {
    return "fuera_horario_incompleto";
  }

  if (accion.tipoFlujo === "impresion_estandar" || accion.tipoFlujo === "impresion_express") {
    return accion.metodoPago
      ? estadoInicialPorPago(accion.metodoPago)
      : "pendiente_presencial";
  }

  // Cotización y facturación entran a gestión directa.
  return "en_proceso";
}

/** Guarda numero_cliente_sicar / rfc en el cliente si vienen en los detalles. */
async function actualizarDatosFiscales(
  clienteId: string,
  detalles: Record<string, unknown>
): Promise<void> {
  const supabase = getSupabaseAdmin();
  const patch: { numero_cliente_sicar?: string; rfc?: string } = {};
  if (typeof detalles.numeroClienteSicar === "string") {
    patch.numero_cliente_sicar = detalles.numeroClienteSicar;
  }
  if (typeof detalles.rfc === "string") {
    patch.rfc = detalles.rfc;
  }
  if (Object.keys(patch).length > 0) {
    await supabase.from("clientes").update(patch).eq("id", clienteId);
  }
}
