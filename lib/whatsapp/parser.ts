// ============================================================
// Parser de payloads entrantes de WhatsApp Cloud API.
// Normaliza la estructura anidada de Meta a un MensajeNormalizado.
// Tolerante a payloads de estado/entrega (devuelve null).
//
// Nota: versión base para la Task 1. Se ampliará en la Task 5/6.
// ============================================================
import type { MensajeNormalizado, TipoMensaje } from "@/lib/types";

type AnyRecord = Record<string, unknown>;

function asRecord(value: unknown): AnyRecord | undefined {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as AnyRecord)
    : undefined;
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function asString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

/**
 * Extrae el primer mensaje entrante de un payload de WhatsApp.
 * Devuelve null si el payload no contiene un mensaje de usuario
 * (p.ej. notificaciones de estado: sent/delivered/read).
 */
export function parseWhatsAppPayload(
  payload: unknown
): MensajeNormalizado | null {
  try {
    const entry = asRecord(asArray(asRecord(payload)?.entry)[0]);
    const change = asRecord(asArray(entry?.changes)[0]);
    const value = asRecord(change?.value);

    if (!value) return null;

    // Notificaciones de estado (no son mensajes de usuario)
    if (value.statuses && !value.messages) return null;

    const message = asRecord(asArray(value.messages)[0]);
    if (!message) return null;

    const contact = asRecord(asArray(value.contacts)[0]);
    const telefono =
      asString(message.from) ?? asString(contact?.wa_id) ?? "";
    const nombreWhatsapp =
      asString(asRecord(contact?.profile)?.name) ?? "Cliente";

    let tipoMensaje: TipoMensaje = "otro";
    let texto: string | null = null;
    let mediaId: string | null = null;
    let interactiveId: string | null = null;

    const tipo = asString(message.type);

    switch (tipo) {
      case "text":
        tipoMensaje = "texto";
        texto = asString(asRecord(message.text)?.body);
        break;
      case "interactive": {
        tipoMensaje = "interactivo";
        const interactive = asRecord(message.interactive);
        const buttonReply = asRecord(interactive?.button_reply);
        const listReply = asRecord(interactive?.list_reply);
        interactiveId =
          asString(buttonReply?.id) ?? asString(listReply?.id);
        texto =
          asString(buttonReply?.title) ?? asString(listReply?.title);
        break;
      }
      case "image":
      case "document":
      case "audio":
      case "video":
      case "sticker": {
        tipoMensaje = "multimedia";
        const media = asRecord(message[tipo]);
        mediaId = asString(media?.id);
        texto = asString(media?.caption);
        break;
      }
      default:
        tipoMensaje = "otro";
    }

    if (!telefono) return null;

    return {
      telefono,
      nombreWhatsapp,
      tipoMensaje,
      texto,
      mediaId,
      interactiveId,
      messageId: asString(message.id),
      raw: message,
    };
  } catch {
    return null;
  }
}
