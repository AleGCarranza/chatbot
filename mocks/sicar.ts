// ============================================================
// Mock/stub de Sicar (sistema de punto de venta).
// En R1 no hay integración real: estas funciones devuelven datos
// simulados y deterministas para cotización y facturación.
// La integración real se difiere a Release 2.
// ============================================================

export type TipoMarca = "economica" | "reconocida";

export interface PrecioSicar {
  producto: string;
  marca: TipoMarca;
  precioUnitario: number;
  moneda: "MXN";
  disponible: boolean;
}

export interface ClienteFiscalSicar {
  numeroCliente: string;
  razonSocial: string;
  rfc: string;
}

/**
 * Consulta de precio simulada. El precio depende del producto y de la
 * marca (económica más barata que reconocida). Determinista para tests.
 */
export async function consultarPrecioSicar(
  producto: string,
  marca: TipoMarca
): Promise<PrecioSicar> {
  const base = precioBasePorProducto(producto);
  const factor = marca === "reconocida" ? 1.6 : 1.0;
  const precioUnitario = Math.round(base * factor * 100) / 100;

  return {
    producto,
    marca,
    precioUnitario,
    moneda: "MXN",
    disponible: true,
  };
}

/**
 * Búsqueda de cliente fiscal simulada por número de cliente Sicar o RFC.
 * Devuelve null si no se encuentra (número que empieza por '0' o RFC
 * vacío) para poder probar la rama de "no encontrado".
 */
export async function buscarClienteFiscalSicar(params: {
  numeroCliente?: string;
  rfc?: string;
}): Promise<ClienteFiscalSicar | null> {
  const { numeroCliente, rfc } = params;

  if (numeroCliente && numeroCliente.trim() !== "") {
    if (numeroCliente.startsWith("0")) return null; // caso "no encontrado"
    return {
      numeroCliente,
      razonSocial: `Cliente ${numeroCliente}`,
      rfc: rfc && rfc.trim() !== "" ? rfc.toUpperCase() : "XAXX010101000",
    };
  }

  if (rfc && rfc.trim() !== "") {
    return {
      numeroCliente: `SICAR-${rfc.slice(0, 4).toUpperCase()}`,
      razonSocial: `Cliente ${rfc.toUpperCase()}`,
      rfc: rfc.toUpperCase(),
    };
  }

  return null;
}

/** Precio base pseudo-determinista a partir del nombre del producto. */
function precioBasePorProducto(producto: string): number {
  const normalizado = producto.trim().toLowerCase();
  // Suma de códigos de carácter -> precio base estable entre 20 y 120.
  let suma = 0;
  for (const ch of normalizado) suma += ch.charCodeAt(0);
  return 20 + (suma % 100);
}
