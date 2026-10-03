// ============================================================
// Cliente Supabase para el NAVEGADOR (anon key) con @supabase/ssr.
// Úsalo en componentes de cliente del panel y para Realtime.
// NUNCA uses aquí la service role key.
// ============================================================
"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/lib/database.types";

export function createSupabaseBrowserClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn(
      "[supabase/client] Faltan NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY."
    );
  }

  return createBrowserClient<Database>(supabaseUrl ?? "", supabaseAnonKey ?? "");
}
