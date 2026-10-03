// ============================================================
// Resolución de clientes por teléfono (backend / webhook).
// Usa el cliente admin (service role). Crea el cliente si no existe,
// o devuelve el existente (restricción UNIQUE en telefono).
// ============================================================
import "server-only";

import { getSupabaseAdmin } from "@/lib/supabase/admin";
import type { Cliente } from "@/lib/types";

/**
 * Resuelve el cliente a partir del teléfono de WhatsApp.
 * - Si no existe, lo crea con el nombre de WhatsApp.
 * - Si existe, lo devuelve (y refresca nombre_whatsapp si cambió).
 *
 * Usa upsert con onConflict en `telefono` para ser idempotente y
 * evitar condiciones de carrera entre mensajes casi simultáneos.
 */
export async function resolverCliente(
  telefono: string,
  nombreWhatsapp: string
): Promise<Cliente> {
  const supabase = getSupabaseAdmin();

  // Intento de lectura rápida (caso común: cliente ya existe).
  const existente = await supabase
    .from("clientes")
    .select("*")
    .eq("telefono", telefono)
    .maybeSingle();

  if (existente.data) {
    // Refresca el nombre de WhatsApp si cambió (no toca nombre_confirmado).
    if (nombreWhatsapp && existente.data.nombre_whatsapp !== nombreWhatsapp) {
      const actualizado = await supabase
        .from("clientes")
        .update({ nombre_whatsapp: nombreWhatsapp })
        .eq("id", existente.data.id)
        .select("*")
        .single();
      if (!actualizado.error && actualizado.data) return actualizado.data;
    }
    return existente.data;
  }

  // No existe: upsert idempotente por teléfono.
  const creado = await supabase
    .from("clientes")
    .upsert(
      { telefono, nombre_whatsapp: nombreWhatsapp || "Cliente" },
      { onConflict: "telefono" }
    )
    .select("*")
    .single();

  if (creado.error || !creado.data) {
    throw new Error(
      `No se pudo resolver el cliente ${telefono}: ${creado.error?.message}`
    );
  }

  return creado.data;
}

/** Actualiza el nombre confirmado por el cliente durante la conversación. */
export async function confirmarNombreCliente(
  clienteId: string,
  nombreConfirmado: string
): Promise<void> {
  const supabase = getSupabaseAdmin();
  await supabase
    .from("clientes")
    .update({ nombre_confirmado: nombreConfirmado })
    .eq("id", clienteId);
}
