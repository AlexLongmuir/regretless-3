-- Add figurine_url column to profiles table for user-level figurine storage
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS figurine_url TEXT;

-- Add comment to document the column
COMMENT ON COLUMN public.profiles.figurine_url IS 'URL to user''s generated figurine image, stored at user level for use across all dreams';
