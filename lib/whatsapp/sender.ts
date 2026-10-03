// ============================================================
// Envío de mensajes a WhatsApp.
// En R1 el envío real por Graph API es un STUB; en local (WHATSAPP_MOCK
// =true o sin token) solo se registra en consola para depuración.
// ============================================================
import "server-only";

function enModoMock(): boolean {
  return (
    process.env.WHATSAPP_MOCK === "true" || !process.env.WHATSAPP_ACCESS_TOKEN
  );
}

/**
 * Envía un mensaje de texto al cliente.
 * - MOCK: registra en consola (no llama a la red).
 * - REAL (R2): POST a la Graph API con el token de acceso.
 */
export async function enviarMensajeTexto(
  telefono: string,
  texto: string
): Promise<void> {
  if (enModoMock()) {
    console.info(`[sender:mock] -> ${telefono}: ${texto}`);
    return;
  }

  // --- Implementación real diferida a Release 2 ---
  // POST https://graph.facebook.com/<ver>/<PHONE_NUMBER_ID>/messages
  // body: { messaging_product: "whatsapp", to, type: "text", text: { body } }
  throw new Error(
    "Envío real de mensajes no implementado en R1 (usa WHATSAPP_MOCK=true)."
  );
}
