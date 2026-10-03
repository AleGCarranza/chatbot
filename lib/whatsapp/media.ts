// ============================================================
// Descarga y almacenamiento de adjuntos de WhatsApp.
// En R1 la descarga real de la Graph API es un STUB; en local se
// usa un MOCK (WHATSAPP_MOCK=true) que genera un archivo de prueba.
// El archivo se sube al bucket privado 'adjuntos-whatsapp'.
// ============================================================
import "server-only";

import { getSupabaseAdmin } from "@/lib/supabase/admin";

const BUCKET = process.env.SUPABASE_STORAGE_BUCKET ?? "adjuntos-whatsapp";

function enModoMock(): boolean {
  // Mock si WHATSAPP_MOCK=true o si no hay token de acceso configurado.
  return (
    process.env.WHATSAPP_MOCK === "true" ||
    !process.env.WHATSAPP_ACCESS_TOKEN
  );
}

export interface MediaDescargada {
  buffer: Buffer;
  contentType: string;
  /** Extensión sugerida según el content-type. */
  extension: string;
}

/** Mapea un content-type a una extensión de archivo. */
function extensionPara(contentType: string): string {
  switch (contentType) {
    case "image/jpeg":
      return "jpg";
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    case "application/pdf":
      return "pdf";
    default:
      return "bin";
  }
}

/**
 * Descarga el adjunto identificado por `mediaId`.
 * - MOCK: devuelve un buffer de prueba (no llama a la red).
 * - REAL (R2): consultaría la Graph API para obtener la URL y el binario.
 */
export async function descargarAdjunto(
  mediaId: string,
  contentTypeSugerido = "image/jpeg"
): Promise<MediaDescargada> {
  if (enModoMock()) {
    const contenido = `MOCK-MEDIA:${mediaId}:${Date.now()}`;
    return {
      buffer: Buffer.from(contenido, "utf8"),
      contentType: contentTypeSugerido,
      extension: extensionPara(contentTypeSugerido),
    };
  }

  // --- Implementación real diferida a Release 2 ---
  // 1) GET https://graph.facebook.com/<ver>/<mediaId>  -> { url, mime_type }
  // 2) GET <url> con Authorization: Bearer <WHATSAPP_ACCESS_TOKEN> -> binario
  throw new Error(
    "Descarga real de media no implementada en R1 (usa WHATSAPP_MOCK=true)."
  );
}

/**
 * Descarga el adjunto y lo sube al bucket. Devuelve la ruta del objeto
 * dentro del bucket (no una URL pública: el bucket es privado).
 */
export async function guardarAdjunto(
  mediaId: string,
  telefono: string,
  contentTypeSugerido = "image/jpeg"
): Promise<{ path: string; contentType: string }> {
  const media = await descargarAdjunto(mediaId, contentTypeSugerido);
  const supabase = getSupabaseAdmin();

  const safeTel = telefono.replace(/[^0-9]/g, "") || "desconocido";
  const path = `${safeTel}/${mediaId}-${Date.now()}.${media.extension}`;

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, media.buffer, {
      contentType: media.contentType,
      upsert: true,
    });

  if (error) {
    throw new Error(`No se pudo subir el adjunto al bucket: ${error.message}`);
  }

  return { path, contentType: media.contentType };
}

/** Genera una URL firmada temporal para que el panel visualice el adjunto. */
export async function urlFirmadaAdjunto(
  path: string,
  expiresInSeconds = 3600
): Promise<string | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, expiresInSeconds);

  if (error || !data) return null;
  return data.signedUrl;
}
