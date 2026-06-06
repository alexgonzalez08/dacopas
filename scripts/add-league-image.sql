-- Agregar imagen opcional a torneos
ALTER TABLE leagues ADD COLUMN IF NOT EXISTS image_url TEXT NULL;

-- Bucket para imágenes de torneos (correr en Supabase Storage o via SQL)
INSERT INTO storage.buckets (id, name, public)
VALUES ('league-images', 'league-images', true)
ON CONFLICT (id) DO NOTHING;

-- Política: cualquiera puede leer
CREATE POLICY "league_images_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'league-images');

-- Política: usuario autenticado puede subir
CREATE POLICY "league_images_insert" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'league-images' AND auth.role() = 'authenticated');

-- Política: dueño puede actualizar/eliminar
CREATE POLICY "league_images_update" ON storage.objects
  FOR UPDATE USING (bucket_id = 'league-images' AND auth.uid()::text = (storage.foldername(name))[1]);
