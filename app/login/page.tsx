import { loginAction } from "./actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; redirect?: string }>;
}) {
  const { error, redirect } = await searchParams;

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center p-8">
      <h1 className="text-2xl font-bold">Mostrador Chiquihuite</h1>
      <p className="mt-1 text-sm text-gray-600">
        Inicia sesión para acceder al panel.
      </p>

      {error ? (
        <p
          role="alert"
          className="mt-4 rounded border border-red-300 bg-red-50 p-2 text-sm text-red-700"
        >
          {error}
        </p>
      ) : null}

      <form action={loginAction} className="mt-6 space-y-4">
        <input type="hidden" name="redirect" value={redirect ?? "/panel"} />
        <div>
          <label htmlFor="email" className="block text-sm font-medium">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            className="mt-1 w-full rounded border border-gray-300 p-2"
          />
        </div>
        <div>
          <label htmlFor="password" className="block text-sm font-medium">
            Contraseña
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            className="mt-1 w-full rounded border border-gray-300 p-2"
          />
        </div>
        <button
          type="submit"
          className="w-full rounded bg-gray-900 px-4 py-2 font-medium text-white hover:bg-gray-700"
        >
          Entrar
        </button>
      </form>
    </main>
  );
}
