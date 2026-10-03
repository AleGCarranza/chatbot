import { requireStaff } from "@/lib/auth";
import { logoutAction } from "@/app/login/actions";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { leerFlags } from "@/lib/config/flags";
import type { TicketAtencion } from "@/lib/types";
import { PanelTickets } from "./PanelTickets";
import { BarraAdmin } from "./BarraAdmin";

export const dynamic = "force-dynamic";

export default async function PanelPage({
  searchParams,
}: {
  searchParams: Promise<{ terminal?: string }>;
}) {
  // Guarda de ruta: exige sesión con perfil de staff.
  const perfil = await requireStaff();
  const { terminal: terminalParam } = await searchParams;
  const terminal = terminalParam ?? "T1";

  // Carga inicial de tickets (server-side, respeta RLS).
  const supabase = await createSupabaseServerClient();
  const { data: ticketsIniciales } = await supabase
    .from("tickets_atencion")
    .select("*")
    .order("created_at", { ascending: false });

  const flags = await leerFlags();

  return (
    <main className="mx-auto max-w-5xl p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Panel de Mostrador</h1>
          <p className="text-sm text-gray-600">
            {perfil.nombre ?? "staff"} · rol {perfil.rol} · terminal {terminal}
          </p>
        </div>
        <form action={logoutAction}>
          <button
            type="submit"
            className="rounded border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-100"
          >
            Cerrar sesión
          </button>
        </form>
      </div>

      {perfil.rol === "admin" ? (
        <div className="mt-4">
          <BarraAdmin
            moduloTramitesActivo={flags.moduloTramitesActivo}
            fueraDeHorarioActivo={flags.fueraDeHorarioActivo}
          />
        </div>
      ) : null}

      <div className="mt-6">
        <PanelTickets
          ticketsIniciales={(ticketsIniciales ?? []) as TicketAtencion[]}
          terminal={terminal}
        />
      </div>
    </main>
  );
}
