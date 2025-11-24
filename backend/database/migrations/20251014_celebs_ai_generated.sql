-- Celebrity and AI-generated dreams schema additions

-- celebrity_profiles (public read)
CREATE TABLE IF NOT EXISTS public.celebrity_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  image_url text,
  description text,
  category text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.celebrity_profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS celebrity_profiles_read_all ON public.celebrity_profiles;
CREATE POLICY celebrity_profiles_read_all ON public.celebrity_profiles
  FOR SELECT USING (true);

-- ai_generated_dreams (per-user)
CREATE TABLE IF NOT EXISTS public.ai_generated_dreams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  emoji text,
  source_type text NOT NULL CHECK (source_type IN ('celebrity','dreamboard')),
  source_data jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_generated_dreams ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ai_generated_dreams_select_own ON public.ai_generated_dreams;
CREATE POLICY ai_generated_dreams_select_own ON public.ai_generated_dreams
  FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS ai_generated_dreams_insert_own ON public.ai_generated_dreams;
CREATE POLICY ai_generated_dreams_insert_own ON public.ai_generated_dreams
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_ai_generated_dreams_user_created
  ON public.ai_generated_dreams(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_generated_dreams_source
  ON public.ai_generated_dreams(source_type);

-- Storage buckets
INSERT INTO storage.buckets (id, name, public)
VALUES ('celebrity-images', 'celebrity-images', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('dreamboard-images', 'dreamboard-images', false)
ON CONFLICT (id) DO NOTHING;

-- dreamboard per-user policies
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'dreamboard_insert_own' AND tablename = 'objects'
  ) THEN
    CREATE POLICY dreamboard_insert_own ON storage.objects
      FOR INSERT WITH CHECK (
        bucket_id = 'dreamboard-images' AND
        auth.uid()::text = (storage.foldername(name))[1]
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'dreamboard_select_own' AND tablename = 'objects'
  ) THEN
    CREATE POLICY dreamboard_select_own ON storage.objects
      FOR SELECT USING (
        bucket_id = 'dreamboard-images' AND
        auth.uid()::text = (storage.foldername(name))[1]
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'dreamboard_delete_own' AND tablename = 'objects'
  ) THEN
    CREATE POLICY dreamboard_delete_own ON storage.objects
      FOR DELETE USING (
        bucket_id = 'dreamboard-images' AND
        auth.uid()::text = (storage.foldername(name))[1]
      );
  END IF;
END$$;
