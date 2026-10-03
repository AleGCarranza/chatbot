"use client";

import { useEffect, useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { TicketAtencion } from "@/lib/types";
import { agruparTickets } from "@/lib/panel/presentacion";
import { TarjetaTicket } from "./TarjetaTicket";

interface Props {
  ticketsIniciales: TicketAtencion[];
  terminal: string;
}

export function PanelTickets({ ticketsIniciales, terminal }: Props) {
  const [tickets, setTickets] = useState<TicketAtencion[]>(ticketsIniciales);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();

    const canal = supabase
      .channel("tickets-panel")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tickets_atencion" },
        (payload) => {
          setTickets((prev) => aplicarCambio(prev, payload));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(canal);
    };
  }, []);

  const grupos = useMemo(() => agruparTickets(tickets), [tickets]);

  return (
    <div className="space-y-6">
      <Grupo titulo="🟢 Pagados nocturnos" items={grupos.pagadosNocturnos} terminal={terminal} />
      <Grupo titulo="🟠 Validar comprobante" items={grupos.validacionPago} terminal={terminal} />
      <Grupo titulo="🟡 Pausados (pago en caja)" items={grupos.pausados} terminal={terminal} />
      <Grupo titulo="⚠️ Incompletos (nocturnos)" items={grupos.incompletos} terminal={terminal} />
      <Grupo titulo="🔵 Activos" items={grupos.activos} terminal={terminal} />
      <Grupo titulo="✅ Cerrados" items={grupos.cerrados} terminal={terminal} vacioOculto />
    </div>
  );
}

function Grupo({
  titulo,
  items,
  terminal,
  vacioOculto,
}: {
  titulo: string;
  items: TicketAtencion[];
  terminal: string;
  vacioOculto?: boolean;
}) {
  if (vacioOculto && items.length === 0) return null;
  return (
    <section>
      <h2 className="mb-2 text-sm font-semibold text-gray-600">
        {titulo} <span className="text-gray-400">({items.length})</span>
      </h2>
      {items.length === 0 ? (
        <p className="text-xs text-gray-400">Sin tickets.</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((t) => (
            <TarjetaTicket key={t.id} ticket={t} terminal={terminal} />
          ))}
        </div>
      )}
    </section>
  );
}

/** Aplica un cambio Realtime (INSERT/UPDATE/DELETE) a la lista local. */
function aplicarCambio(
  prev: TicketAtencion[],
  payload: {
    eventType: "INSERT" | "UPDATE" | "DELETE";
    new: Partial<TicketAtencion> | null;
    old: Partial<TicketAtencion> | null;
  }
): TicketAtencion[] {
  if (payload.eventType === "DELETE") {
    const id = payload.old?.id;
    return prev.filter((t) => t.id !== id);
  }

  const fila = payload.new as TicketAtencion | null;
  if (!fila?.id) return prev;

  const existe = prev.some((t) => t.id === fila.id);
  if (existe) {
    return prev.map((t) => (t.id === fila.id ? { ...t, ...fila } : t));
  }
  return [fila, ...prev];
}
