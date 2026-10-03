-- ============================================================
-- RLS mínima por rol para las tablas de negocio.
-- Roles: empleado / admin (ver 0002_roles_perfiles.sql).
--
-- Reglas:
--  - clientes:              lectura/escritura para staff autenticado.
--  - tickets_atencion:      lectura/escritura para staff autenticado.
--  - configuracion_sistema: lectura para staff; escritura solo admin
--                           (feature flags y override de horario).
--
-- El webhook/backend usa la service role key, que OMITE RLS, por lo
-- que la ingesta de mensajes no depende de estas políticas.
-- ============================================================

-- ---------- clientes ----------
ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;

CREATE POLICY clientes_select_staff ON clientes
  FOR SELECT TO authenticated
  USING (es_staff());

CREATE POLICY clientes_insert_staff ON clientes
  FOR INSERT TO authenticated
  WITH CHECK (es_staff());

CREATE POLICY clientes_update_staff ON clientes
  FOR UPDATE TO authenticated
  USING (es_staff())
  WITH CHECK (es_staff());

CREATE POLICY clientes_delete_admin ON clientes
  FOR DELETE TO authenticated
  USING (es_admin());

-- ---------- tickets_atencion ----------
ALTER TABLE tickets_atencion ENABLE ROW LEVEL SECURITY;

CREATE POLICY tickets_select_staff ON tickets_atencion
  FOR SELECT TO authenticated
  USING (es_staff());

CREATE POLICY tickets_insert_staff ON tickets_atencion
  FOR INSERT TO authenticated
  WITH CHECK (es_staff());

CREATE POLICY tickets_update_staff ON tickets_atencion
  FOR UPDATE TO authenticated
  USING (es_staff())
  WITH CHECK (es_staff());

CREATE POLICY tickets_delete_admin ON tickets_atencion
  FOR DELETE TO authenticated
  USING (es_admin());

-- ---------- configuracion_sistema ----------
ALTER TABLE configuracion_sistema ENABLE ROW LEVEL SECURITY;

-- Todo el staff puede leer los flags / estado de horario.
CREATE POLICY config_select_staff ON configuracion_sistema
  FOR SELECT TO authenticated
  USING (es_staff());

-- Solo admin modifica flags y override de horario.
CREATE POLICY config_insert_admin ON configuracion_sistema
  FOR INSERT TO authenticated
  WITH CHECK (es_admin());

CREATE POLICY config_update_admin ON configuracion_sistema
  FOR UPDATE TO authenticated
  USING (es_admin())
  WITH CHECK (es_admin());

CREATE POLICY config_delete_admin ON configuracion_sistema
  FOR DELETE TO authenticated
  USING (es_admin());
