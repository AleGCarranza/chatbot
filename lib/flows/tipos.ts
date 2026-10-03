// ============================================================
// Tipos del motor conversacional del bot (máquina de estados pura).
//
// El motor es una función pura: dado el estado de la conversación y
// una entrada normalizada, devuelve una salida con el mensaje a enviar,
// el nuevo estado y, opcionalmente, una acción (crear ticket).
// La persistencia (sesión y ticket) la hace el llamador (webhook).
// ============================================================
import type { MetodoPago, TipoFlujo } from "@/lib/types";

/** Paso actual dentro de la máquina de estados conversacional. */
export type PasoConversacion =
  | "inicio" // aún sin menú mostrado
  | "menu" // esperando selección de módulo
  // --- Impresiones ---
  | "impr_tipo" // estándar o express (ya estoy aquí)
  | "impr_specs" // capturando especificaciones / adjunto
  | "impr_pago" // eligiendo método de pago
  // --- Cotización ---
  | "cotiz_producto" // qué producto
  | "cotiz_marca" // económica o reconocida
  // --- Facturación ---
  | "fact_metodo_busqueda" // por No. Cliente o RFC
  | "fact_valor" // capturando el valor (No. Cliente o RFC)
  // --- Final ---
  | "finalizado"; // ticket creado; conversación cerrada

/** Datos acumulados durante la conversación (van a sesion.datos_json). */
export interface DatosConversacion {
  flujo?: TipoFlujo;
  // Impresiones
  express?: boolean;
  specs?: string;
  adjuntoPath?: string | null;
  metodoPago?: MetodoPago;
  // Cotización
  producto?: string;
  marca?: "economica" | "reconocida";
  // Facturación
  metodoBusqueda?: "numero_cliente" | "rfc";
  valorBusqueda?: string;
}

/** Estado de la conversación que recibe el motor. */
export interface EstadoConversacion {
  paso: PasoConversacion;
  datos: DatosConversacion;
}

/** Flags/condiciones de contexto que afectan el enrutado. */
export interface ContextoBot {
  moduloTramitesActivo: boolean;
  fueraDeHorario: boolean;
}

/** Entrada normalizada al motor (desde el mensaje de WhatsApp). */
export interface EntradaBot {
  /** Texto del mensaje (o título de la opción interactiva). */
  texto: string | null;
  /** ID de la opción interactiva (botón/lista), si aplica. */
  opcionId: string | null;
  /** ¿El mensaje trae un adjunto ya guardado en el bucket? */
  adjuntoPath?: string | null;
}

/**
 * Acción de crear ticket que el motor emite cuando la conversación
 * reúne los datos suficientes. El llamador la materializa en la BD.
 */
export interface AccionCrearTicket {
  tipo: "crear_ticket";
  tipoFlujo: TipoFlujo;
  metodoPago?: MetodoPago;
  comprobantePath?: string | null;
  detalles: Record<string, unknown>;
}

export type AccionBot = AccionCrearTicket;

/** Salida del motor: qué responder, nuevo estado y acción opcional. */
export interface SalidaBot {
  /** Mensaje de texto a enviar al cliente. */
  respuesta: string;
  /** Nuevo estado de la conversación a persistir. */
  estado: EstadoConversacion;
  /** Acción a materializar (crear ticket), si la hay. */
  accion?: AccionBot;
  /** Si true, el llamador debe cerrar/eliminar la sesión. */
  cerrarSesion?: boolean;
}
