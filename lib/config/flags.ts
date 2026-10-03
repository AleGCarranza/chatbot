// ============================================================
// Lectura de feature flags / estado global desde configuracion_sistema.
// Usa el cliente admin (service role) porque se consulta desde el
// webhook (backend confiable). Devuelve defaults seguros si falta la
// clave o hay error de lectura.
// ============================================================
import "server-only";

import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { FLAG_MODULO_TRAMITES, FLAG_FUERA_DE_HORARIO } from "@/lib/types";

/** Lee un flag booleano. Devuelve `fallback` si no existe o hay error. */
export async function leerFlag(
  clave: string,
  fallback = false
): Promise<boolean> {
  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("configuracion_sistema")
      .select("valor_boolean")
      .eq("clave", clave)
      .maybeSingle();

    if (error || !data) return fallback;
    return data.valor_boolean ?? fallback;
  } catch {
    return fallback;
  }
}

/** Estado consolidado de los flags conocidos de R1. */
export interface FlagsSistema {
  moduloTramitesActivo: boolean;
  fueraDeHorarioActivo: boolean;
}

/** Lee todos los flags conocidos en una sola llamada. */
export async function leerFlags(): Promise<FlagsSistema> {
  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("configuracion_sistema")
      .select("clave, valor_boolean")
      .in("clave", [FLAG_MODULO_TRAMITES, FLAG_FUERA_DE_HORARIO]);

    if (error || !data) {
      return { moduloTramitesActivo: false, fueraDeHorarioActivo: false };
    }

    const mapa = new Map(data.map((r) => [r.clave, r.valor_boolean ?? false]));
    return {
      moduloTramitesActivo: mapa.get(FLAG_MODULO_TRAMITES) ?? false,
      fueraDeHorarioActivo: mapa.get(FLAG_FUERA_DE_HORARIO) ?? false,
    };
  } catch {
    return { moduloTramitesActivo: false, fueraDeHorarioActivo: false };
  }
}
