"use client";

import { useState, useTransition } from "react";
import type { TicketAtencion } from "@/lib/types";
import {
  etiquetaEstado,
  colorEstado,
  etiquetaFlujo,
  estaTomado,
} from "@/lib/panel/presentacion";
import { accionesPermitidas } from "@/lib/rules/antimerma";
import {
  tomarTicket,
  liberarTicket,
  confirmarPago,
  confirmarTotal,
  imprimirTicket,
  pausarTicket,
  completarTicket,
  cancelarTicket,
  obtenerUrlComprobante,
} from "./actions";

interface Props {
  ticket: TicketAtencion;
  terminal: string;
}

export function TarjetaTicket({ ticket, terminal }: Props) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [montoTotal, setMontoTotal] = useState("");

  const acciones = accionesPermitidas(
    ticket.estado,
    ticket.pago_confirmado ?? false
  );
  const tomado = estaTomado(ticket);
  const esMiTerminal = ticket.atendido_por_terminal === terminal;
  const operable = !tomado || esMiTerminal;

  // Total ya confirmado por un empleado (si existe en detalles_json).
  const detalles =
    ticket.detalles_json && typeof ticket.detalles_json === "object" && !Array.isArray(ticket.detalles_json)
      ? (ticket.detalles_json as Record<string, unknown>)
      : {};
  const totalConfirmado =
    typeof detalles.total === "number" ? detalles.total : null;

  // Mostrar el campo de "confirmar total" en impresiones con pago previo
  // que están en validación de pago y aún no tienen total asignado.
  const esImpresion =
    ticket.tipo_flujo === "impresion_estandar" ||
    ticket.tipo_flujo === "impresion_express";
  const requiereTotal =
    esImpresion &&
    ticket.estado === "pendiente_validacion_pago" &&
    totalConfirmado === null;

  function ejecutar(fn: () => Promise<{ ok: boolean; mensaje?: string }>) {
    setError(null);
    startTransition(async () => {
      const r = await fn();
      if (!r.ok) setError(r.mensaje ?? "Ocurrió un error.");
    });
  }

  async function verComprobante() {
    if (!ticket.comprobante_url) return;
    const url = await obtenerUrlComprobante(ticket.comprobante_url);
    if (url) window.open(url, "_blank", "noopener,noreferrer");
    else setError("No se pudo generar el enlace del comprobante.");
  }

  return (
    <div className="rounded-lg border border-gray-200 p-3 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="font-semibold">#{ticket.folio}</span>
        <span
          className={`rounded px-2 py-0.5 text-xs ${colorEstado(ticket.estado)}`}
        >
          {etiquetaEstado(ticket.estado)}
        </span>
      </div>

      <p className="mt-1 text-sm text-gray-700">
        {etiquetaFlujo(ticket.tipo_flujo)}
        {ticket.es_nocturno ? " · nocturno" : ""}
      </p>

      {tomado ? (
        <p className="mt-1 text-xs text-gray-500">
          Atendido por {ticket.atendido_por_usuario ?? "?"} (
          {ticket.atendido_por_terminal})
        </p>
      ) : null}

      {totalConfirmado !== null ? (
        <p className="mt-1 text-xs text-gray-600">
          Total confirmado: ${totalConfirmado.toFixed(2)} MXN
        </p>
      ) : null}

      {error ? (
        <p role="alert" className="mt-2 text-xs text-red-600">
          {error}
        </p>
      ) : null}

      {operable && requiereTotal ? (
        <div className="mt-3 flex items-center gap-2">
          <input
            type="number"
            min="0"
            step="0.01"
            placeholder="Total $"
            value={montoTotal}
            onChange={(e) => setMontoTotal(e.target.value)}
            className="w-24 rounded border border-gray-300 px-2 py-1 text-xs"
          />
          <button
            disabled={pending}
            onClick={() => {
              const n = Number(montoTotal);
              if (!(n > 0)) {
                setError("Ingresa un total válido.");
                return;
              }
              ejecutar(() => confirmarTotal(ticket.id, n));
            }}
            className="rounded bg-indigo-600 px-2 py-1 text-xs text-white disabled:opacity-50"
          >
            Confirmar total
          </button>
        </div>
      ) : null}

      <div className="mt-3 flex flex-wrap gap-2">
        {!tomado ? (
          <button
            disabled={pending}
            onClick={() => ejecutar(() => tomarTicket(ticket.id, terminal))}
            className="rounded bg-gray-900 px-2 py-1 text-xs text-white disabled:opacity-50"
          >
            Tomar
          </button>
        ) : null}

        {operable && acciones.puedeConfirmarPago && totalConfirmado !== null ? (
          <button
            disabled={pending}
            onClick={() => ejecutar(() => confirmarPago(ticket.id))}
            className="rounded bg-green-600 px-2 py-1 text-xs text-white disabled:opacity-50"
          >
            Confirmar pago
          </button>
        ) : null}

        {operable && acciones.puedeImprimir ? (
          <button
            disabled={pending}
            onClick={() => ejecutar(() => imprimirTicket(ticket.id))}
            className="rounded bg-blue-600 px-2 py-1 text-xs text-white disabled:opacity-50"
          >
            Imprimir
          </button>
        ) : null}

        {operable && ticket.estado === "en_proceso" ? (
          <>
            <button
              disabled={pending}
              onClick={() => ejecutar(() => pausarTicket(ticket.id))}
              className="rounded bg-yellow-500 px-2 py-1 text-xs text-white disabled:opacity-50"
            >
              Pausar
            </button>
            <button
              disabled={pending}
              onClick={() => ejecutar(() => completarTicket(ticket.id))}
              className="rounded bg-gray-700 px-2 py-1 text-xs text-white disabled:opacity-50"
            >
              Completar
            </button>
          </>
        ) : null}

        {ticket.comprobante_url ? (
          <button
            disabled={pending}
            onClick={verComprobante}
            className="rounded border border-gray-300 px-2 py-1 text-xs disabled:opacity-50"
          >
            Ver comprobante
          </button>
        ) : null}

        {operable && tomado ? (
          <button
            disabled={pending}
            onClick={() => ejecutar(() => liberarTicket(ticket.id))}
            className="rounded border border-gray-300 px-2 py-1 text-xs disabled:opacity-50"
          >
            Liberar
          </button>
        ) : null}

        {operable ? (
          <button
            disabled={pending}
            onClick={() => ejecutar(() => cancelarTicket(ticket.id))}
            className="rounded border border-red-300 px-2 py-1 text-xs text-red-600 disabled:opacity-50"
          >
            Cancelar
          </button>
        ) : null}
      </div>
    </div>
  );
}
