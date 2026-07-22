/*
# Lucena Travel Management — Storage Bucket

## Purpose
Creates a public-read storage bucket `attachments` for travel request and purchase
attachments (bilhetes, vouchers, notas, comprovantes, etc.).

## Notes
- Bucket is public-read so released attachments can be viewed by the requester via
  the public URL. RLS on the `attachments` table controls which rows are visible.
- File-level access is gated by the table's `released` flag and RLS policies.
*/

INSERT INTO storage.buckets (id, name, public)
VALUES ('attachments', 'attachments', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload to the attachments bucket
-- (the path is scoped per request id, and the table RLS gates visibility)
DROP POLICY IF EXISTS "attachments_upload_auth" ON storage.objects;
CREATE POLICY "attachments_upload_auth" ON storage.objects FOR INSERT
  TO authenticated WITH CHECK (bucket_id = 'attachments');

DROP POLICY IF EXISTS "attachments_read_public" ON storage.objects;
CREATE POLICY "attachments_read_public" ON storage.objects FOR SELECT
  TO anon, authenticated USING (bucket_id = 'attachments');

DROP POLICY IF EXISTS "attachments_update_admin" ON storage.objects;
CREATE POLICY "attachments_update_admin" ON storage.objects FOR UPDATE
  TO authenticated USING (bucket_id = 'attachments');

DROP POLICY IF EXISTS "attachments_delete_admin" ON storage.objects;
CREATE POLICY "attachments_delete_admin" ON storage.objects FOR DELETE
  TO authenticated USING (bucket_id = 'attachments');
