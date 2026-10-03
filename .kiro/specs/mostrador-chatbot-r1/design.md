# Diseño — Release 1: Sistema de Gestión de Mostrador y Chatbot

## Visión general

El sistema se compone de tres partes que comparten una única base de datos Supabase:

1. **Webhook de WhatsApp** (`app/api/webhook/route.ts`): recibe los mensajes, los enruta por un motor de conversación por flujos y crea/actualiza tickets.
2. **Panel de Mostrador** (Next.js App Router + Supabase Realtime): interfaz para las 3 terminales que visualiza y opera los tickets en tiempo real.
3. **Base de datos Supabase**: Postgres (tablas y enums del esquema dado), Auth (empleados), Realtime (sincronización del panel) y Storage (bucket `adjuntos-whatsapp`).

El desarrollo es **local-first**: toda la lógica se prueba con payloads simulados y mocks (descarga de archivos, consulta Sicar) antes de conectar servicios reales.

```
WhatsApp Cloud API / cURL (mock)
            │  POST payload
            ▼
┌──────────────────────────────┐
│  app/api/webhook/route.ts     │  ← verificación GET + ingestión POST
│  ┌──────────────────────────┐ │
│  │ Parser de payload        │ │
│  │ Resolución de cliente    │ │
│  │ Motor de flujos          │ │  Impresiones / Cotización / Facturación
│  │ Reglas: anti-merma,      │ │
│  │ horario nocturno, flags  │ │
│  └──────────────────────────┘ │
└───────────────┬───────────────┘
                │ lee/escribe (service role)
                ▼
┌──────────────────────────────┐        Realtime (<100ms)
│         Supabase              │ ◄───────────────────────────┐
│  Postgres · Storage · Auth    │                             │
└──────────────────────────────┘                             │
                ▲                                             │
                │ anon client + subscripción Realtime         │
┌───────────────┴─────────────────────────────────────────────┐
│  Panel de Mostrador (3 terminales)  — toma/confirma/imprime  │
└──────────────────────────────────────────────────────────────┘
```

## Arquitectura y stack

Versiones **fijadas de forma exacta** (sin rangos `^`) para builds reproducibles:

- **Runtime:** Node 22 LTS (`.nvmrc` = 22).
- **Framework:** Next.js 15.5.27 (App Router, TypeScript).
- **UI:** React 19.2.0 / React-DOM 19.2.0.
- **Lenguaje:** TypeScript 5.7.x.
- **Base de datos / BaaS:** Supabase (Postgres + Auth + Realtime + Storage), local vía Supabase CLI (Docker).
- **Clientes Supabase:** `@supabase/ssr` 0.12.7 + `@supabase/supabase-js` 2.117.2.
- **Mensajería:** WhatsApp Cloud API (Graph API) — mock/stub en R1.
- **Estilos del panel:** Tailwind CSS 3.4.19 (con PostCSS 8.5.28 + Autoprefixer).
- **Validación:** Zod 3.x para payloads y entradas.
- **Tests:** Vitest 3.2.7 (lógica de dominio pura).

> Nota de seguridad de dependencias: tras `npm audit` quedan 2 cadenas de advisories inevitables sin cambios breaking: la `postcss` **interna** de Next 15 (solo se cierra con Next 16) y `@vitest/mocker` (solo se cierra con Vitest 4). Ambas son de tiempo de desarrollo/build y no entran al bundle de producción, por lo que se aceptan conscientemente para mantener el stack fijado. El resto de advisories se cerró subiendo `postcss` directo a 8.5.28, Vitest a 3.2.7 y con un override de `@eslint/plugin-kit` 0.3.5.

### Integraciones diferidas a Release 2 (mock/stub en R1)

- Descarga de media real de WhatsApp (Graph API).
- Consulta a Sicar.
- Cualquier capa de IA (el bot de R1 es una **máquina de estados**, sin IA).

### Estructura de carpetas propuesta

```
chatbot/
├── app/
│   ├── api/
│   │   └── webhook/
│   │       └── route.ts          # GET verificación + POST ingestión
│   ├── panel/
│   │   └── page.tsx              # Panel de mostrador (Realtime)
│   ├── layout.tsx
│   └── page.tsx
├── lib/
│   ├── supabase/
│   │   ├── client.ts            # Browser (anon) con @supabase/ssr
│   │   ├── server.ts            # Server + cookies (sesión/RLS) con @supabase/ssr
│   │   └── admin.ts             # Service role (webhook/jobs)
│   ├── whatsapp/
│   │   ├── parser.ts            # Normaliza payload entrante
│   │   ├── sender.ts            # Envío de mensajes (mock en local)
│   │   └── media.ts             # Descarga de adjuntos (mock en local)
│   ├── flows/
│   │   ├── router.ts            # Enrutador de módulos
│   │   ├── impresiones.ts
│   │   ├── cotizaciones.ts
│   │   └── facturacion.ts
│   ├── rules/
│   │   ├── antimerma.ts         # Lógica de pago/estado
│   │   └── horario.ts           # Lógica nocturna 8pm-8am
│   ├── config/
│   │   └── flags.ts             # Lectura de configuracion_sistema
│   └── types.ts                 # Tipos/enums compartidos
├── supabase/
│   └── migrations/
│       └── 0001_init.sql        # Esquema inicial (enums + tablas + seed)
├── mocks/
│   ├── payloads/                # JSON simulados de WhatsApp
│   └── sicar.ts                 # Mock de consulta Sicar
├── .env.example
├── package.json
├── tsconfig.json
└── next.config.js
```

## Modelo de datos

Se usa el esquema SQL provisto. Enums y tablas:

### Enums
- `tipo_flujo_enum`: `impresion_estandar`, `impresion_express`, `cotizacion`, `facturacion`, `tramite`
- `estado_ticket_enum`: `pendiente_presencial`, `pendiente_validacion_pago`, `pagado_imprimir`, `en_proceso`, `completado`, `cancelado`, `fuera_horario_incompleto`
- `metodo_pago_enum`: `efectivo_caja`, `codi`, `transferencia`, `tarjeta_caja`

### Tablas
- **`clientes`**: identidad por `telefono` (UNIQUE), datos de WhatsApp y de facturación (`numero_cliente_sicar`, `rfc`).
- **`configuracion_sistema`**: feature flags y estados globales por `clave`. Seed inicial: `modulo_tramites_activo = FALSE`, `fuera_de_horario_activo = FALSE`.
- **`tickets_atencion`**: unidad de trabajo. Campos clave: `folio` (SERIAL legible), `tipo_flujo`, `estado`, `metodo_pago`, `pago_confirmado`, `comprobante_url`, `detalles_json` (especificaciones flexibles), `atendido_por_terminal` / `atendido_por_usuario` (bloqueo anti-duplicidad), `es_nocturno`.

### Diagrama de estados del ticket (Impresiones)

```
                 ┌─────────────────────────────┐
  pago previo →  │ pendiente_validacion_pago   │ ── Confirmar Pago ──► pagado_imprimir
  (CoDi/transf)  └─────────────────────────────┘                           │
                                                                            │ Imprimir
  pago en caja → ┌─────────────────────────────┐                           ▼
  / presencial   │ pendiente_presencial (PAUSA)│ ── Imprimir (cliente ──► en_proceso ──► completado
                 └─────────────────────────────┘    presente en caja)
  nocturno       ┌─────────────────────────────┐
  incompleto  →  │ fuera_horario_incompleto    │ ── (a la apertura, se completa/cancela)
                 └─────────────────────────────┘
  en cualquier punto operable → cancelado
```

## Componentes y responsabilidades

### 1. Webhook (`app/api/webhook/route.ts`)
- `GET`: verificación de WhatsApp. Compara `hub.verify_token` con `WHATSAPP_VERIFY_TOKEN`; responde `hub.challenge` (200) o 403.
- `POST`: responde 200 inmediato; delega el procesamiento al parser → resolución de cliente → motor de flujos. Nunca lanza error no capturado hacia WhatsApp (siempre 200).

### 2. Clientes Supabase (`lib/supabase/`) — con `@supabase/ssr`
- `client.ts`: `createSupabaseBrowserClient()` con `createBrowserClient` (anon key). Para componentes de cliente del panel y subscripción Realtime.
- `server.ts`: `createSupabaseServerClient()` con `createServerClient` + cookies de la request. Respeta RLS y la **sesión de Supabase Auth**; se usa en Server Components, Route Handlers y Server Actions que actúan "como el usuario".
- `admin.ts`: `getSupabaseAdmin()` con **service role key** (vía `@supabase/supabase-js`). Omite RLS; se usa SOLO en backend confiable (webhook, jobs). Nunca se expone al navegador.

### 3. Parser de WhatsApp (`lib/whatsapp/parser.ts`)
- Normaliza el payload de WhatsApp Cloud API a una estructura interna: `{ telefono, nombreWhatsapp, tipoMensaje, texto, mediaId?, interactiveId? }`.
- Tolerante a payloads de estado/entrega (los ignora respondiendo 200).

### 4. Media (`lib/whatsapp/media.ts`)
- Interfaz `descargarAdjunto(mediaId)`. Implementación real llama a Graph API; en local, un **mock** devuelve un buffer de prueba y sube al bucket `adjuntos-whatsapp`. Selección por `NODE_ENV` o flag `WHATSAPP_MOCK`.

### 5. Motor de flujos (`lib/flows/`)
- `router.ts` decide el módulo según el estado de la conversación y la selección del cliente, respetando feature flags (`modulo_tramites_activo`).
- Cada flujo (`impresiones`, `cotizaciones`, `facturacion`) implementa una máquina de pasos sencilla que acumula datos en `detalles_json` y crea el ticket al completarse.

### 6. Reglas (`lib/rules/`)
- `antimerma.ts`: dado el método de pago, determina el estado inicial del ticket y las acciones permitidas (confirmar pago / imprimir).
- `horario.ts`: determina si estamos en franja nocturna (config o reloj) y aplica `es_nocturno` / `fuera_horario_incompleto`.

### 7. Panel de Mostrador (`app/panel/page.tsx`)
- Lista de tickets agrupados por estado, con badges de color.
- Subscripción Realtime a `tickets_atencion`.
- Acciones: Tomar (set `atendido_por_terminal`/`usuario`), Confirmar Pago, Imprimir, Completar, Cancelar.
- Bloqueo anti-duplicidad: la acción "Tomar" usa un UPDATE condicional (`WHERE atendido_por_terminal IS NULL`) para evitar colisiones entre terminales.

## Autenticación y roles (Supabase Auth)

El panel de mostrador queda detrás de Supabase Auth con dos roles: **empleado** y **admin**.

- **empleado:** opera tickets (tomar, confirmar pago, imprimir, pausar, completar).
- **admin:** además puede activar/desactivar feature flags y el override de horario nocturno.

El rol se almacena en los metadatos del usuario y/o en una tabla de perfiles, y se aplica mediante políticas RLS y guardas de ruta en el servidor (`createSupabaseServerClient()` + verificación de sesión/rol). Las rutas del panel son protegidas: sin sesión válida se redirige al login.

## Manejo de concurrencia (anti-duplicidad)

Para evitar que dos terminales tomen el mismo ticket, la operación "Tomar" se implementa como un update atómico condicional:

```sql
UPDATE tickets_atencion
SET atendido_por_terminal = :terminal, atendido_por_usuario = :usuario, updated_at = NOW()
WHERE id = :id AND atendido_por_terminal IS NULL
RETURNING *;
```

Si el `RETURNING` viene vacío, significa que otra terminal ya lo tomó; la UI muestra el conflicto. Supabase Realtime propaga el cambio a las demás terminales.

## Manejo de errores

- **Webhook:** siempre responde 200 a WhatsApp; los errores se capturan y registran, nunca se propagan al proveedor para evitar reintentos agresivos.
- **Payloads inválidos:** se ignoran de forma segura (log + 200).
- **Fallos de Supabase:** se registran; el webhook responde 200 y la lógica puede reintentar o dejar el ticket incompleto.
- **Mocks en local:** fallos simulados controlados por payloads de prueba para validar ramas de error.

## Variables de entorno (`.env.example`)

```
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# WhatsApp Cloud API
WHATSAPP_VERIFY_TOKEN=
WHATSAPP_ACCESS_TOKEN=
WHATSAPP_PHONE_NUMBER_ID=

# Desarrollo local
WHATSAPP_MOCK=true           # usa mocks de envío/descarga en lugar de la API real
```

## Estrategia de pruebas

- **Vitest 2.x (lógica de dominio pura):** la máquina de estados del ticket, el filtro anti-merma y la lógica de horario nocturno se implementan como funciones puras y se cubren con pruebas unitarias (Task 4 del plan).
- **Pruebas locales con cURL/Postman:** colección de payloads JSON en `mocks/payloads/` que simulan mensajes de texto, interactivos y multimedia de WhatsApp.
- **Mock de descarga de archivos:** `lib/whatsapp/media.ts` en modo mock sube un archivo de prueba al bucket.
- **Mock de Sicar:** `mocks/sicar.ts` devuelve precios/clientes simulados.
- **QA manual + end-to-end:** guía de verificación manual del flujo completo (Task 9).

> La verificación de cada tarea exige `build`, `lint` y `test` en verde.

## Decisiones de diseño

- **`detalles_json` (JSONB)** para especificaciones variables por flujo, evitando múltiples tablas en R1.
- **Service role en el webhook** porque es backend confiable; el panel usa anon + RLS/Realtime.
- **Update condicional** en lugar de locks de aplicación para el bloqueo anti-duplicidad, aprovechando la atomicidad de Postgres.
- **Feature flags en BD** (no en código) para activar Trámites sin desplegar.
- **Local-first con mocks** para desacoplar el desarrollo de credenciales externas.
