// ============================================================
// Chat interactivo con el bot vía el WEBHOOK REAL (crea tickets).
// Cada mensaje se envía a POST /api/webhook como lo haría WhatsApp,
// pasa por el motor + persistencia y crea tickets reales que verás
// en el panel. La respuesta del bot se muestra aquí (modo mock).
//
// Requisitos: `npm run dev` corriendo y Supabase local arriba.
// Uso: npm run chat:live
//
// Comandos:
//   /tel <numero>   -> cambia el teléfono del cliente (nueva persona)
//   /salir
// ============================================================
import * as readline from "node:readline";

const BASE = process.env.WEBHOOK_URL ?? "http://localhost:3000/api/webhook";

const RESET = "\x1b[0m";
const CYAN = "\x1b[36m";
const GREEN = "\x1b[32m";
const GRAY = "\x1b[90m";
const YELLOW = "\x1b[33m";
const BOLD = "\x1b[1m";

let telefono = "5215599990000";
let nombre = "Cliente Demo";

async function enviar(texto: string): Promise<void> {
  const payload = {
    entry: [
      {
        changes: [
          {
            value: {
              contacts: [{ profile: { name: nombre }, wa_id: telefono }],
              messages: [
                {
                  from: telefono,
                  id: `wamid.${Date.now()}`,
                  type: "text",
                  text: { body: texto },
                },
              ],
            },
          },
        ],
      },
    ],
  };

  try {
    const res = await fetch(BASE, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = (await res.json()) as {
      reply?: string;
      folio?: number | null;
    };

    const reply = data.reply ?? "(sin respuesta; ¿está corriendo npm run dev?)";
    const texto2 = reply.split("\n").join(`\n${GRAY}       ${RESET}`);
    console.log(`${GREEN}Bot:${RESET}  ${texto2}\n`);
    if (data.folio) {
      console.log(`${YELLOW}      ➜ Ticket #${data.folio} creado (míralo en el panel).${RESET}\n`);
    }
  } catch (e) {
    console.log(
      `${YELLOW}Error llamando al webhook: ${(e as Error).message}. ¿Está corriendo "npm run dev"?${RESET}\n`
    );
  }
}

let cerrado = false;

function preguntar(rl: readline.Interface) {
  if (cerrado) return;
  rl.question(`${CYAN}Tú:${RESET}   `, async (linea) => {
    const texto = linea.trim();
    if (texto === "/salir") {
      console.log(`${GRAY}Hasta luego.${RESET}`);
      cerrado = true;
      rl.close();
      return;
    }
    if (texto.startsWith("/tel ")) {
      telefono = texto.slice(5).trim() || telefono;
      nombre = `Cliente ${telefono.slice(-4)}`;
      console.log(`${YELLOW}(ahora escribes como ${telefono})${RESET}\n`);
      preguntar(rl);
      return;
    }
    if (texto) await enviar(texto);
    preguntar(rl);
  });
}

console.log(`${BOLD}Chat EN VIVO con el bot (crea tickets reales)${RESET}`);
console.log(`${GRAY}Cliente actual: ${telefono}. Escribe "hola" para empezar.${RESET}`);
console.log(`${GRAY}Comandos: /tel <numero> (otra persona), /salir${RESET}\n`);

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
rl.on("close", () => {
  cerrado = true;
});
preguntar(rl);
