import { describe, it, expect } from "vitest";
import { procesarTurno } from "./motor";
import type { ContextoBot, EntradaBot, EstadoConversacion } from "./tipos";

const CTX: ContextoBot = {
  moduloTramitesActivo: false,
  fueraDeHorario: false,
};

function entrada(texto: string | null, opcionId: string | null = null, adjuntoPath?: string | null): EntradaBot {
  return { texto, opcionId, adjuntoPath: adjuntoPath ?? null };
}

describe("motor: menú e inicio", () => {
  it("sin sesión muestra el menú", async () => {
    const r = await procesarTurno(null, entrada("hola"), CTX);
    expect(r.estado.paso).toBe("menu");
    expect(r.respuesta).toContain("Impresiones");
    expect(r.respuesta).toContain("Cotización");
    expect(r.respuesta).toContain("Facturación");
  });

  it("el menú NO ofrece Trámites si el flag está OFF", async () => {
    const r = await procesarTurno(null, entrada("hola"), CTX);
    expect(r.respuesta).not.toContain("4) Trámites");
  });

  it("el menú ofrece Trámites si el flag está ON", async () => {
    const r = await procesarTurno(null, entrada("hola"), {
      ...CTX,
      moduloTramitesActivo: true,
    });
    expect(r.respuesta).toContain("4) Trámites");
  });

  it("fuera de horario incluye el aviso nocturno", async () => {
    const r = await procesarTurno(null, entrada("hola"), {
      ...CTX,
      fueraDeHorario: true,
    });
    expect(r.respuesta).toContain("fuera de horario");
  });

  it("opción inválida en el menú reinmuestra el menú", async () => {
    const menu: EstadoConversacion = { paso: "menu", datos: {} };
    const r = await procesarTurno(menu, entrada("xyz"), CTX);
    expect(r.estado.paso).toBe("menu");
    expect(r.respuesta).toContain("No entendí");
  });
});

describe("motor: trámites bloqueados", () => {
  it("elegir trámites con flag OFF informa no disponible y vuelve al menú", async () => {
    const menu: EstadoConversacion = { paso: "menu", datos: {} };
    const r = await procesarTurno(menu, entrada("4"), CTX);
    expect(r.estado.paso).toBe("menu");
    expect(r.respuesta.toLowerCase()).toContain("no está disponible");
  });
});

describe("motor: flujo de impresiones (pago previo = CoDi)", () => {
  it("recorre tipo -> specs -> pago y crea ticket impresion_estandar", async () => {
    // menu -> impresiones
    let r = await procesarTurno({ paso: "menu", datos: {} }, entrada("1"), CTX);
    expect(r.estado.paso).toBe("impr_tipo");

    // tipo estándar
    r = await procesarTurno(r.estado, entrada("1"), CTX);
    expect(r.estado.paso).toBe("impr_specs");

    // specs + adjunto
    r = await procesarTurno(
      r.estado,
      entrada("10 copias a color", null, "tel/archivo.pdf"),
      CTX
    );
    expect(r.estado.paso).toBe("impr_pago");

    // pago CoDi (previo)
    r = await procesarTurno(r.estado, entrada("1"), CTX);
    expect(r.estado.paso).toBe("finalizado");
    expect(r.cerrarSesion).toBe(true);
    expect(r.accion?.tipo).toBe("crear_ticket");
    if (r.accion?.tipo === "crear_ticket") {
      expect(r.accion.tipoFlujo).toBe("impresion_estandar");
      expect(r.accion.metodoPago).toBe("codi");
      expect(r.accion.comprobantePath).toBe("tel/archivo.pdf");
      expect(r.accion.detalles.specs).toBe("10 copias a color");
    }
  });
});

describe("motor: flujo de impresiones express (pago en caja)", () => {
  it("express + efectivo crea ticket impresion_express", async () => {
    let r = await procesarTurno({ paso: "menu", datos: {} }, entrada("1"), CTX);
    r = await procesarTurno(r.estado, entrada("ya estoy aquí"), CTX);
    expect(r.estado.datos.flujo).toBe("impresion_express");
    r = await procesarTurno(r.estado, entrada("1 copia BN"), CTX);
    r = await procesarTurno(r.estado, entrada("3"), CTX); // efectivo en caja
    expect(r.accion?.tipo).toBe("crear_ticket");
    if (r.accion?.tipo === "crear_ticket") {
      expect(r.accion.tipoFlujo).toBe("impresion_express");
      expect(r.accion.metodoPago).toBe("efectivo_caja");
    }
  });
});

describe("motor: flujo de cotización", () => {
  it("producto + marca reconocida crea ticket con precio", async () => {
    let r = await procesarTurno({ paso: "menu", datos: {} }, entrada("2"), CTX);
    expect(r.estado.paso).toBe("cotiz_producto");
    r = await procesarTurno(r.estado, entrada("engargolado"), CTX);
    expect(r.estado.paso).toBe("cotiz_marca");
    r = await procesarTurno(r.estado, entrada("2"), CTX); // reconocida
    expect(r.accion?.tipo).toBe("crear_ticket");
    if (r.accion?.tipo === "crear_ticket") {
      expect(r.accion.tipoFlujo).toBe("cotizacion");
      expect(r.accion.detalles.marca).toBe("reconocida");
      expect(typeof r.accion.detalles.precioUnitario).toBe("number");
    }
  });
});

describe("motor: flujo de facturación", () => {
  it("por RFC crea ticket de facturación", async () => {
    let r = await procesarTurno({ paso: "menu", datos: {} }, entrada("3"), CTX);
    expect(r.estado.paso).toBe("fact_metodo_busqueda");
    r = await procesarTurno(r.estado, entrada("2"), CTX); // por RFC
    expect(r.estado.paso).toBe("fact_valor");
    r = await procesarTurno(r.estado, entrada("XAXX010101000"), CTX);
    expect(r.accion?.tipo).toBe("crear_ticket");
    if (r.accion?.tipo === "crear_ticket") {
      expect(r.accion.tipoFlujo).toBe("facturacion");
      expect(r.accion.detalles.rfc).toBe("XAXX010101000");
    }
  });

  it("No. Cliente inexistente (empieza con 0) pide reingresar", async () => {
    let r = await procesarTurno({ paso: "menu", datos: {} }, entrada("3"), CTX);
    r = await procesarTurno(r.estado, entrada("1"), CTX); // por No. Cliente
    r = await procesarTurno(r.estado, entrada("0999"), CTX); // no encontrado
    expect(r.estado.paso).toBe("fact_valor");
    expect(r.accion).toBeUndefined();
    expect(r.respuesta.toLowerCase()).toContain("no encontré");
  });
});

describe("motor: reinicio", () => {
  it("'cancelar' en medio de un flujo vuelve al menú", async () => {
    const estado: EstadoConversacion = {
      paso: "impr_specs",
      datos: { flujo: "impresion_estandar" },
    };
    const r = await procesarTurno(estado, entrada("cancelar"), CTX);
    expect(r.estado.paso).toBe("menu");
  });
});
