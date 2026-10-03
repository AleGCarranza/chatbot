-- ============================================================
-- Storage: bucket privado 'adjuntos-whatsapp'
-- Guarda comprobantes de pago y archivos a imprimir recibidos
-- por WhatsApp. Privado: solo backend (service role) y staff
-- autenticado pueden operar sobre los objetos.
-- ============================================================

-- Crea el bucket (idempotente).
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'adjuntos-whatsapp',
  'adjuntos-whatsapp',
  FALSE,
  52428800, -- 50 MB
  ARRAY[
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/pdf'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- ---------- Políticas de Storage ----------
-- Nota: el webhook sube archivos con la service role key, que omite RLS.
-- Estas políticas gobiernan el acceso del panel (usuarios autenticados).

-- El staff (empleado/admin) puede leer los adjuntos del bucket.
CREATE POLICY "adjuntos_select_staff"
  ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'adjuntos-whatsapp' AND es_staff());

-- El staff puede subir adjuntos (p.ej. desde el panel si hiciera falta).
CREATE POLICY "adjuntos_insert_staff"
  ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'adjuntos-whatsapp' AND es_staff());

-- Solo admin puede eliminar adjuntos.
CREATE POLICY "adjuntos_delete_admin"
  ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'adjuntos-whatsapp' AND es_admin());
