// ============================================================
// Flujo de Facturación (lógica pura salvo la búsqueda mock en Sicar).
// Pasos: fact_metodo_busqueda -> fact_valor -> (buscar + crear ticket)
//  - Elegir buscar por No. Cliente Sicar o por RFC.
//  - Capturar el valor y buscar el cliente fiscal (mock Sicar).
//  - Crear el ticket de facturación con los datos encontrados.
// ============================================================
import type { EntradaBot, EstadoConversacion, SalidaBot } from "./tipos";
import { normalizar } from "./router";
import { buscarClienteFiscalSicar } from "@/mocks/sicar";

/** Inicia el flujo de facturación: elegir método de búsqueda. */
export function iniciarFacturacion(): SalidaBot {
  return {
    respuesta:
      "Facturación 📄. ¿Cómo buscamos tus datos?\n" +
      "1) Por Número de Cliente Sicar\n" +
      "2) Por RFC",
    estado: { paso: "fact_metodo_busqueda", datos: { flujo: "facturacion" } },
  };
}

/** Interpreta el método de búsqueda elegido. */
export function interpretarMetodoBusqueda(
  entrada: EntradaBot
): "numero_cliente" | "rfc" | null {
  const t = normalizar(entrada.opcionId) || normalizar(entrada.texto);
  if (t === "1" || t.includes("numero") || t.includes("cliente")) {
    return "numero_cliente";
  }
  if (t === "2" || t.includes("rfc")) return "rfc";
  return null;
}

/** Paso fact_metodo_busqueda: guarda el método y pide el valor. */
export function pasoMetodoBusquedaFacturacion(
  estado: EstadoConversacion,
  entrada: EntradaBot
): SalidaBot {
  const metodo = interpretarMetodoBusqueda(entrada);
  if (!metodo) {
    return {
      respuesta:
        "Elige una opción:\n1) Por Número de Cliente Sicar\n2) Por RFC",
      estado,
    };
  }

  const pregunta =
    metodo === "numero_cliente"
      ? "Escribe tu Número de Cliente Sicar."
      : "Escribe tu RFC.";

  return {
    respuesta: pregunta,
    estado: {
      paso: "fact_valor",
      datos: { ...estado.datos, metodoBusqueda: metodo },
    },
  };
}

/**
 * Paso fact_valor: busca el cliente fiscal (mock Sicar) y crea el ticket.
 * Async porque consulta Sicar. Si no encuentra, pide reingresar el valor.
 */
export async function pasoValorFacturacion(
  estado: EstadoConversacion,
  entrada: EntradaBot
): Promise<SalidaBot> {
  const valor = (entrada.texto ?? "").trim();
  const metodo = estado.datos.metodoBusqueda ?? "numero_cliente";

  if (!valor) {
    return {
      respuesta:
        metodo === "numero_cliente"
          ? "Escribe tu Número de Cliente Sicar."
          : "Escribe tu RFC.",
      estado,
    };
  }

  const fiscal = await buscarClienteFiscalSicar(
    metodo === "numero_cliente" ? { numeroCliente: valor } : { rfc: valor }
  );

  if (!fiscal) {
    return {
      respuesta:
        "No encontré datos con ese valor. Verifícalo e inténtalo de nuevo, " +
        "o escribe otro.",
      estado,
    };
  }

  const datos = { ...estado.datos, valorBusqueda: valor };

  return {
    respuesta:
      `Encontramos: ${fiscal.razonSocial} (RFC ${fiscal.rfc}). ` +
      "Registramos tu solicitud de factura; un empleado la generará.",
    estado: { paso: "finalizado", datos },
    accion: {
      tipo: "crear_ticket",
      tipoFlujo: "facturacion",
      detalles: {
        metodoBusqueda: metodo,
        numeroClienteSicar: fiscal.numeroCliente,
        rfc: fiscal.rfc,
        razonSocial: fiscal.razonSocial,
      },
    },
    cerrarSesion: true,
  };
}
