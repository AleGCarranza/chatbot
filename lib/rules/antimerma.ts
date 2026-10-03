// ============================================================
// Filtro Anti-Merma (lógica pura).
// Ningún trabajo se imprime sin pago confirmado.
//
//  - Pago PREVIO (CoDi / transferencia):
//      estado inicial = pendiente_validacion_pago
//      el empleado valida el comprobante y "Confirmar Pago"
//      -> pagado_imprimir (prioridad alta)
//
//  - Pago EN CAJA / presencial (efectivo_caja / tarjeta_caja):
//      estado inicial = pendiente_presencial (PAUSADO)
//      NO se imprime hasta que el cliente esté físicamente en caja
//      y el empleado presione "Imprimir".
// ============================================================
import type { EstadoTicket, MetodoPago } from "@/lib/types";

/** Métodos que implican pago previo (el cliente ya pagó, hay comprobante). */
export const METODOS_PAGO_PREVIO: readonly MetodoPago[] = [
  "codi",
  "transferencia",
] as const;

/** Métodos que se cobran físicamente en caja. */
export const METODOS_PAGO_EN_CAJA: readonly MetodoPago[] = [
  "efectivo_caja",
  "tarjeta_caja",
] as const;

/** ¿El método implica pago previo (requiere validar comprobante)? */
export function esPagoPrevio(metodo: MetodoPago): boolean {
  return METODOS_PAGO_PREVIO.includes(metodo);
}

/** ¿El método se cobra en caja (presencial)? */
export function esPagoEnCaja(metodo: MetodoPago): boolean {
  return METODOS_PAGO_EN_CAJA.includes(metodo);
}

/**
 * Estado inicial del ticket de impresión según el método de pago.
 * Pago previo -> validación de comprobante; pago en caja -> pausado.
 */
export function estadoInicialPorPago(metodo: MetodoPago): EstadoTicket {
  return esPagoPrevio(metodo)
    ? "pendiente_validacion_pago"
    : "pendiente_presencial";
}

/** Acciones que el panel puede exponer sobre un ticket de impresión. */
export interface AccionesTicket {
  /** Mostrar botón "Confirmar Pago" (validar comprobante de pago previo). */
  puedeConfirmarPago: boolean;
  /** Mostrar botón "Imprimir" (manda a impresión). */
  puedeImprimir: boolean;
  /** El ticket está pausado esperando al cliente en caja. */
  esperandoPresencial: boolean;
}

/**
 * Determina las acciones permitidas dado el estado y el pago confirmado.
 * Reglas anti-merma:
 *  - En pendiente_validacion_pago: solo "Confirmar Pago".
 *  - En pagado_imprimir: solo "Imprimir" (ya hay pago confirmado).
 *  - En pendiente_presencial: solo "Imprimir" cuando el cliente llega
 *    (se cobra en caja en ese momento); marcado como esperandoPresencial.
 *  - En cualquier otro estado: sin acciones de pago/impresión.
 */
export function accionesPermitidas(
  estado: EstadoTicket,
  pagoConfirmado: boolean
): AccionesTicket {
  switch (estado) {
    case "pendiente_validacion_pago":
      return {
        puedeConfirmarPago: true,
        puedeImprimir: false,
        esperandoPresencial: false,
      };
    case "pagado_imprimir":
      return {
        puedeConfirmarPago: false,
        puedeImprimir: pagoConfirmado,
        esperandoPresencial: false,
      };
    case "pendiente_presencial":
      return {
        puedeConfirmarPago: false,
        puedeImprimir: true, // al presionar, el cliente paga en caja
        esperandoPresencial: true,
      };
    default:
      return {
        puedeConfirmarPago: false,
        puedeImprimir: false,
        esperandoPresencial: false,
      };
  }
}

/**
 * Invariante de seguridad anti-merma: ¿se puede imprimir ESTE ticket ahora?
 * - pagado_imprimir requiere pago_confirmado = true.
 * - pendiente_presencial se permite (el cobro ocurre en caja al imprimir).
 * - cualquier otro estado: no.
 */
export function puedeImprimirAhora(
  estado: EstadoTicket,
  pagoConfirmado: boolean
): boolean {
  if (estado === "pagado_imprimir") return pagoConfirmado === true;
  if (estado === "pendiente_presencial") return true;
  return false;
}
