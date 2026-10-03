-- ============================================================
-- Roles y perfiles de usuario (Supabase Auth)
-- Roles de R1: 'empleado' y 'admin'.
-- El perfil se crea automáticamente al registrarse un usuario.
-- Helpers usados por las políticas RLS de otras tablas.
-- ============================================================

-- ---------- ENUM de rol ----------
CREATE TYPE rol_usuario_enum AS ENUM ('empleado', 'admin');

-- ---------- TABLA: perfiles ----------
-- 1:1 con auth.users. Guarda el rol del empleado del mostrador.
CREATE TABLE perfiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nombre TEXT,
  rol rol_usuario_enum NOT NULL DEFAULT 'empleado',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TRIGGER trg_perfiles_updated_at
  BEFORE UPDATE ON perfiles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------- Alta automática de perfil al crear usuario ----------
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.perfiles (id, nombre, rol)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'nombre', NEW.email),
    COALESCE((NEW.raw_user_meta_data ->> 'rol')::rol_usuario_enum, 'empleado')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ---------- Helpers de rol para RLS ----------
-- Rol del usuario autenticado actual.
CREATE OR REPLACE FUNCTION rol_actual()
RETURNS rol_usuario_enum
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT rol FROM public.perfiles WHERE id = auth.uid();
$$;

-- ¿El usuario autenticado es admin?
CREATE OR REPLACE FUNCTION es_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.perfiles WHERE id = auth.uid() AND rol = 'admin'
  );
$$;

-- ¿El usuario autenticado tiene un perfil (empleado o admin)?
CREATE OR REPLACE FUNCTION es_staff()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.perfiles WHERE id = auth.uid()
  );
$$;

-- ---------- RLS de perfiles ----------
ALTER TABLE perfiles ENABLE ROW LEVEL SECURITY;

-- Cada usuario puede leer su propio perfil; los admin ven todos.
CREATE POLICY perfiles_select ON perfiles
  FOR SELECT TO authenticated
  USING (id = auth.uid() OR es_admin());

-- Cada usuario puede actualizar su propio nombre (no su rol vía app:
-- el cambio de rol se hace con service role o por un admin).
CREATE POLICY perfiles_update_propio ON perfiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Los admin pueden actualizar cualquier perfil (incluido el rol).
CREATE POLICY perfiles_update_admin ON perfiles
  FOR UPDATE TO authenticated
  USING (es_admin())
  WITH CHECK (es_admin());
