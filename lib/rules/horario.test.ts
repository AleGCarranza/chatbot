import { describe, it, expect } from "vitest";
import {
  esHoraNocturna,
  estaFueraDeHorario,
  overrideDesdeFlag,
  horaDe,
  HORA_CIERRE,
  HORA_APERTURA,
} from "./horario";

describe("horario: esHoraNocturna", () => {
  it("20:00 (cierre) es nocturno", () => {
    expect(esHoraNocturna(HORA_CIERRE)).toBe(true);
  });

  it("de 20 a 23 es nocturno", () => {
    expect(esHoraNocturna(20)).toBe(true);
    expect(esHoraNocturna(23)).toBe(true);
  });

  it("de 0 a 7 es nocturno", () => {
    expect(esHoraNocturna(0)).toBe(true);
    expect(esHoraNocturna(7)).toBe(true);
  });

  it("8:00 (apertura) NO es nocturno", () => {
    expect(esHoraNocturna(HORA_APERTURA)).toBe(false);
  });

  it("horario diurno (8 a 19) no es nocturno", () => {
    expect(esHoraNocturna(8)).toBe(false);
    expect(esHoraNocturna(12)).toBe(false);
    expect(esHoraNocturna(19)).toBe(false);
  });

  it("lanza con horas inválidas", () => {
    expect(() => esHoraNocturna(24)).toThrow();
    expect(() => esHoraNocturna(-1)).toThrow();
    expect(() => esHoraNocturna(8.5)).toThrow();
  });
});

describe("horario: estaFueraDeHorario con override", () => {
  it("auto usa el reloj", () => {
    expect(estaFueraDeHorario({ hora: 22, override: "auto" })).toBe(true);
    expect(estaFueraDeHorario({ hora: 10, override: "auto" })).toBe(false);
  });

  it("sin override explícito, por defecto es auto", () => {
    expect(estaFueraDeHorario({ hora: 23 })).toBe(true);
    expect(estaFueraDeHorario({ hora: 9 })).toBe(false);
  });

  it("forzar_cerrado manda sobre el reloj", () => {
    expect(estaFueraDeHorario({ hora: 10, override: "forzar_cerrado" })).toBe(
      true
    );
  });

  it("forzar_abierto manda sobre el reloj", () => {
    expect(estaFueraDeHorario({ hora: 23, override: "forzar_abierto" })).toBe(
      false
    );
  });
});

describe("horario: overrideDesdeFlag", () => {
  it("flag activo => forzar_cerrado", () => {
    expect(overrideDesdeFlag(true)).toBe("forzar_cerrado");
  });

  it("flag inactivo => auto", () => {
    expect(overrideDesdeFlag(false)).toBe("auto");
  });
});

describe("horario: horaDe", () => {
  it("extrae la hora local de un Date", () => {
    const d = new Date(2026, 0, 1, 21, 30, 0);
    expect(horaDe(d)).toBe(21);
    expect(esHoraNocturna(horaDe(d))).toBe(true);
  });
});
