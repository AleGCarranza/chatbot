# Guía de QA manual — Release 1

Sistema de Mostrador y Chatbot (Comercializadora Chiquihuite). Esta guía
describe cómo levantar el entorno local y los escenarios de prueba manual
para validar los módulos del Release 1.

## Stack verificado

Node 22 · Next.js 15.5.27 · React 19.2.0 · TypeScript 5.7 · Tailwind 3.4.19 ·
@supabase/ssr 0.12.7 · @supabase/supabase-js 2.117.2 · Vitest 3.2.7 ·
Supabase CLI local (Docker).

## 1. Arranque local

Requisitos: Node 22 y Docker en ejecución.

```bash
# 1) Dependencias
npm install

# 2) Supabase local (Postgres, Auth, Realtime, Storage)
npx supabase start

# 3) Volcar las claves locales a .env.local (si no existe)
#    Toma los valores de `npx supabase status -o env`:
#    NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY,
#    SUPABASE_SERVICE_ROLE_KEY. Deja WHATSAPP_MOCK=true.

# 4) Aplicar migraciones y datos de prueba
npx supabase db reset        # aplica supabase/migrations/*.sql
npm run db:seed              # crea usuarios empleado/admin

# 5) Servidor de desarrollo
npm run dev                  # http://localhost:3000
```

### Credenciales de prueba (seed)

| Rol      | Email                        | Password      |
| -------- | ---------------------------- | ------------- |
| Admin    | `admin@chiquihuite.local`    | `admin123`    |
| Empleado | `empleado@chiquihuite.local` | `empleado123` |

## 2. Verificación automatizada

```bash
npm run typecheck   # tipos
npm run lint        # ESLint
npm test            # Vitest (reglas de dominio + motor del bot + panel)
npm run build       # build de producción
```

Todo debe terminar sin errores.

## 3. Escenarios de prueba del Chatbot (webhook)

El webhook acepta payloads simulados de WhatsApp. Hay ejemplos en
`mocks/payloads/` y comandos en `mocks/payloads/README.md`.

### 3.1 Verificación del webhook (GET)

```bash
curl "http://localhost:3000/api/webhook?hub.mode=subscribe&hub.verify_token=<WHATSAPP_VERIFY_TOKEN>&hub.challenge=12345"
# Esperado: 12345  (token correcto)  /  403 (token incorrecto)
```

### 3.2 Flujo de impresión con pago previo (CoDi)

Enviar mensajes de texto consecutivos del mismo número:

1. `hola` → el bot muestra el menú.
2. `1` → Impresiones.
3. `1` → Estándar.
4. `20 copias a color` → captura especificaciones.
5. `1` → CoDi (pago previo).

**Resultado esperado:** se crea un ticket `impresion_estandar` en estado
`pendiente_validacion_pago`, con folio. El bot pide el comprobante.

### 3.3 Flujo de impresión con pago en caja (presencial)

1. `hola` → `1` → `2` (Ya estoy aquí / express) → specs → `3` (efectivo en caja).

**Resultado esperado:** ticket `impresion_express` en estado
`pendiente_presencial` (PAUSADO). No se imprime hasta que el empleado presione
"Imprimir" en el panel con el cliente presente.

### 3.4 Flujo de cotización

1. `hola` → `2` (Cotización) → `engargolado` → `2` (Reconocida).

**Resultado esperado:** el bot responde con un precio (mock Sicar) y crea un
ticket `cotizacion` en estado `en_proceso`.

### 3.5 Flujo de facturación

1. `hola` → `3` (Facturación) → `2` (por RFC) → `XAXX010101000`.

**Resultado esperado:** el bot confirma los datos y crea un ticket
`facturacion`. El RFC se guarda en el cliente.

### 3.6 Trámites bloqueados

1. Con `modulo_tramites_activo = false` (por defecto): el menú NO muestra la
   opción de Trámites. Si se fuerza `4`, el bot informa que no está disponible.

### 3.7 Horario nocturno

1. Como **admin**, en el panel, activar "Forzar fuera de horario".
2. Iniciar una conversación: el menú incluye el aviso de horario nocturno.
3. Completar una impresión: el ticket se marca `es_nocturno = true` y, si es
   impresión, entra como `fuera_horario_incompleto` para la apertura.

## 4. Escenarios del Panel de Mostrador

Inicia sesión en `http://localhost:3000/login`.

### 4.1 Acceso y roles

- Sin sesión, visitar `/panel` redirige a `/login`.
- Con empleado: ve el tablero, sin la barra de administrador.
- Con admin: ve además la barra de controles (flags y override de horario).

### 4.2 Agrupación de tickets

El panel agrupa en: 🟢 Pagados nocturnos · 🟠 Validar comprobante ·
🟡 Pausados (pago en caja) · ⚠️ Incompletos (nocturnos) · 🔵 Activos ·
✅ Cerrados.

### 4.3 Filtro anti-merma

- Ticket CoDi/transferencia: botón **Confirmar pago** → pasa a
  `pagado_imprimir`; luego **Imprimir** → `en_proceso`.
- Ticket presencial: aparece pausado; **Imprimir** solo cuando el cliente está
  en caja. No se imprime sin ese paso.
- Un ticket `pagado_imprimir` sin pago confirmado no debe poder imprimirse.

### 4.4 Multi-terminal (anti-duplicidad)

1. Abre el panel en dos pestañas con distinta terminal:
   `/panel?terminal=T1` y `/panel?terminal=T2`.
2. En T1, pulsa **Tomar** sobre un ticket.
3. En T2, el mismo ticket aparece como atendido por T1 y no es operable.
   Si ambas intentan tomar a la vez, solo una lo logra (bloqueo atómico por
   `atendido_por_terminal`).

### 4.5 Tiempo real (Realtime)

- Con dos pestañas abiertas, una acción en T1 (confirmar pago, imprimir,
  completar) se refleja en T2 sin recargar.
- Un ticket nuevo creado por el chatbot aparece en el panel automáticamente.

### 4.6 Visor de comprobante

- En un ticket con adjunto, **Ver comprobante** abre una URL firmada temporal
  del archivo en el bucket privado `adjuntos-whatsapp`.

### 4.7 Controles de administrador

- Activar/desactivar **Módulo de trámites** cambia el menú del bot.
- Activar **Forzar fuera de horario** aplica el comportamiento nocturno.

## 5. Alcance de Release 1 (mocks/stubs)

Lo siguiente está simulado en R1 y se integra en Release 2:

- Descarga real de media de WhatsApp (Graph API) → mock en `lib/whatsapp/media.ts`.
- Envío real de mensajes → mock en `lib/whatsapp/sender.ts`.
- Consulta a Sicar (precios / cliente fiscal) → mock en `mocks/sicar.ts`.
- No hay IA: el bot es una máquina de estados determinista.

## 6. Notas de seguridad de dependencias

`npm audit` reporta advisories en dependencias de desarrollo (postcss interna
de Next 15 y `@vitest/mocker`). No afectan el bundle de producción y solo se
cerrarían con cambios breaking (Next 16 / Vitest 4), fuera del alcance de R1.
