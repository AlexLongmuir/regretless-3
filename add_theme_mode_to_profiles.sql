-- Add theme_mode column to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS theme_mode text NOT NULL DEFAULT 'system' 
CHECK (theme_mode IN ('light', 'dark', 'system'));

-- Add comment to document the column
COMMENT ON COLUMN profiles.theme_mode IS 'User theme preference: light, dark, or system (follows device settings)';
