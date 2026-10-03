-- ============================================================
-- Comercializadora Chiquihuite — Mostrador & Chatbot (R1)
-- Migración inicial: enums, tablas, seed, índices y triggers.
-- ============================================================

-- ---------- ENUMS ----------
CREATE TYPE tipo_flujo_enum AS ENUM (
  'impresion_estandar',
  'impresion_express',
  'cotizacion',
  'facturacion',
  'tramite'
);

CREATE TYPE estado_ticket_enum AS ENUM (
  'pendiente_presencial',
  'pendiente_validacion_pago',
  'pagado_imprimir',
  'en_proceso',
  'completado',
  'cancelado',
  'fuera_horario_incompleto'
);

CREATE TYPE metodo_pago_enum AS ENUM (
  'efectivo_caja',
  'codi',
  'transferencia',
  'tarjeta_caja'
);

-- ---------- TABLA: clientes ----------
CREATE TABLE clientes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  telefono TEXT UNIQUE NOT NULL,
  nombre_whatsapp TEXT NOT NULL DEFAULT 'Cliente',
  nombre_confirmado TEXT,
  numero_cliente_sicar TEXT,
  rfc TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ---------- TABLA: configuracion_sistema ----------
CREATE TABLE configuracion_sistema (
  clave TEXT PRIMARY KEY,
  valor_boolean BOOLEAN DEFAULT FALSE,
  valor_texto TEXT,
  descripcion TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Seed de feature flags / estados globales
INSERT INTO configuracion_sistema (clave, valor_boolean, descripcion) VALUES
  ('modulo_tramites_activo', FALSE, 'Activa o desactiva el flujo de CURP/CFE/Actas'),
  ('fuera_de_horario_activo', FALSE, 'Indica si la tienda está en horario nocturno cerrado');

-- ---------- TABLA: tickets_atencion ----------
CREATE TABLE tickets_atencion (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  folio SERIAL,
  cliente_id UUID REFERENCES clientes(id) ON DELETE CASCADE NOT NULL,
  tipo_flujo tipo_flujo_enum NOT NULL,
  estado estado_ticket_enum DEFAULT 'pendiente_presencial' NOT NULL,
  metodo_pago metodo_pago_enum DEFAULT 'efectivo_caja',
  pago_confirmado BOOLEAN DEFAULT FALSE,
  comprobante_url TEXT,
  detalles_json JSONB DEFAULT '{}'::jsonb NOT NULL,
  atendido_por_terminal TEXT,
  atendido_por_usuario TEXT,
  es_nocturno BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ---------- ÍNDICES ----------
CREATE INDEX idx_tickets_estado ON tickets_atencion (estado);
CREATE INDEX idx_tickets_cliente ON tickets_atencion (cliente_id);
CREATE INDEX idx_tickets_nocturno ON tickets_atencion (es_nocturno);
CREATE INDEX idx_tickets_created_at ON tickets_atencion (created_at);
CREATE INDEX idx_clientes_telefono ON clientes (telefono);

-- ---------- TRIGGER: updated_at automático ----------
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_clientes_updated_at
  BEFORE UPDATE ON clientes
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_tickets_updated_at
  BEFORE UPDATE ON tickets_atencion
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_config_updated_at
  BEFORE UPDATE ON configuracion_sistema
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------- REALTIME ----------
-- Habilita la publicación de cambios de tickets_atencion para el panel multi-terminal.
ALTER PUBLICATION supabase_realtime ADD TABLE tickets_atencion;
