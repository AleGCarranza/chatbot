// ============================================================
// Tipos y enums compartidos.
// Fuente única de verdad: lib/database.types.ts (generado desde la BD
// con `npm run db:types`). Aquí solo derivamos alias ergonómicos y
// tipos propios de la aplicación que no viven en la BD.
// ============================================================
import type { Tables, TablesInsert, TablesUpdate, Enums } from "@/lib/database.types";

// ---------- Enums (derivados de los tipos ENUM de Postgres) ----------
export type TipoFlujo = Enums<"tipo_flujo_enum">;
export type EstadoTicket = Enums<"estado_ticket_enum">;
export type MetodoPago = Enums<"metodo_pago_enum">;
export type RolUsuario = Enums<"rol_usuario_enum">;

// ---------- Filas de las tablas (Row) ----------
export type Cliente = Tables<"clientes">;
export type ConfiguracionSistema = Tables<"configuracion_sistema">;
export type TicketAtencion = Tables<"tickets_atencion">;
export type Perfil = Tables<"perfiles">;

// ---------- Insert / Update útiles para escrituras tipadas ----------
export type ClienteInsert = TablesInsert<"clientes">;
export type ClienteUpdate = TablesUpdate<"clientes">;
export type TicketInsert = TablesInsert<"tickets_atencion">;
export type TicketUpdate = TablesUpdate<"tickets_atencion">;

// ---------- Claves de configuración conocidas (feature flags) ----------
export const FLAG_MODULO_TRAMITES = "modulo_tramites_activo";
export const FLAG_FUERA_DE_HORARIO = "fuera_de_horario_activo";

// ---------- Mensaje normalizado del parser de WhatsApp ----------
// Tipo propio de la app (no vive en la BD).
export type TipoMensaje = "texto" | "interactivo" | "multimedia" | "otro";

export interface MensajeNormalizado {
  telefono: string;
  nombreWhatsapp: string;
  tipoMensaje: TipoMensaje;
  texto: string | null;
  mediaId: string | null;
  interactiveId: string | null;
  messageId: string | null;
  raw: unknown;
}
