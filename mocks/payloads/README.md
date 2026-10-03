# Payloads de prueba — Webhook WhatsApp (local)

Payloads JSON que simulan la estructura de WhatsApp Cloud API para probar
`app/api/webhook/route.ts` sin conectar la API real.

## Requisitos

1. Levanta el servidor de desarrollo (manualmente en tu terminal):

   ```bash
   npm run dev
   ```

2. El webhook queda disponible en `http://localhost:3000/api/webhook`.

## Verificación del webhook (GET)

Debe devolver el valor de `hub.challenge` cuando el token coincide con
`WHATSAPP_VERIFY_TOKEN` de tu `.env.local`.

```bash
curl "http://localhost:3000/api/webhook?hub.mode=subscribe&hub.verify_token=TU_TOKEN&hub.challenge=12345"
# -> 12345
```

Con un token incorrecto debe devolver HTTP 403.

## Ingestión de mensajes (POST)

```bash
# Mensaje de texto
curl -X POST http://localhost:3000/api/webhook \
  -H "Content-Type: application/json" \
  --data @mocks/payloads/mensaje-texto.json

# Mensaje interactivo (botón)
curl -X POST http://localhost:3000/api/webhook \
  -H "Content-Type: application/json" \
  --data @mocks/payloads/mensaje-interactivo.json

# Mensaje con imagen (adjunto)
curl -X POST http://localhost:3000/api/webhook \
  -H "Content-Type: application/json" \
  --data @mocks/payloads/mensaje-imagen.json

# Notificación de estado (debe ignorarse, responde 200)
curl -X POST http://localhost:3000/api/webhook \
  -H "Content-Type: application/json" \
  --data @mocks/payloads/status-entrega.json
```

Todos los POST responden `{"received":true}` con HTTP 200. Revisa la consola
del servidor para ver el mensaje procesado.

## Efectos en Supabase local (Task 5)

Con Supabase local corriendo y `.env.local` configurado, el POST ahora:

- **Resuelve/crea el cliente** por teléfono (idempotente: múltiples mensajes
  del mismo número no duplican el registro en `clientes`).
- **Lee los feature flags** y calcula si se está **fuera de horario**.
- **Si el mensaje trae un adjunto** (payload de imagen), descarga el archivo
  con el **mock** (`WHATSAPP_MOCK=true`) y lo **sube al bucket
  `adjuntos-whatsapp`** en la ruta `<telefono>/<mediaId>-<timestamp>.<ext>`.

Verificación directa en la base:

```bash
docker exec -i supabase_db_chatbot psql -U postgres -d postgres \
  -c "SELECT telefono, nombre_whatsapp FROM clientes;" \
  -c "SELECT name FROM storage.objects WHERE bucket_id='adjuntos-whatsapp';"
```

## Payloads incluidos

| Archivo                     | Tipo         | Qué prueba                                  |
| --------------------------- | ------------ | ------------------------------------------- |
| `mensaje-texto.json`        | texto        | Extracción de teléfono, nombre y texto      |
| `mensaje-interactivo.json`  | interactivo  | Extracción de `interactiveId` (botón)       |
| `mensaje-imagen.json`       | multimedia   | Extracción de `mediaId` y caption           |
| `status-entrega.json`       | status       | Que las notificaciones de estado se ignoran |
