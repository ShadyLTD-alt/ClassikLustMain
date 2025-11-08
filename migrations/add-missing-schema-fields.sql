-- 📦 ClassikLust Database Migration
-- Date: 2025-11-07
-- Purpose: Add missing schema fields to match JSON-first player state

-- ===================================
-- 1. UPDATE PLAYERS TABLE
-- ===================================

-- Add missing player columns
ALTER TABLE players 
ADD COLUMN IF NOT EXISTS "lustPoints" INTEGER DEFAULT 0 NOT NULL;

ALTER TABLE players 
ADD COLUMN IF NOT EXISTS "lastTapValue" INTEGER DEFAULT 1 NOT NULL;

ALTER TABLE players 
ADD COLUMN IF NOT EXISTS "consecutiveDays" INTEGER DEFAULT 0 NOT NULL;

ALTER TABLE players 
ADD COLUMN IF NOT EXISTS "lpEarnedToday" INTEGER DEFAULT 0 NOT NULL;

ALTER TABLE players 
ADD COLUMN IF NOT EXISTS "upgradesPurchasedToday" INTEGER DEFAULT 0 NOT NULL;

ALTER TABLE players 
ADD COLUMN IF NOT EXISTS "claimedTasks" JSONB DEFAULT '[]'::jsonb NOT NULL;

ALTER TABLE players 
ADD COLUMN IF NOT EXISTS "claimedAchievements" JSONB DEFAULT '[]'::jsonb NOT NULL;

ALTER TABLE players 
ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP DEFAULT NOW() NOT NULL;

ALTER TABLE players 
ADD COLUMN IF NOT EXISTS "boostEndTime" TIMESTAMP;

-- Migrate existing data
UPDATE players 
SET "lustPoints" = COALESCE(points, 0)
WHERE "lustPoints" = 0;

UPDATE players
SET "updatedAt" = "createdAt"
WHERE "updatedAt" IS NULL;

-- ===================================
-- 2. UPDATE UPGRADES TABLE
-- ===================================

ALTER TABLE upgrades 
ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP DEFAULT NOW() NOT NULL;

UPDATE upgrades
SET "updatedAt" = "createdAt"
WHERE "updatedAt" IS NULL OR "updatedAt" < "createdAt";

-- ===================================
-- 3. UPDATE CHARACTERS TABLE
-- ===================================

ALTER TABLE characters 
ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP DEFAULT NOW() NOT NULL;

UPDATE characters
SET "updatedAt" = "createdAt"
WHERE "updatedAt" IS NULL OR "updatedAt" < "createdAt";

-- ===================================
-- 4. UPDATE LEVELS TABLE
-- ===================================

ALTER TABLE levels 
ADD COLUMN IF NOT EXISTS "xpRequired" INTEGER DEFAULT 100 NOT NULL;

ALTER TABLE levels 
ADD COLUMN IF NOT EXISTS "rewards" JSONB DEFAULT '{}'::jsonb NOT NULL;

ALTER TABLE levels 
ADD COLUMN IF NOT EXISTS "requirements" JSONB DEFAULT '{}'::jsonb NOT NULL;

ALTER TABLE levels 
ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP DEFAULT NOW() NOT NULL;

-- Migrate cost to xpRequired if xpRequired is 0
UPDATE levels
SET "xpRequired" = COALESCE(cost, 100)
WHERE "xpRequired" = 0 OR "xpRequired" IS NULL;

UPDATE levels
SET "updatedAt" = "createdAt"
WHERE "updatedAt" IS NULL OR "updatedAt" < "createdAt";

-- ===================================
-- 5. UPDATE TASKS TABLE (if exists)
-- ===================================

DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'tasks') THEN
    ALTER TABLE tasks ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP DEFAULT NOW() NOT NULL;
    
    UPDATE tasks
    SET "updatedAt" = "createdAt"
    WHERE "updatedAt" IS NULL OR "updatedAt" < "createdAt";
  END IF;
END $$;

-- ===================================
-- 6. UPDATE ACHIEVEMENTS TABLE (if exists)
-- ===================================

DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'achievements') THEN
    ALTER TABLE achievements ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP DEFAULT NOW() NOT NULL;
    
    UPDATE achievements
    SET "updatedAt" = "createdAt"
    WHERE "updatedAt" IS NULL OR "updatedAt" < "createdAt";
  END IF;
END $$;

-- ===================================
-- 7. VERIFICATION QUERIES
-- ===================================

-- Check players table columns
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'players'
ORDER BY ordinal_position;

-- Check for any players with NULL lustPoints
SELECT id, username, points, "lustPoints"
FROM players
WHERE "lustPoints" IS NULL OR "lustPoints" = 0;

-- Verify migration success
SELECT 
  'players' as table_name,
  COUNT(*) as total_rows,
  COUNT("lustPoints") as with_lustpoints,
  COUNT("updatedAt") as with_updated_at
FROM players
UNION ALL
SELECT 
  'upgrades' as table_name,
  COUNT(*) as total_rows,
  COUNT("updatedAt") as with_updated_at,
  0 as placeholder
FROM upgrades
UNION ALL
SELECT 
  'characters' as table_name,
  COUNT(*) as total_rows,
  COUNT("updatedAt") as with_updated_at,
  0 as placeholder
FROM characters;

-- ===================================
-- ✅ MIGRATION COMPLETE
-- ===================================

SELECT 'Migration completed successfully! All missing columns added.' as status;