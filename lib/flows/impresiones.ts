// ============================================================
// Flujo de Impresiones (lógica pura).
// Pasos: impr_tipo -> impr_specs -> impr_pago -> (crear ticket)
//  - Estándar vs Express ("Ya estoy aquí" / QR).
//  - Captura de especificaciones y adjunto (archivo a imprimir).
//  - Método de pago -> filtro anti-merma (estado inicial del ticket).
// Emite AccionCrearTicket al completar.
// ============================================================
import type { MetodoPago } from "@/lib/types";
import type { EntradaBot, EstadoConversacion, SalidaBot } from "./tipos";
import { normalizar } from "./router";

/** Inicia el flujo de impresiones: pregunta estándar o express. */
export function iniciarImpresiones(): SalidaBot {
  return {
    respuesta:
      "Impresiones 🖨️. ¿Cómo quieres tu servicio?\n" +
      "1) Estándar (envías tu archivo por aquí)\n" +
      "2) Ya estoy aquí (Express en tienda)",
    estado: { paso: "impr_tipo", datos: { flujo: "impresion_estandar" } },
  };
}

/** Paso impr_tipo: interpreta estándar/express y pide especificaciones. */
export function pasoTipoImpresion(
  estado: EstadoConversacion,
  entrada: EntradaBot
): SalidaBot {
  const t = normalizar(entrada.opcionId) || normalizar(entrada.texto);
  const express =
    t === "2" || t.includes("express") || t.includes("aqui") || t.includes("ya estoy");

  return {
    respuesta:
      "Perfecto. Cuéntame las especificaciones (cantidad, color/BN, tamaño) " +
      "y adjunta el archivo a imprimir si lo tienes.",
    estado: {
      paso: "impr_specs",
      datos: {
        ...estado.datos,
        flujo: express ? "impresion_express" : "impresion_estandar",
        express,
      },
    },
  };
}

/** Paso impr_specs: guarda specs + adjunto y pasa a método de pago. */
export function pasoSpecsImpresion(
  estado: EstadoConversacion,
  entrada: EntradaBot
): SalidaBot {
  const specs = (entrada.texto ?? "").trim();
  const adjuntoPath = entrada.adjuntoPath ?? estado.datos.adjuntoPath ?? null;

  return {
    respuesta:
      "Gracias. ¿Cómo vas a pagar?\n" +
      "1) CoDi\n" +
      "2) Transferencia\n" +
      "3) Efectivo en caja\n" +
      "4) Tarjeta en caja",
    estado: {
      paso: "impr_pago",
      datos: {
        ...estado.datos,
        specs: specs || estado.datos.specs,
        adjuntoPath,
      },
    },
  };
}

/** Interpreta la selección de método de pago. */
export function interpretarMetodoPago(
  entrada: EntradaBot
): MetodoPago | null {
  const t = normalizar(entrada.opcionId) || normalizar(entrada.texto);
  if (t === "1" || t.includes("codi")) return "codi";
  if (t === "2" || t.includes("transfer")) return "transferencia";
  if (t === "3" || t.includes("efectivo")) return "efectivo_caja";
  if (t === "4" || t.includes("tarjeta")) return "tarjeta_caja";
  return null;
}

/**
 * Paso impr_pago: con el método de pago, emite la acción de crear ticket.
 * El estado inicial del ticket (anti-merma) lo decide el llamador con
 * estadoInicialPorPago; aquí solo entregamos el método y los detalles.
 */
export function pasoPagoImpresion(
  estado: EstadoConversacion,
  entrada: EntradaBot
): SalidaBot {
  const metodo = interpretarMetodoPago(entrada);
  if (!metodo) {
    return {
      respuesta:
        "No reconocí el método de pago. Elige:\n" +
        "1) CoDi  2) Transferencia  3) Efectivo en caja  4) Tarjeta en caja",
      estado,
    };
  }

  const datos = { ...estado.datos, metodoPago: metodo };
  const esPrevio = metodo === "codi" || metodo === "transferencia";

  const respuesta = esPrevio
    ? "Listo ✅. Registramos tu impresión. Un empleado revisará tu trabajo y " +
      "te confirmará el total a pagar por este medio. En cuanto lo recibas, " +
      "envía tu comprobante de pago (CoDi/transferencia) para procesar la impresión."
    : "Listo ✅. Registramos tu impresión. El pago se realiza en caja: " +
      "tu trabajo se imprimirá cuando estés presente en el mostrador.";

  return {
    respuesta,
    estado: { paso: "finalizado", datos },
    accion: {
      tipo: "crear_ticket",
      tipoFlujo: datos.flujo === "impresion_express"
        ? "impresion_express"
        : "impresion_estandar",
      metodoPago: metodo,
      comprobantePath: datos.adjuntoPath ?? null,
      detalles: {
        specs: datos.specs ?? "",
        express: datos.express ?? false,
      },
    },
    cerrarSesion: true,
  };
}
