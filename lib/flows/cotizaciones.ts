// ============================================================
// Flujo de Cotización (lógica pura salvo la consulta mock a Sicar).
// Pasos: cotiz_producto -> cotiz_marca -> (consulta Sicar + crear ticket)
//  - Pregunta el producto.
//  - Pregunta marca Económica o Reconocida.
//  - Consulta precio (mock Sicar) y crea el ticket de cotización.
// ============================================================
import type { EntradaBot, EstadoConversacion, SalidaBot } from "./tipos";
import { normalizar } from "./router";
import { consultarPrecioSicar, type TipoMarca } from "@/mocks/sicar";

/** Inicia el flujo de cotización: pregunta el producto. */
export function iniciarCotizacion(): SalidaBot {
  return {
    respuesta:
      "Cotización 🧾. ¿Qué producto quieres cotizar? " +
      "(ej. hojas, tóner, engargolado)",
    estado: { paso: "cotiz_producto", datos: { flujo: "cotizacion" } },
  };
}

/** Paso cotiz_producto: guarda el producto y pregunta la marca. */
export function pasoProductoCotizacion(
  estado: EstadoConversacion,
  entrada: EntradaBot
): SalidaBot {
  const producto = (entrada.texto ?? "").trim();
  if (!producto) {
    return {
      respuesta: "¿Qué producto quieres cotizar?",
      estado,
    };
  }

  return {
    respuesta:
      `Para "${producto}", ¿qué marca prefieres?\n` +
      "1) Económica\n" +
      "2) Reconocida",
    estado: {
      paso: "cotiz_marca",
      datos: { ...estado.datos, producto },
    },
  };
}

/** Interpreta la selección de marca. */
export function interpretarMarca(
  entrada: EntradaBot
): TipoMarca | null {
  const t = normalizar(entrada.opcionId) || normalizar(entrada.texto);
  if (t === "1" || t.includes("econom")) return "economica";
  if (t === "2" || t.includes("reconoc")) return "reconocida";
  return null;
}

/**
 * Paso cotiz_marca: consulta precio (mock Sicar) y emite crear ticket.
 * Async porque consulta Sicar.
 */
export async function pasoMarcaCotizacion(
  estado: EstadoConversacion,
  entrada: EntradaBot
): Promise<SalidaBot> {
  const marca = interpretarMarca(entrada);
  if (!marca) {
    return {
      respuesta: "Elige una marca:\n1) Económica\n2) Reconocida",
      estado,
    };
  }

  const producto = estado.datos.producto ?? "producto";
  const precio = await consultarPrecioSicar(producto, marca);
  const datos = { ...estado.datos, marca };

  return {
    respuesta:
      `Cotización de "${producto}" (marca ${marca}): ` +
      `$${precio.precioUnitario.toFixed(2)} ${precio.moneda} por unidad. ` +
      "Registramos tu cotización; un empleado te dará seguimiento.",
    estado: { paso: "finalizado", datos },
    accion: {
      tipo: "crear_ticket",
      tipoFlujo: "cotizacion",
      detalles: {
        producto,
        marca,
        precioUnitario: precio.precioUnitario,
        moneda: precio.moneda,
      },
    },
    cerrarSesion: true,
  };
}
