# Plan de Implementación — Release 1

Stack fijado (versiones exactas, sin `^`): Node 22 LTS · Next.js 15.5.27 · React/React-DOM 19.2.0 · TypeScript 5.7.x · Tailwind 3.4.19 · PostCSS 8.5.28 · @supabase/supabase-js 2.117.2 · @supabase/ssr 0.12.7 · Vitest 3.2.7 · Supabase CLI local (Docker).

Cada tarea se considera terminada solo con `build`, `lint` y `test` en verde.

- [x] 1. Scaffold Next.js 15 con la matriz de versiones pineadas
  - `package.json` con versiones exactas, `.nvmrc` (Node 22), `tsconfig`, `next.config`, Tailwind, ESLint flat (Next 15), Vitest.
  - Clientes Supabase con `@supabase/ssr`: `client.ts` (browser), `server.ts` (server+cookies), `admin.ts` (service role).
  - `lib/types.ts`, `.env.example`, webhook base (`app/api/webhook/route.ts`) y payloads mock en `mocks/payloads/`.
  - Build/lint verdes.
  - _Requisitos: 1, 2 (parcial), 3 (parcial), 10_

- [x] 2. Supabase local: esquema + seed + bucket + RLS mínima
  - Migración versionada con enums, tablas (`clientes`, `configuracion_sistema`, `tickets_atencion`), índices y triggers.
  - Seed de feature flags; bucket `adjuntos-whatsapp` en Storage.
  - RLS mínima (lectura/escritura por rol) y publicación Realtime de `tickets_atencion`.
  - _Requisitos: 2, 3, 9_

- [x] 3. Capa de clientes Supabase + tipos generados
  - Afinar `browser/server/admin` y generar tipos de la BD (`supabase gen types`) integrados en `lib/types.ts`.
  - _Requisitos: 2, 9, 10_

- [x] 4. Lógica de dominio pura y testeada (Vitest)
  - `lib/rules/estados.ts` (transiciones válidas del ticket), `lib/rules/antimerma.ts`, `lib/rules/horario.ts` (nocturno 8pm-8am + override).
  - Pruebas unitarias Vitest para cada regla.
  - _Requisitos: 5, 8_

- [x] 5. API Route del webhook: verify GET + ingesta POST + mock de media
  - Completar `app/api/webhook/route.ts`: resolución de cliente (vía `admin.ts`), aplicación de flags/horario, enrutado.
  - `lib/whatsapp/media.ts` con descarga mock y subida a `adjuntos-whatsapp`; payloads cURL.
  - _Requisitos: 1, 2, 3, 4, 10_

- [x] 6. Máquina de estados conversacional del bot
  - Flujos: impresiones (estándar/express), cotización (marca económica/reconocida, mock Sicar), facturación (No. Cliente Sicar o RFC), trámites bloqueados por flag.
  - _Requisitos: 3, 4, 6, 7_

- [x] 7. Supabase Auth + roles (empleado/admin) con rutas protegidas
  - Login, middleware de sesión, guardas de ruta y RLS por rol.
  - _Requisitos: 9_

- [x] 8. Panel de mostrador multi-terminal en tiempo real
  - Realtime, agrupación nocturna, botones Confirmar Pago / Imprimir / Pausar, bloqueo `atendido_por_terminal`, visor de comprobante, override de horario y flags para admin.
  - _Requisitos: 5, 8, 9_

- [x] 9. QA manual + integración end-to-end + verificación final
  - Guía de QA manual, prueba end-to-end del flujo completo y verificación final (build/lint/tests verdes).
  - _Requisitos: todos_
