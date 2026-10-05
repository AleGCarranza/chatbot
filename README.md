# Mostrador & Chatbot — Comercializadora Chiquihuite (R1)

Aplicación Next.js con panel de mostrador y chatbot de WhatsApp, respaldada por Supabase.

## Requisitos previos

- **Node.js 22** (el proyecto fija la versión en `.nvmrc` y `package.json` → `engines`). Si usas `nvm`: `nvm use`.
- **npm** (incluido con Node).
- **Supabase CLI** (ya viene como dependencia de desarrollo; para usarla a nivel sistema instala desde https://supabase.com/docs/guides/cli).
- Cuenta/proyecto de **Supabase** y credenciales de **WhatsApp Cloud API** (opcional en modo mock).

## Bajar el proyecto en otra computadora

### 1. Clonar el repositorio

```bash
git clone https://github.com/AleGCarranza/chatbot.git
cd chatbot
```

### 2. Usar la versión de Node correcta

```bash
nvm use        # usa la versión indicada en .nvmrc (Node 22)
```

Si no tienes esa versión instalada: `nvm install 22`.

### 3. Instalar dependencias

```bash
npm install
```

### 4. Configurar variables de entorno

Copia la plantilla y rellena tus valores. El archivo `.env.local` **no se sube a git** (está en `.gitignore`), así que debes crearlo en cada computadora.

```bash
cp .env.example .env.local
```

Luego edita `.env.local` con tus credenciales:

| Variable | Descripción |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | URL del proyecto Supabase (Project Settings → API) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clave pública anon (navegador / panel / Realtime) |
| `SUPABASE_SERVICE_ROLE_KEY` | Clave service role (solo servidor / webhook). Nunca exponer al cliente |
| `WHATSAPP_VERIFY_TOKEN` | Token para verificar el webhook (GET) en el panel de Meta |
| `WHATSAPP_ACCESS_TOKEN` | Token de acceso de la Graph API (envío / descarga de media) |
| `WHATSAPP_PHONE_NUMBER_ID` | ID del número de teléfono emisor |
| `WHATSAPP_MOCK` | `true` usa mocks locales; `false` llama a la API real de WhatsApp |
| `SUPABASE_STORAGE_BUCKET` | Bucket de Supabase Storage para adjuntos de WhatsApp |

### 5. Preparar la base de datos (Supabase)

Las migraciones están en `supabase/migrations/`. Para un entorno local:

```bash
supabase start           # levanta Supabase localmente (Docker)
supabase db reset        # aplica las migraciones
npm run db:types         # genera lib/database.types.ts desde el esquema local
npm run db:seed          # crea usuarios de ejemplo (lee .env.local)
```

> Si usas un proyecto Supabase en la nube en lugar de local, aplica las migraciones con `supabase db push` y ajusta las variables de entorno a ese proyecto.

### 6. Levantar la app en desarrollo

```bash
npm run dev
```

La app queda disponible en http://localhost:3000.

## Scripts disponibles

| Script | Qué hace |
| --- | --- |
| `npm run dev` | Servidor de desarrollo de Next.js |
| `npm run build` | Build de producción |
| `npm run start` | Sirve el build de producción |
| `npm run lint` | ESLint |
| `npm run typecheck` | Chequeo de tipos con `tsc --noEmit` |
| `npm run test` | Pruebas con Vitest (una sola corrida) |
| `npm run test:watch` | Vitest en modo watch |
| `npm run db:types` | Genera tipos TypeScript desde el esquema de Supabase local |
| `npm run db:seed` | Crea usuarios de ejemplo (requiere `.env.local`) |
| `npm run demo:bot` | Demo de conversación del bot |
| `npm run chat` | Chat con el bot (local) |
| `npm run chat:live` | Chat en vivo |

## Notas

- `.env.local` y otros archivos sensibles están ignorados por git. Nunca los subas al repositorio.
- Mantén tu **token de GitHub** fuera del código y del historial.
- Para desarrollo sin WhatsApp real, deja `WHATSAPP_MOCK=true`.
