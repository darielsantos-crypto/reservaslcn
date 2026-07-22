/* Bucket exclusivo do sistema de Viagens. Não usa o bucket do Suprimentos. */
INSERT INTO storage.buckets (id, name, public)
VALUES ('travel-app-attachments', 'travel-app-attachments', false)
ON CONFLICT (id) DO UPDATE SET public = false;

DROP POLICY IF EXISTS "travel_app_storage_select" ON storage.objects;
CREATE POLICY "travel_app_storage_select"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'travel-app-attachments');

DROP POLICY IF EXISTS "travel_app_storage_insert" ON storage.objects;
CREATE POLICY "travel_app_storage_insert"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'travel-app-attachments');

DROP POLICY IF EXISTS "travel_app_storage_update" ON storage.objects;
CREATE POLICY "travel_app_storage_update"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'travel-app-attachments')
WITH CHECK (bucket_id = 'travel-app-attachments');

DROP POLICY IF EXISTS "travel_app_storage_delete" ON storage.objects;
CREATE POLICY "travel_app_storage_delete"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'travel-app-attachments');
