// ============================================================
// Demo de conversación del bot (sin BD ni red).
// Recorre los flujos usando el motor puro procesarTurno e imprime
// el diálogo cliente <-> bot turno por turno.
//
// Uso: npm run demo:bot
// ============================================================
import { procesarTurno } from "@/lib/flows/motor";
import type {
  ContextoBot,
  EstadoConversacion,
} from "@/lib/flows/tipos";

const RESET = "\x1b[0m";
const CYAN = "\x1b[36m";
const GREEN = "\x1b[32m";
const GRAY = "\x1b[90m";
const BOLD = "\x1b[1m";

async function conversacion(
  titulo: string,
  mensajes: string[],
  ctx: ContextoBot
) {
  console.log(`\n${BOLD}=== ${titulo} ===${RESET}`);
  let estado: EstadoConversacion | null = null;

  for (const texto of mensajes) {
    console.log(`${CYAN}Cliente:${RESET} ${texto}`);
    const salida = await procesarTurno(
      estado,
      { texto, opcionId: null, adjuntoPath: null },
      ctx
    );
    // Indentamos la respuesta del bot para legibilidad.
    const resp = salida.respuesta.split("\n").join(`\n${GRAY}        ${RESET}`);
    console.log(`${GREEN}Bot:${RESET}    ${resp}`);

    if (salida.accion?.tipo === "crear_ticket") {
      console.log(
        `${GRAY}        [ACCION] crear ticket: ${salida.accion.tipoFlujo}` +
          (salida.accion.metodoPago ? ` · pago ${salida.accion.metodoPago}` : "") +
          `${RESET}`
      );
    }

    estado = salida.cerrarSesion ? null : salida.estado;
    console.log("");
  }
}

const dia: ContextoBot = { moduloTramitesActivo: false, fueraDeHorario: false };
const noche: ContextoBot = { moduloTramitesActivo: false, fueraDeHorario: true };
const conTramites: ContextoBot = { moduloTramitesActivo: true, fueraDeHorario: false };

async function main() {
  await conversacion(
    "Impresión estándar · pago previo (CoDi)",
    ["hola", "1", "1", "30 copias a color", "1"],
    dia
  );

  await conversacion(
    "Impresión express · pago en caja (efectivo)",
    ["hola", "1", "2", "5 copias BN", "3"],
    dia
  );

  await conversacion(
    "Cotización · marca reconocida",
    ["hola", "2", "engargolado", "2"],
    dia
  );

  await conversacion(
    "Facturación · por RFC",
    ["hola", "3", "2", "XAXX010101000"],
    dia
  );

  await conversacion(
    "Trámites bloqueados (flag OFF)",
    ["hola", "4"],
    dia
  );

  await conversacion(
    "Menú con trámites activos (flag ON)",
    ["hola"],
    conTramites
  );

  await conversacion(
    "Horario nocturno (aviso)",
    ["hola"],
    noche
  );
}

main();
