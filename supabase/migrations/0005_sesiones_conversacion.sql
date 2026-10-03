-- ============================================================
-- Sesiones de conversación del bot (máquina de estados).
-- Guarda el paso actual de la conversación de cada cliente y los
-- datos acumulados hasta crear el ticket. 1 sesión activa por cliente.
-- ============================================================

CREATE TABLE sesiones_conversacion (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  cliente_id UUID REFERENCES clientes(id) ON DELETE CASCADE NOT NULL,
  -- Paso de la máquina de estados conversacional (string libre
  -- controlado por el motor en lib/flows). Ej: 'menu', 'impr_pago'.
  paso TEXT NOT NULL DEFAULT 'inicio',
  -- Datos acumulados durante la conversación (selección de flujo,
  -- especificaciones, método de pago, etc.) antes de crear el ticket.
  datos_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Una sola sesión activa por cliente (la conversación en curso).
CREATE UNIQUE INDEX idx_sesiones_cliente ON sesiones_conversacion (cliente_id);

CREATE TRIGGER trg_sesiones_updated_at
  BEFORE UPDATE ON sesiones_conversacion
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------- RLS ----------
-- Las sesiones las gestiona el backend (webhook) con service role,
-- que omite RLS. El staff puede leerlas desde el panel.
ALTER TABLE sesiones_conversacion ENABLE ROW LEVEL SECURITY;

CREATE POLICY sesiones_select_staff ON sesiones_conversacion
  FOR SELECT TO authenticated
  USING (es_staff());
