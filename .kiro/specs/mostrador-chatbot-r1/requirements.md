# Requisitos — Release 1: Sistema de Gestión de Mostrador y Chatbot

## Introducción

Comercializadora Chiquihuite necesita un sistema que combine un **chatbot de WhatsApp** (vía WhatsApp Cloud API) con un **panel de atención de mostrador en tiempo real** para gestionar los servicios de la tienda. El Release 1 cubre tres módulos activos: **Impresiones**, **Cotizaciones** y **Facturación**. El módulo de **Trámites Digitales (CURP/CFE/Actas)** se incluye en el modelo de datos pero permanece desactivado mediante un feature flag.

El sistema debe operar con hasta **3 terminales de mostrador** simultáneas, sincronizadas en tiempo real (Supabase Realtime, latencia objetivo <100ms), con bloqueo anti-duplicidad para evitar que dos empleados atiendan el mismo ticket. Debe aplicar un **filtro anti-merma** que evita imprimir trabajos no pagados, y manejar el **horario nocturno** (8:00 PM – 8:00 AM) capturando solicitudes para procesarlas a la apertura.

**Stack técnico:** Next.js (App Router) + Supabase (Postgres, Auth, Realtime, Storage) + WhatsApp Cloud API.

**Estrategia de desarrollo:** Primero desarrollo y pruebas locales con payloads JSON simulados (cURL/Postman) y mocks de descarga de archivos, antes de conectar la WhatsApp Cloud API real.

---

## Glosario

- **Ticket de atención:** Unidad de trabajo generada desde una conversación del chatbot (`tickets_atencion`).
- **Filtro anti-merma:** Regla que impide imprimir trabajos cuyo pago no ha sido confirmado.
- **Pago previo:** CoDi o transferencia; el cliente paga antes y el empleado valida el comprobante.
- **Pago en caja / presencial:** El cliente paga físicamente en caja; el trabajo queda pausado hasta su llegada.
- **Horario nocturno:** Franja 8:00 PM – 8:00 AM en la que la tienda está cerrada; el bot captura solicitudes sin procesarlas.
- **Terminal:** Una de las 3 estaciones de mostrador que consumen el panel en tiempo real.
- **Feature flag:** Configuración booleana en `configuracion_sistema` que activa/desactiva módulos.

---

## Requisitos

### Requisito 1: Recepción de mensajes vía Webhook de WhatsApp

**Historia de usuario:** Como sistema, quiero recibir y verificar los mensajes entrantes de WhatsApp Cloud API, para iniciar o continuar conversaciones del chatbot.

#### Criterios de aceptación

1. CUANDO WhatsApp Cloud API envíe una petición `GET` de verificación al webhook ENTONCES el sistema DEBERÁ validar `hub.verify_token` contra el token configurado y responder con `hub.challenge` y HTTP 200 si coincide, o HTTP 403 si no.
2. CUANDO llegue una petición `POST` con un payload de mensaje ENTONCES el sistema DEBERÁ responder HTTP 200 de inmediato para confirmar la recepción a WhatsApp.
3. CUANDO el payload contenga un mensaje de texto, interactivo o multimedia ENTONCES el sistema DEBERÁ extraer el número de teléfono, el nombre de WhatsApp y el contenido del mensaje.
4. CUANDO se reciba un payload malformado o vacío ENTONCES el sistema DEBERÁ responder HTTP 200 sin fallar y registrar el evento para depuración.
5. CUANDO se ejecute en entorno local ENTONCES el sistema DEBERÁ aceptar payloads JSON simulados vía cURL/Postman con la misma estructura que WhatsApp Cloud API.

### Requisito 2: Registro e identificación de clientes

**Historia de usuario:** Como sistema, quiero identificar o registrar automáticamente al cliente por su número de teléfono, para asociar sus tickets y datos.

#### Criterios de aceptación

1. CUANDO llegue un mensaje de un número no registrado ENTONCES el sistema DEBERÁ crear un registro en `clientes` con `telefono` y `nombre_whatsapp`.
2. CUANDO llegue un mensaje de un número ya registrado ENTONCES el sistema DEBERÁ recuperar el cliente existente sin duplicarlo (restricción UNIQUE en `telefono`).
3. CUANDO el cliente confirme su nombre durante una conversación ENTONCES el sistema DEBERÁ guardarlo en `nombre_confirmado`.
4. CUANDO el flujo requiera datos de facturación ENTONCES el sistema DEBERÁ poder almacenar `numero_cliente_sicar` y `rfc` en el cliente.

### Requisito 3: Feature flags y configuración del sistema

**Historia de usuario:** Como administrador, quiero activar o desactivar módulos y estados globales mediante configuración, para controlar el comportamiento sin desplegar código.

#### Criterios de aceptación

1. CUANDO el flag `modulo_tramites_activo` esté en `FALSE` ENTONCES el chatbot NO DEBERÁ ofrecer el flujo de Trámites (CURP/CFE/Actas).
2. CUANDO el flag `fuera_de_horario_activo` esté en `TRUE` ENTONCES el sistema DEBERÁ aplicar el comportamiento de horario nocturno.
3. CUANDO se consulte la configuración ENTONCES el sistema DEBERÁ leerla desde la tabla `configuracion_sistema` por `clave`.
4. CUANDO un flag no exista ENTONCES el sistema DEBERÁ asumir un valor por defecto seguro (`FALSE`).

### Requisito 4: Flujo de Impresiones (Estándar y Presencial por QR)

**Historia de usuario:** Como cliente, quiero solicitar impresiones por WhatsApp (de forma estándar o indicando que ya estoy en la tienda vía QR), para recibir mi trabajo según mi forma de pago.

#### Criterios de aceptación

1. CUANDO el cliente elija el módulo de Impresiones ENTONCES el sistema DEBERÁ capturar las especificaciones del trabajo (archivo adjunto, cantidad, color, tamaño, etc.) en `detalles_json`.
2. CUANDO el cliente adjunte un archivo ENTONCES el sistema DEBERÁ almacenarlo en el bucket `adjuntos-whatsapp` de Supabase Storage y guardar su referencia (`comprobante_url` o dentro de `detalles_json`).
3. CUANDO el cliente ingrese por el flujo Presencial / "Ya estoy aquí" (QR) ENTONCES el sistema DEBERÁ marcar el ticket con `tipo_flujo = 'impresion_express'`.
4. CUANDO el cliente elija impresión estándar ENTONCES el sistema DEBERÁ crear el ticket con `tipo_flujo = 'impresion_estandar'`.
5. CUANDO el flujo express requiera descarga de archivos en entorno local ENTONCES el sistema DEBERÁ usar un mock de descarga en lugar de la API real de WhatsApp.

### Requisito 5: Filtro Anti-Merma por método de pago

**Historia de usuario:** Como dueño del negocio, quiero que ningún trabajo se imprima sin pago confirmado, para evitar merma de insumos.

#### Criterios de aceptación

1. CUANDO el método de pago sea CoDi o transferencia (pago previo) ENTONCES el sistema DEBERÁ crear el ticket en estado `pendiente_validacion_pago` con el comprobante adjunto.
2. CUANDO el empleado valide el comprobante y presione "Confirmar Pago" ENTONCES el sistema DEBERÁ cambiar el estado a `pagado_imprimir`, marcar `pago_confirmado = TRUE` y darle prioridad alta.
3. CUANDO el método de pago sea en caja / presencial ENTONCES el sistema DEBERÁ crear el ticket en estado `pendiente_presencial` (PAUSADO) y NO DEBERÁ permitir imprimir.
4. CUANDO el cliente llegue físicamente y el empleado presione "Imprimir" en un ticket presencial ENTONCES el sistema DEBERÁ cambiar el estado a `en_proceso` y registrar `metodo_pago`.
5. MIENTRAS un ticket presencial esté en estado `pendiente_presencial` ENTONCES el sistema NO DEBERÁ exponer acción de impresión directa hasta la confirmación presencial.

### Requisito 6: Flujo de Cotizaciones

**Historia de usuario:** Como cliente, quiero solicitar una cotización indicando si prefiero marca económica o reconocida, para recibir un precio consultado en Sicar.

#### Criterios de aceptación

1. CUANDO el cliente elija el módulo de Cotizaciones ENTONCES el sistema DEBERÁ preguntar por el tipo de marca (Económica o Reconocida).
2. CUANDO el cliente indique el producto y la preferencia de marca ENTONCES el sistema DEBERÁ registrar la solicitud en `detalles_json` con `tipo_flujo = 'cotizacion'`.
3. CUANDO se requiera el precio ENTONCES el sistema DEBERÁ consultar Sicar (mock/integración) y registrar el resultado.
4. CUANDO la consulta a Sicar no esté disponible en local ENTONCES el sistema DEBERÁ usar un mock de respuesta.

### Requisito 7: Flujo de Facturación

**Historia de usuario:** Como cliente, quiero solicitar mi factura buscando por número de cliente Sicar o por RFC, para obtener mi comprobante fiscal.

#### Criterios de aceptación

1. CUANDO el cliente elija el módulo de Facturación ENTONCES el sistema DEBERÁ ofrecer búsqueda por Número de Cliente Sicar o por RFC.
2. CUANDO el cliente proporcione el Número de Cliente Sicar ENTONCES el sistema DEBERÁ guardarlo en `numero_cliente_sicar` y crear el ticket con `tipo_flujo = 'facturacion'`.
3. CUANDO el cliente proporcione el RFC ENTONCES el sistema DEBERÁ guardarlo en `rfc` y crear el ticket con `tipo_flujo = 'facturacion'`.
4. CUANDO falten datos obligatorios de facturación ENTONCES el sistema DEBERÁ solicitarlos antes de generar el ticket.

### Requisito 8: Manejo de Horario Nocturno (8:00 PM – 8:00 AM)

**Historia de usuario:** Como negocio, quiero que fuera de horario el bot capture las solicitudes sin procesarlas, para atenderlas ordenadamente a la apertura.

#### Criterios de aceptación

1. CUANDO `fuera_de_horario_activo = TRUE` y llegue una solicitud ENTONCES el sistema DEBERÁ capturar las especificaciones y marcar el ticket con `es_nocturno = TRUE`.
2. CUANDO una solicitud nocturna quede incompleta ENTONCES el sistema DEBERÁ marcarla con estado `fuera_horario_incompleto`.
3. CUANDO sea la apertura (8:00 AM) ENTONCES el panel DEBERÁ agrupar los tickets nocturnos en: 🟢 Pagados Nocturnos, 🟡 Pausados (pago en caja) y ⚠️ Incompletos.
4. CUANDO el bot frene por horario nocturno ENTONCES DEBERÁ informar al cliente que su solicitud será atendida a la apertura.

### Requisito 9: Panel de Mostrador en Tiempo Real (Multi-Terminal)

**Historia de usuario:** Como empleado de mostrador, quiero ver y actualizar los tickets en tiempo real desde cualquiera de las 3 terminales, sin colisionar con mis compañeros.

#### Criterios de aceptación

1. CUANDO se cree o actualice un ticket ENTONCES todas las terminales DEBERÁN reflejar el cambio vía Supabase Realtime con latencia objetivo <100ms.
2. CUANDO un empleado tome un ticket ENTONCES el sistema DEBERÁ registrar `atendido_por_terminal` y `atendido_por_usuario` como bloqueo anti-duplicidad.
3. CUANDO un ticket ya esté tomado por una terminal ENTONCES las demás terminales NO DEBERÁN permitir tomarlo simultáneamente.
4. CUANDO un empleado libere o complete un ticket ENTONCES el sistema DEBERÁ actualizar el estado y notificar a todas las terminales.
5. EL panel DEBERÁ mostrar el estado visual de cada ticket (🟢 pagado, 🟡 pausado, ⚠️ incompleto, en proceso, completado).

### Requisito 10: Entorno de desarrollo y pruebas locales

**Historia de usuario:** Como desarrollador, quiero probar el webhook y los flujos localmente con datos simulados, para validar la lógica antes de conectar servicios reales.

#### Criterios de aceptación

1. EL proyecto DEBERÁ estructurarse en Next.js (App Router) con la ruta `app/api/webhook/route.ts`.
2. EL proyecto DEBERÁ incluir clientes de Supabase separados para navegador (anon) y servidor (service role).
3. CUANDO se ejecute en local ENTONCES el sistema DEBERÁ aceptar payloads JSON de WhatsApp simulados vía cURL/Postman.
4. CUANDO se descarguen archivos adjuntos en local ENTONCES el sistema DEBERÁ usar un mock en lugar de llamar a la WhatsApp Cloud API real.
5. EL proyecto DEBERÁ documentar las variables de entorno necesarias en un `.env.example`.
