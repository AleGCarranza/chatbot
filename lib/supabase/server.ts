// ============================================================
// Cliente Supabase para el SERVIDOR con sesión de usuario (@supabase/ssr).
// Usa la anon key + cookies de la request: respeta RLS y la sesión
// autenticada (Supabase Auth). Úsalo en Server Components, Route
// Handlers y Server Actions donde actúes "como el usuario".
//
// Para operaciones de backend con privilegios (webhook, jobs),
// usa el cliente admin en lib/supabase/admin.ts.
// ============================================================
import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/lib/database.types";

export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "[supabase/server] Faltan NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY."
    );
  }

  return createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // setAll puede llamarse desde un Server Component donde las
          // cookies son de solo lectura. Es seguro ignorarlo si existe
          // un middleware que refresca la sesión.
        }
      },
    },
  });
}
