// ============================================================
// Webhook de WhatsApp Cloud API
//   GET  -> verificación del webhook (hub.challenge)
//   POST -> ingestión de mensajes entrantes
//
// Diseñado para pruebas locales: acepta payloads JSON simulados
// (cURL/Postman) con la misma estructura que WhatsApp Cloud API.
// Siempre responde 200 en POST para evitar reintentos del proveedor.
// ============================================================
import { NextRequest, NextResponse } from "next/server";
import { parseWhatsAppPayload } from "@/lib/whatsapp/parser";
import { resolverCliente } from "@/lib/clientes";
import { leerFlags } from "@/lib/config/flags";
import { guardarAdjunto } from "@/lib/whatsapp/media";
import { enviarMensajeTexto } from "@/lib/whatsapp/sender";
import { estaFueraDeHorario, overrideDesdeFlag, horaDe } from "@/lib/rules/horario";
import { procesarTurno } from "@/lib/flows/motor";
import {
  cargarSesion,
  guardarSesion,
  cerrarSesion,
  crearTicketDesdeAccion,
} from "@/lib/flows/persistencia";

// El webhook necesita runtime Node (no edge) para usar la service role key.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET: verificación del webhook por parte de Meta.
 * Meta envía hub.mode=subscribe, hub.verify_token y hub.challenge.
 * Respondemos el challenge en texto plano si el token coincide.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  const expectedToken = process.env.WHATSAPP_VERIFY_TOKEN;

  if (mode === "subscribe" && token && token === expectedToken) {
    return new NextResponse(challenge ?? "", {
      status: 200,
      headers: { "Content-Type": "text/plain" },
    });
  }

  return new NextResponse("Forbidden", { status: 403 });
}

/**
 * POST: ingestión de mensajes entrantes.
 * - Responde 200 siempre (incluso ante payloads inválidos).
 * - Normaliza el mensaje y lo registra para depuración.
 * - El enrutamiento a flujos y la persistencia se añaden en tareas posteriores.
 */
export async function POST(request: NextRequest) {
  let payload: unknown = null;

  try {
    payload = await request.json();
  } catch {
    // Payload no JSON / vacío: respondemos 200 para no provocar reintentos.
    console.warn("[webhook] POST con cuerpo no JSON o vacío.");
    return NextResponse.json({ received: true }, { status: 200 });
  }

  try {
    const mensaje = parseWhatsAppPayload(payload);

    if (!mensaje) {
      // Notificación de estado o payload sin mensaje de usuario.
      console.info("[webhook] Payload sin mensaje de usuario (ignorado).");
      return NextResponse.json({ received: true }, { status: 200 });
    }

    // 1) Resolver (o crear) el cliente por teléfono.
    const cliente = await resolverCliente(
      mensaje.telefono,
      mensaje.nombreWhatsapp
    );

    // 2) Leer flags y determinar si estamos fuera de horario.
    const flags = await leerFlags();
    const fueraDeHorario = estaFueraDeHorario({
      hora: horaDe(new Date()),
      override: overrideDesdeFlag(flags.fueraDeHorarioActivo),
    });

    // 3) Si el mensaje trae un adjunto, descargarlo (mock) y guardarlo
    //    en el bucket. Guardamos la ruta para asociarla luego al ticket.
    let adjuntoPath: string | null = null;
    if (mensaje.tipoMensaje === "multimedia" && mensaje.mediaId) {
      try {
        const guardado = await guardarAdjunto(mensaje.mediaId, mensaje.telefono);
        adjuntoPath = guardado.path;
      } catch (e) {
        console.error("[webhook] Error guardando adjunto:", e);
      }
    }

    // 4) Procesar el turno con la máquina de estados conversacional.
    const estadoPrevio = await cargarSesion(cliente.id);
    const salida = await procesarTurno(
      estadoPrevio,
      {
        texto: mensaje.texto,
        opcionId: mensaje.interactiveId,
        adjuntoPath,
      },
      {
        moduloTramitesActivo: flags.moduloTramitesActivo,
        fueraDeHorario,
      }
    );

    // 5) Si el motor emitió una acción de crear ticket, materializarla.
    let folio: number | null = null;
    if (salida.accion?.tipo === "crear_ticket") {
      const creado = await crearTicketDesdeAccion(
        cliente.id,
        salida.accion,
        fueraDeHorario
      );
      folio = creado?.folio ?? null;
    }

    // 6) Persistir o cerrar la sesión según el resultado.
    if (salida.cerrarSesion) {
      await cerrarSesion(cliente.id);
    } else {
      await guardarSesion(cliente.id, salida.estado);
    }

    // 7) Responder al cliente (mock en local).
    const respuestaFinal =
      folio !== null
        ? `${salida.respuesta}\n\nTu folio es #${folio}.`
        : salida.respuesta;
    await enviarMensajeTexto(cliente.telefono, respuestaFinal);

    console.info("[webhook] Turno procesado:", {
      clienteId: cliente.id,
      paso: salida.estado.paso,
      creoTicket: folio !== null,
      folio,
      fueraDeHorario,
    });

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error) {
    // Nunca propagamos errores a WhatsApp: registramos y devolvemos 200.
    console.error("[webhook] Error procesando el mensaje:", error);
    return NextResponse.json({ received: true }, { status: 200 });
  }
}
