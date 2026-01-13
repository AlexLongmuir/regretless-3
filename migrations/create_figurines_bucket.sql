-- Migration: Create figurines storage bucket
-- Date: 2025-01-XX
-- Description: Creates storage bucket for figurine images (custom and precreated)

-- Create figurines bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('figurines', 'figurines', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for figurines
-- Users can upload their own custom figurines
CREATE POLICY IF NOT EXISTS figurines_insert_own ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'figurines' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Users can view their own custom figurines
CREATE POLICY IF NOT EXISTS figurines_select_own ON storage.objects
  FOR SELECT USING (
    bucket_id = 'figurines' AND (
      -- Own custom figurines
      auth.uid()::text = (storage.foldername(name))[1] OR
      -- Precreated figurines (public read)
      (storage.foldername(name))[1] = 'precreated'
    )
  );

-- Users can delete their own custom figurines
CREATE POLICY IF NOT EXISTS figurines_delete_own ON storage.objects
  FOR DELETE USING (
    bucket_id = 'figurines' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Note: Precreated figurines should be uploaded via service role
-- They are stored in figurines/precreated/ path
