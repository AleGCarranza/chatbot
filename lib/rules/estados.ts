// ============================================================
// Máquina de estados del ticket de atención (lógica pura).
// Define qué transiciones de estado son válidas y helpers de
// clasificación. Sin dependencias de BD: fácil de testear.
//
// Diagrama (ver design.md):
//   pendiente_validacion_pago --(confirmar pago)--> pagado_imprimir
//   pagado_imprimir           --(imprimir)-------->  en_proceso
//   pendiente_presencial      --(imprimir)-------->  en_proceso
//   en_proceso                --(completar)------->  completado
//   fuera_horario_incompleto  --(retomar)--------->  (según pago)
//   * (operable)              --(cancelar)-------->  cancelado
// ============================================================
import type { EstadoTicket } from "@/lib/types";

/** Estados en los que el ticket ya no admite más transiciones. */
export const ESTADOS_FINALES: readonly EstadoTicket[] = [
  "completado",
  "cancelado",
] as const;

/**
 * Transiciones permitidas: de cada estado, a qué estados se puede pasar.
 */
const TRANSICIONES: Record<EstadoTicket, readonly EstadoTicket[]> = {
  pendiente_validacion_pago: ["pagado_imprimir", "cancelado"],
  pagado_imprimir: ["en_proceso", "cancelado"],
  pendiente_presencial: ["en_proceso", "cancelado"],
  en_proceso: ["completado", "cancelado"],
  fuera_horario_incompleto: [
    "pendiente_presencial",
    "pendiente_validacion_pago",
    "pagado_imprimir",
    "cancelado",
  ],
  completado: [],
  cancelado: [],
};

/** ¿El estado es final (no admite más cambios)? */
export function esEstadoFinal(estado: EstadoTicket): boolean {
  return ESTADOS_FINALES.includes(estado);
}

/** ¿Es válida la transición de `desde` a `hacia`? */
export function puedeTransicionar(
  desde: EstadoTicket,
  hacia: EstadoTicket
): boolean {
  return TRANSICIONES[desde]?.includes(hacia) ?? false;
}

/** Lista de estados alcanzables desde `estado`. */
export function transicionesPosibles(
  estado: EstadoTicket
): readonly EstadoTicket[] {
  return TRANSICIONES[estado] ?? [];
}

/**
 * Aplica una transición y devuelve el nuevo estado.
 * Lanza si la transición no es válida (fallo explícito).
 */
export function aplicarTransicion(
  desde: EstadoTicket,
  hacia: EstadoTicket
): EstadoTicket {
  if (!puedeTransicionar(desde, hacia)) {
    throw new Error(
      `Transición inválida de "${desde}" a "${hacia}".`
    );
  }
  return hacia;
}

/** ¿El ticket está pausado esperando confirmación presencial? */
export function estaPausadoPresencial(estado: EstadoTicket): boolean {
  return estado === "pendiente_presencial";
}

/** ¿El ticket está listo para imprimir tras pago confirmado? */
export function estaListoParaImprimir(estado: EstadoTicket): boolean {
  return estado === "pagado_imprimir";
}
