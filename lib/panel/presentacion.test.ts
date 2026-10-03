import { describe, it, expect } from "vitest";
import { agruparTickets, estaTomado } from "./presentacion";
import type { TicketAtencion } from "@/lib/types";

function ticket(parcial: Partial<TicketAtencion>): TicketAtencion {
  return {
    id: parcial.id ?? crypto.randomUUID(),
    folio: parcial.folio ?? 1,
    cliente_id: "c1",
    tipo_flujo: parcial.tipo_flujo ?? "impresion_estandar",
    estado: parcial.estado ?? "en_proceso",
    metodo_pago: parcial.metodo_pago ?? "codi",
    pago_confirmado: parcial.pago_confirmado ?? false,
    comprobante_url: parcial.comprobante_url ?? null,
    detalles_json: {},
    atendido_por_terminal: parcial.atendido_por_terminal ?? null,
    atendido_por_usuario: parcial.atendido_por_usuario ?? null,
    es_nocturno: parcial.es_nocturno ?? false,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  };
}

describe("panel: agruparTickets", () => {
  it("clasifica cada estado en su grupo", () => {
    const tickets: TicketAtencion[] = [
      ticket({ estado: "pendiente_presencial" }),
      ticket({ estado: "pendiente_validacion_pago" }),
      ticket({ estado: "fuera_horario_incompleto" }),
      ticket({ estado: "pagado_imprimir", es_nocturno: true }),
      ticket({ estado: "en_proceso" }),
      ticket({ estado: "completado" }),
      ticket({ estado: "cancelado" }),
    ];

    const g = agruparTickets(tickets);
    expect(g.pausados).toHaveLength(1);
    expect(g.validacionPago).toHaveLength(1);
    expect(g.incompletos).toHaveLength(1);
    expect(g.pagadosNocturnos).toHaveLength(1);
    expect(g.activos).toHaveLength(1);
    expect(g.cerrados).toHaveLength(2);
  });

  it("pagado_imprimir no nocturno va a activos", () => {
    const g = agruparTickets([
      ticket({ estado: "pagado_imprimir", es_nocturno: false }),
    ]);
    expect(g.activos).toHaveLength(1);
    expect(g.pagadosNocturnos).toHaveLength(0);
  });
});

describe("panel: estaTomado", () => {
  it("true si tiene terminal asignada", () => {
    expect(estaTomado(ticket({ atendido_por_terminal: "T1" }))).toBe(true);
    expect(estaTomado(ticket({ atendido_por_terminal: null }))).toBe(false);
  });
});
