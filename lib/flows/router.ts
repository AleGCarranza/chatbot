// ============================================================
// Router del bot: menú principal y enrutado a cada módulo.
// Lógica pura (sin BD). Respeta:
//  - modulo_tramites_activo: si está OFF, el flujo de trámites se
//    informa como no disponible.
//  - fuera de horario: avisa que la solicitud se atenderá a la apertura
//    (pero igualmente captura; el ticket se marcará es_nocturno).
// ============================================================
import type {
  ContextoBot,
  EntradaBot,
  EstadoConversacion,
  SalidaBot,
} from "./tipos";

/** Normaliza texto para comparar opciones (minúsculas, sin acentos). */
export function normalizar(texto: string | null | undefined): string {
  return (texto ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

/** Opciones del menú principal. */
export const OPCION_IMPRESIONES = "impresiones";
export const OPCION_COTIZACION = "cotizacion";
export const OPCION_FACTURACION = "facturacion";
export const OPCION_TRAMITES = "tramites";

/** Texto del menú principal (incluye trámites solo si está activo). */
export function textoMenu(ctx: ContextoBot): string {
  const base =
    "¡Hola! Bienvenido a Comercializadora Chiquihuite. ¿En qué te ayudamos?\n" +
    "1) Impresiones\n" +
    "2) Cotización\n" +
    "3) Facturación";
  const conTramites = ctx.moduloTramitesActivo ? `${base}\n4) Trámites` : base;
  const aviso = ctx.fueraDeHorario
    ? "\n\n⏰ Estamos fuera de horario (8pm-8am). Toma tu solicitud y la atenderemos a la apertura (8:00 am)."
    : "";
  return `${conTramites}\nResponde con el número o el nombre de la opción.${aviso}`;
}

/** Interpreta la selección del menú a una opción canónica. */
export function interpretarOpcionMenu(
  entrada: EntradaBot
): string | null {
  const id = normalizar(entrada.opcionId);
  if (id) {
    if (id.includes("impres")) return OPCION_IMPRESIONES;
    if (id.includes("cotiz")) return OPCION_COTIZACION;
    if (id.includes("factur")) return OPCION_FACTURACION;
    if (id.includes("tramite")) return OPCION_TRAMITES;
  }

  const t = normalizar(entrada.texto);
  if (t === "1" || t.includes("impres")) return OPCION_IMPRESIONES;
  if (t === "2" || t.includes("cotiz")) return OPCION_COTIZACION;
  if (t === "3" || t.includes("factur")) return OPCION_FACTURACION;
  if (t === "4" || t.includes("tramite")) return OPCION_TRAMITES;
  return null;
}

/** Estado inicial del menú. */
export function estadoMenu(): EstadoConversacion {
  return { paso: "menu", datos: {} };
}

/** Muestra el menú principal (inicio de conversación o reinicio). */
export function mostrarMenu(ctx: ContextoBot): SalidaBot {
  return {
    respuesta: textoMenu(ctx),
    estado: estadoMenu(),
  };
}

/** Respuesta cuando el usuario elige una opción inválida en el menú. */
export function opcionInvalida(ctx: ContextoBot): SalidaBot {
  return {
    respuesta: `No entendí la opción.\n\n${textoMenu(ctx)}`,
    estado: estadoMenu(),
  };
}

/** Respuesta cuando el módulo de trámites está desactivado. */
export function tramitesNoDisponible(ctx: ContextoBot): SalidaBot {
  return {
    respuesta:
      "El módulo de Trámites (CURP/CFE/Actas) no está disponible por ahora. " +
      "Te dejo el menú de nuevo:\n\n" +
      textoMenu(ctx),
    estado: estadoMenu(),
  };
}
