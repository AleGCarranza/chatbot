// ============================================================
// Chat interactivo con el bot en la terminal (sin BD ni red).
// Escribe mensajes como si fueras el cliente de WhatsApp y el bot
// responde en vivo, manteniendo el estado de la conversación.
//
// Uso: npm run chat
//
// Comandos especiales:
//   /tramites on|off   -> activa/desactiva el módulo de trámites
//   /nocturno on|off    -> fuerza/quita el horario nocturno
//   /reset              -> reinicia la conversación
//   /salir              -> termina
// ============================================================
import * as readline from "node:readline";
import { procesarTurno } from "@/lib/flows/motor";
import type { ContextoBot, EstadoConversacion } from "@/lib/flows/tipos";

const RESET = "\x1b[0m";
const CYAN = "\x1b[36m";
const GREEN = "\x1b[32m";
const GRAY = "\x1b[90m";
const YELLOW = "\x1b[33m";
const BOLD = "\x1b[1m";

const ctx: ContextoBot = { moduloTramitesActivo: false, fueraDeHorario: false };
let estado: EstadoConversacion | null = null;

function imprimirBot(texto: string) {
  const resp = texto.split("\n").join(`\n${GRAY}       ${RESET}`);
  console.log(`${GREEN}Bot:${RESET}  ${resp}\n`);
}

function estadoCtx(): string {
  return `${GRAY}[trámites: ${ctx.moduloTramitesActivo ? "ON" : "OFF"} · nocturno: ${
    ctx.fueraDeHorario ? "ON" : "OFF"
  }]${RESET}`;
}

async function manejar(linea: string, rl: readline.Interface) {
  const texto = linea.trim();

  // Comandos especiales
  if (texto === "/salir") {
    console.log(`${GRAY}Hasta luego.${RESET}`);
    rl.close();
    return;
  }
  if (texto === "/reset") {
    estado = null;
    console.log(`${YELLOW}(conversación reiniciada)${RESET}\n`);
    preguntar(rl);
    return;
  }
  if (texto.startsWith("/tramites")) {
    ctx.moduloTramitesActivo = texto.endsWith("on");
    console.log(`${YELLOW}(trámites ${ctx.moduloTramitesActivo ? "activados" : "desactivados"})${RESET} ${estadoCtx()}\n`);
    preguntar(rl);
    return;
  }
  if (texto.startsWith("/nocturno")) {
    ctx.fueraDeHorario = texto.endsWith("on");
    console.log(`${YELLOW}(nocturno ${ctx.fueraDeHorario ? "activado" : "desactivado"})${RESET} ${estadoCtx()}\n`);
    preguntar(rl);
    return;
  }

  // Turno normal de conversación
  const salida = await procesarTurno(
    estado,
    { texto, opcionId: null, adjuntoPath: null },
    ctx
  );
  imprimirBot(salida.respuesta);

  if (salida.accion?.tipo === "crear_ticket") {
    const a = salida.accion;
    console.log(
      `${YELLOW}      ➜ Se crearía un ticket: ${a.tipoFlujo}` +
        (a.metodoPago ? ` · pago ${a.metodoPago}` : "") +
        `${RESET}\n`
    );
  }

  estado = salida.cerrarSesion ? null : salida.estado;
  preguntar(rl);
}

function preguntar(rl: readline.Interface) {
  rl.question(`${CYAN}Tú:${RESET}   `, (linea) => manejar(linea, rl));
}

console.log(`${BOLD}Chat con el bot de Chiquihuite${RESET} ${estadoCtx()}`);
console.log(
  `${GRAY}Escribe "hola" para empezar. Comandos: /tramites on|off, /nocturno on|off, /reset, /salir${RESET}\n`
);

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
preguntar(rl);
