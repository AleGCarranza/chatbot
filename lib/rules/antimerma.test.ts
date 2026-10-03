import { describe, it, expect } from "vitest";
import {
  esPagoPrevio,
  esPagoEnCaja,
  estadoInicialPorPago,
  accionesPermitidas,
  puedeImprimirAhora,
} from "./antimerma";

describe("antimerma: clasificación de métodos de pago", () => {
  it("codi y transferencia son pago previo", () => {
    expect(esPagoPrevio("codi")).toBe(true);
    expect(esPagoPrevio("transferencia")).toBe(true);
  });

  it("efectivo y tarjeta en caja NO son pago previo", () => {
    expect(esPagoPrevio("efectivo_caja")).toBe(false);
    expect(esPagoPrevio("tarjeta_caja")).toBe(false);
  });

  it("efectivo y tarjeta son pago en caja", () => {
    expect(esPagoEnCaja("efectivo_caja")).toBe(true);
    expect(esPagoEnCaja("tarjeta_caja")).toBe(true);
  });
});

describe("antimerma: estadoInicialPorPago", () => {
  it("pago previo -> pendiente_validacion_pago", () => {
    expect(estadoInicialPorPago("codi")).toBe("pendiente_validacion_pago");
    expect(estadoInicialPorPago("transferencia")).toBe(
      "pendiente_validacion_pago"
    );
  });

  it("pago en caja -> pendiente_presencial (pausado)", () => {
    expect(estadoInicialPorPago("efectivo_caja")).toBe("pendiente_presencial");
    expect(estadoInicialPorPago("tarjeta_caja")).toBe("pendiente_presencial");
  });
});

describe("antimerma: accionesPermitidas", () => {
  it("pendiente_validacion_pago: solo confirmar pago", () => {
    const a = accionesPermitidas("pendiente_validacion_pago", false);
    expect(a.puedeConfirmarPago).toBe(true);
    expect(a.puedeImprimir).toBe(false);
    expect(a.esperandoPresencial).toBe(false);
  });

  it("pagado_imprimir con pago confirmado: puede imprimir", () => {
    const a = accionesPermitidas("pagado_imprimir", true);
    expect(a.puedeImprimir).toBe(true);
    expect(a.puedeConfirmarPago).toBe(false);
  });

  it("pagado_imprimir SIN pago confirmado: no puede imprimir", () => {
    const a = accionesPermitidas("pagado_imprimir", false);
    expect(a.puedeImprimir).toBe(false);
  });

  it("pendiente_presencial: imprime al llegar el cliente y marca esperando", () => {
    const a = accionesPermitidas("pendiente_presencial", false);
    expect(a.puedeImprimir).toBe(true);
    expect(a.esperandoPresencial).toBe(true);
    expect(a.puedeConfirmarPago).toBe(false);
  });

  it("estados sin acciones de pago/impresión", () => {
    const a = accionesPermitidas("en_proceso", true);
    expect(a.puedeConfirmarPago).toBe(false);
    expect(a.puedeImprimir).toBe(false);
    expect(a.esperandoPresencial).toBe(false);
  });
});

describe("antimerma: puedeImprimirAhora (invariante anti-merma)", () => {
  it("pagado_imprimir requiere pago confirmado", () => {
    expect(puedeImprimirAhora("pagado_imprimir", true)).toBe(true);
    expect(puedeImprimirAhora("pagado_imprimir", false)).toBe(false);
  });

  it("pendiente_presencial siempre permite (cobro en caja al imprimir)", () => {
    expect(puedeImprimirAhora("pendiente_presencial", false)).toBe(true);
  });

  it("validacion de pago NO permite imprimir aún", () => {
    expect(puedeImprimirAhora("pendiente_validacion_pago", false)).toBe(false);
  });

  it("estados finales no imprimen", () => {
    expect(puedeImprimirAhora("completado", true)).toBe(false);
    expect(puedeImprimirAhora("cancelado", true)).toBe(false);
  });
});
