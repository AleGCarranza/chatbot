// ============================================================
// Cliente Supabase ADMIN (service role) para operaciones de backend.
// Omite RLS. Úsalo SOLO en servidor confiable: webhook, jobs,
// procesos sin sesión de usuario. NUNCA lo expongas al navegador.
// ============================================================
import "server-only";

import { createClient, SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

let cached: SupabaseClient<Database> | null = null;

/**
 * Devuelve un cliente Supabase con permisos de service role.
 * Lanza un error claro si faltan las variables de entorno.
 */
export function getSupabaseAdmin(): SupabaseClient<Database> {
  if (cached) return cached;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "[supabase/admin] Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY."
    );
  }

  cached = createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  return cached;
}
