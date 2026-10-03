// ============================================================
// Helpers de presentación del panel (lógica pura).
// Etiquetas/colores por estado y agrupación de tickets para el
// manejo nocturno y la vista del mostrador.
// ============================================================
import type { EstadoTicket, TicketAtencion, TipoFlujo } from "@/lib/types";

/** Etiqueta legible de cada estado. */
export function etiquetaEstado(estado: EstadoTicket): string {
  switch (estado) {
    case "pendiente_presencial":
      return "Pausado (pago en caja)";
    case "pendiente_validacion_pago":
      return "Validar comprobante";
    case "pagado_imprimir":
      return "Pagado · listo para imprimir";
    case "en_proceso":
      return "En proceso";
    case "completado":
      return "Completado";
    case "cancelado":
      return "Cancelado";
    case "fuera_horario_incompleto":
      return "Incompleto (nocturno)";
  }
}

/** Clases Tailwind para el badge de cada estado. */
export function colorEstado(estado: EstadoTicket): string {
  switch (estado) {
    case "pagado_imprimir":
      return "bg-green-100 text-green-800";
    case "pendiente_presencial":
      return "bg-yellow-100 text-yellow-800";
    case "pendiente_validacion_pago":
      return "bg-orange-100 text-orange-800";
    case "en_proceso":
      return "bg-blue-100 text-blue-800";
    case "completado":
      return "bg-gray-200 text-gray-700";
    case "cancelado":
      return "bg-red-100 text-red-700";
    case "fuera_horario_incompleto":
      return "bg-amber-100 text-amber-800";
  }
}

/** Etiqueta legible del tipo de flujo. */
export function etiquetaFlujo(flujo: TipoFlujo): string {
  switch (flujo) {
    case "impresion_estandar":
      return "Impresión";
    case "impresion_express":
      return "Impresión express";
    case "cotizacion":
      return "Cotización";
    case "facturacion":
      return "Facturación";
    case "tramite":
      return "Trámite";
  }
}

/** Grupos del panel para el manejo nocturno y la operación diaria. */
export interface GruposPanel {
  pagadosNocturnos: TicketAtencion[]; // 🟢 pagados durante la noche
  pausados: TicketAtencion[]; // 🟡 pago en caja (presencial)
  incompletos: TicketAtencion[]; // ⚠️ nocturnos incompletos
  validacionPago: TicketAtencion[]; // comprobantes por validar
  activos: TicketAtencion[]; // en proceso / listos de día
  cerrados: TicketAtencion[]; // completados / cancelados
}

/** Un ticket se considera "abierto" si no está completado ni cancelado. */
function estaAbierto(t: TicketAtencion): boolean {
  return t.estado !== "completado" && t.estado !== "cancelado";
}

/**
 * Agrupa los tickets para la vista del panel, con la lógica de
 * agrupación nocturna de la apertura.
 */
export function agruparTickets(tickets: TicketAtencion[]): GruposPanel {
  const grupos: GruposPanel = {
    pagadosNocturnos: [],
    pausados: [],
    incompletos: [],
    validacionPago: [],
    activos: [],
    cerrados: [],
  };

  for (const t of tickets) {
    if (!estaAbierto(t)) {
      grupos.cerrados.push(t);
      continue;
    }

    if (t.estado === "fuera_horario_incompleto") {
      grupos.incompletos.push(t);
    } else if (t.estado === "pendiente_presencial") {
      grupos.pausados.push(t);
    } else if (t.estado === "pendiente_validacion_pago") {
      grupos.validacionPago.push(t);
    } else if (t.estado === "pagado_imprimir" && t.es_nocturno) {
      grupos.pagadosNocturnos.push(t);
    } else {
      grupos.activos.push(t);
    }
  }

  return grupos;
}

/** ¿El ticket está tomado por alguna terminal? */
export function estaTomado(t: TicketAtencion): boolean {
  return !!t.atendido_por_terminal;
}
