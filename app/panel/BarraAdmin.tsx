"use client";

import { useState, useTransition } from "react";
import { toggleModuloTramites, toggleFueraDeHorario } from "./actions";

interface Props {
  moduloTramitesActivo: boolean;
  fueraDeHorarioActivo: boolean;
}

export function BarraAdmin({
  moduloTramitesActivo,
  fueraDeHorarioActivo,
}: Props) {
  const [pending, startTransition] = useTransition();
  const [tramites, setTramites] = useState(moduloTramitesActivo);
  const [nocturno, setNocturno] = useState(fueraDeHorarioActivo);

  return (
    <section className="rounded-lg border border-purple-200 bg-purple-50 p-4">
      <h2 className="text-sm font-semibold text-purple-800">
        Controles de administrador
      </h2>
      <div className="mt-3 flex flex-wrap gap-6">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={tramites}
            disabled={pending}
            onChange={(e) => {
              const v = e.target.checked;
              setTramites(v);
              startTransition(async () => {
                const r = await toggleModuloTramites(v);
                if (!r.ok) setTramites(!v);
              });
            }}
          />
          Módulo de trámites activo
        </label>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={nocturno}
            disabled={pending}
            onChange={(e) => {
              const v = e.target.checked;
              setNocturno(v);
              startTransition(async () => {
                const r = await toggleFueraDeHorario(v);
                if (!r.ok) setNocturno(!v);
              });
            }}
          />
          Forzar fuera de horario (nocturno)
        </label>
      </div>
    </section>
  );
}
