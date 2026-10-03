// ============================================================
// Horario nocturno (lógica pura).
// La tienda cierra de 8:00 PM a 8:00 AM. Fuera de horario, el bot
// captura la solicitud pero no la procesa; a la apertura, el panel
// agrupa los tickets nocturnos.
//
// El cierre se determina por:
//   1) Override manual (flag fuera_de_horario_activo): si está puesto,
//      manda sobre el reloj (admin puede forzar abierto/cerrado).
//   2) Reloj: hora >= 20 (8pm) o hora < 8 (8am) => nocturno.
//
// Funciones puras: reciben la hora/override, no leen el reloj global,
// para poder testearlas de forma determinista.
// ============================================================

/** Hora de inicio del cierre nocturno (20 = 8:00 PM). */
export const HORA_CIERRE = 20;
/** Hora de apertura (8 = 8:00 AM). */
export const HORA_APERTURA = 8;

/**
 * ¿La hora dada cae en franja nocturna (tienda cerrada)?
 * Nocturno si hora >= 20 o hora < 8.
 * @param hora Hora local 0-23.
 */
export function esHoraNocturna(hora: number): boolean {
  if (!Number.isInteger(hora) || hora < 0 || hora > 23) {
    throw new Error(`Hora inválida: ${hora}. Debe estar entre 0 y 23.`);
  }
  return hora >= HORA_CIERRE || hora < HORA_APERTURA;
}

/**
 * Override manual del horario. El admin puede forzar el estado:
 *  - 'forzar_cerrado': siempre nocturno.
 *  - 'forzar_abierto': nunca nocturno.
 *  - 'auto' (por defecto): decide por reloj.
 */
export type OverrideHorario = "auto" | "forzar_cerrado" | "forzar_abierto";

export interface ContextoHorario {
  /** Hora local actual (0-23). */
  hora: number;
  /** Override manual; por defecto 'auto'. */
  override?: OverrideHorario;
}

/**
 * Decide si la tienda está fuera de horario (nocturno/cerrada),
 * combinando el override manual con el reloj.
 */
export function estaFueraDeHorario(ctx: ContextoHorario): boolean {
  const override = ctx.override ?? "auto";
  if (override === "forzar_cerrado") return true;
  if (override === "forzar_abierto") return false;
  return esHoraNocturna(ctx.hora);
}

/**
 * Traduce el flag booleano `fuera_de_horario_activo` de la BD a un
 * OverrideHorario. true => forzar_cerrado, false => auto.
 * (En R1 el flag actúa como "forzar cerrado" cuando está activo.)
 */
export function overrideDesdeFlag(flagActivo: boolean): OverrideHorario {
  return flagActivo ? "forzar_cerrado" : "auto";
}

/** Extrae la hora local (0-23) de un Date. Helper para el borde con el reloj. */
export function horaDe(fecha: Date): number {
  return fecha.getHours();
}
