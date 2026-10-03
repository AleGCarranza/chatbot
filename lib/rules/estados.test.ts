import { describe, it, expect } from "vitest";
import {
  esEstadoFinal,
  puedeTransicionar,
  transicionesPosibles,
  aplicarTransicion,
  estaPausadoPresencial,
  estaListoParaImprimir,
} from "./estados";

describe("estados: esEstadoFinal", () => {
  it("completado y cancelado son finales", () => {
    expect(esEstadoFinal("completado")).toBe(true);
    expect(esEstadoFinal("cancelado")).toBe(true);
  });

  it("los demás no son finales", () => {
    expect(esEstadoFinal("pendiente_presencial")).toBe(false);
    expect(esEstadoFinal("en_proceso")).toBe(false);
  });
});

describe("estados: puedeTransicionar", () => {
  it("pago previo: validacion -> pagado_imprimir", () => {
    expect(
      puedeTransicionar("pendiente_validacion_pago", "pagado_imprimir")
    ).toBe(true);
  });

  it("pagado_imprimir -> en_proceso", () => {
    expect(puedeTransicionar("pagado_imprimir", "en_proceso")).toBe(true);
  });

  it("presencial -> en_proceso", () => {
    expect(puedeTransicionar("pendiente_presencial", "en_proceso")).toBe(true);
  });

  it("en_proceso -> completado", () => {
    expect(puedeTransicionar("en_proceso", "completado")).toBe(true);
  });

  it("cualquier estado operable -> cancelado", () => {
    expect(puedeTransicionar("pendiente_presencial", "cancelado")).toBe(true);
    expect(puedeTransicionar("en_proceso", "cancelado")).toBe(true);
  });

  it("rechaza transiciones inválidas", () => {
    expect(puedeTransicionar("pendiente_presencial", "pagado_imprimir")).toBe(
      false
    );
    expect(puedeTransicionar("completado", "en_proceso")).toBe(false);
    expect(puedeTransicionar("cancelado", "en_proceso")).toBe(false);
  });

  it("no se puede saltar validación de pago directo a impresión", () => {
    expect(
      puedeTransicionar("pendiente_validacion_pago", "en_proceso")
    ).toBe(false);
  });
});

describe("estados: transicionesPosibles", () => {
  it("estados finales no tienen transiciones", () => {
    expect(transicionesPosibles("completado")).toEqual([]);
    expect(transicionesPosibles("cancelado")).toEqual([]);
  });

  it("fuera_horario_incompleto puede retomarse a los estados de pago", () => {
    const t = transicionesPosibles("fuera_horario_incompleto");
    expect(t).toContain("pendiente_presencial");
    expect(t).toContain("pendiente_validacion_pago");
    expect(t).toContain("pagado_imprimir");
    expect(t).toContain("cancelado");
  });
});

describe("estados: aplicarTransicion", () => {
  it("devuelve el nuevo estado si es válido", () => {
    expect(aplicarTransicion("pagado_imprimir", "en_proceso")).toBe(
      "en_proceso"
    );
  });

  it("lanza si la transición es inválida", () => {
    expect(() => aplicarTransicion("completado", "en_proceso")).toThrow();
  });
});

describe("estados: helpers de clasificación", () => {
  it("estaPausadoPresencial solo para pendiente_presencial", () => {
    expect(estaPausadoPresencial("pendiente_presencial")).toBe(true);
    expect(estaPausadoPresencial("pagado_imprimir")).toBe(false);
  });

  it("estaListoParaImprimir solo para pagado_imprimir", () => {
    expect(estaListoParaImprimir("pagado_imprimir")).toBe(true);
    expect(estaListoParaImprimir("pendiente_presencial")).toBe(false);
  });
});
