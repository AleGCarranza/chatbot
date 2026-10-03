// ============================================================
// Motor conversacional: despacha la entrada según el paso actual.
// Función pura (salvo las consultas mock a Sicar en cotización/
// facturación, que son async). No toca la BD: devuelve SalidaBot y
// el llamador (webhook) persiste sesión y materializa el ticket.
// ============================================================
import type {
  ContextoBot,
  EntradaBot,
  EstadoConversacion,
  SalidaBot,
} from "./tipos";
import {
  interpretarOpcionMenu,
  mostrarMenu,
  opcionInvalida,
  tramitesNoDisponible,
  OPCION_IMPRESIONES,
  OPCION_COTIZACION,
  OPCION_FACTURACION,
  OPCION_TRAMITES,
} from "./router";
import {
  iniciarImpresiones,
  pasoTipoImpresion,
  pasoSpecsImpresion,
  pasoPagoImpresion,
} from "./impresiones";
import {
  iniciarCotizacion,
  pasoProductoCotizacion,
  pasoMarcaCotizacion,
} from "./cotizaciones";
import {
  iniciarFacturacion,
  pasoMetodoBusquedaFacturacion,
  pasoValorFacturacion,
} from "./facturacion";

/** Palabras que reinician la conversación al menú. */
const REINICIAR = ["menu", "menú", "hola", "inicio", "reiniciar", "cancelar"];

function pideReinicio(entrada: EntradaBot): boolean {
  const t = (entrada.texto ?? "").trim().toLowerCase();
  return REINICIAR.includes(t);
}

/** Despacha la selección del menú al flujo correspondiente. */
function despacharMenu(entrada: EntradaBot, ctx: ContextoBot): SalidaBot {
  const opcion = interpretarOpcionMenu(entrada);
  switch (opcion) {
    case OPCION_IMPRESIONES:
      return iniciarImpresiones();
    case OPCION_COTIZACION:
      return iniciarCotizacion();
    case OPCION_FACTURACION:
      return iniciarFacturacion();
    case OPCION_TRAMITES:
      // Trámites: bloqueado si el flag está OFF.
      return ctx.moduloTramitesActivo
        ? {
            respuesta:
              "El módulo de Trámites estará disponible pronto. " +
              "Por ahora elige otra opción.",
            estado: { paso: "menu", datos: {} },
          }
        : tramitesNoDisponible(ctx);
    default:
      return opcionInvalida(ctx);
  }
}

/**
 * Procesa un turno de la conversación.
 * @param estado Estado actual (o null si no hay sesión -> inicio).
 * @param entrada Entrada normalizada del usuario.
 * @param ctx Flags/condiciones de contexto.
 */
export async function procesarTurno(
  estado: EstadoConversacion | null,
  entrada: EntradaBot,
  ctx: ContextoBot
): Promise<SalidaBot> {
  // Sin sesión o reinicio explícito -> menú.
  if (!estado || estado.paso === "inicio" || pideReinicio(entrada)) {
    return mostrarMenu(ctx);
  }

  switch (estado.paso) {
    case "menu":
      return despacharMenu(entrada, ctx);

    // --- Impresiones ---
    case "impr_tipo":
      return pasoTipoImpresion(estado, entrada);
    case "impr_specs":
      return pasoSpecsImpresion(estado, entrada);
    case "impr_pago":
      return pasoPagoImpresion(estado, entrada);

    // --- Cotización ---
    case "cotiz_producto":
      return pasoProductoCotizacion(estado, entrada);
    case "cotiz_marca":
      return pasoMarcaCotizacion(estado, entrada);

    // --- Facturación ---
    case "fact_metodo_busqueda":
      return pasoMetodoBusquedaFacturacion(estado, entrada);
    case "fact_valor":
      return pasoValorFacturacion(estado, entrada);

    // --- Final / desconocido -> menú ---
    case "finalizado":
    default:
      return mostrarMenu(ctx);
  }
}
