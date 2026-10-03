export default function Home() {
  return (
    <main className="mx-auto max-w-2xl p-8">
      <h1 className="text-2xl font-bold">
        Mostrador &amp; Chatbot — Comercializadora Chiquihuite
      </h1>
      <p className="mt-2 text-gray-600">Release 1 · entorno de desarrollo</p>

      <section className="mt-6 rounded-lg border border-gray-200 p-4">
        <h2 className="font-semibold">Endpoints</h2>
        <ul className="mt-2 list-disc pl-5 text-sm text-gray-700">
          <li>
            <code>GET /api/webhook</code> — verificación de WhatsApp
          </li>
          <li>
            <code>POST /api/webhook</code> — ingestión de mensajes
          </li>
          <li>
            <code>/login</code> — inicio de sesión (empleado/admin)
          </li>
          <li>
            <code>/panel</code> — panel de mostrador (protegido)
          </li>
        </ul>
      </section>

      <section className="mt-4 rounded-lg border border-gray-200 p-4">
        <h2 className="font-semibold">Pruebas locales</h2>
        <p className="mt-2 text-sm text-gray-700">
          Usa los payloads de <code>mocks/payloads/</code> con cURL o Postman.
          Revisa <code>mocks/payloads/README.md</code> para los comandos.
        </p>
      </section>
    </main>
  );
}
