-- Migration: Replace icon column with image_url in areas table
-- Date: 2025-01-XX
-- Description: Replaces emoji-based icon column with image_url for storing AI-generated figurine images

-- Add new image_url column
ALTER TABLE areas 
ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Migrate existing icon data (keep as fallback for now, can be removed later)
-- For now, we'll keep the icon column but it will be deprecated
-- Existing emoji icons can remain as fallback until all areas have image_url

-- Add comment for clarity
COMMENT ON COLUMN areas.icon IS 'DEPRECATED: Use image_url instead. Kept for backward compatibility.';
COMMENT ON COLUMN areas.image_url IS 'URL to AI-generated figurine image for this area';

-- Note: We're not dropping the icon column yet to maintain backward compatibility
-- It can be removed in a future migration once all areas have image_url populated
