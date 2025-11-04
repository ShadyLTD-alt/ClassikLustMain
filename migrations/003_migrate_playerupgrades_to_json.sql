-- Migration: Convert playerUpgrades from multi-row to single JSON row per player
-- 📦 This migration safely converts old upgrade data to new JSON structure

-- Step 1: Create backup of existing data (if table exists)
DO $$ 
BEGIN
    -- Check if old playerUpgrades table exists with old structure
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'playerUpgrades' 
        AND column_name = 'upgradeId'
    ) THEN
        -- Create backup table
        CREATE TABLE IF NOT EXISTS playerUpgrades_backup AS 
        SELECT * FROM "playerUpgrades";
        
        RAISE NOTICE 'Created backup table: playerUpgrades_backup';
        
        -- Migrate data to JSON format
        CREATE TEMP TABLE temp_json_upgrades AS
        SELECT 
            "playerId",
            json_object_agg("upgradeId", "level") as upgrades,
            max("updatedAt") as "updatedAt"
        FROM "playerUpgrades"
        WHERE "level" > 0
        GROUP BY "playerId";
        
        -- Drop old table structure
        DROP TABLE "playerUpgrades";
        
        RAISE NOTICE 'Migrated existing data to JSON format';
    END IF;
END $$;

-- Step 2: Create new playerUpgrades table with JSON structure
CREATE TABLE IF NOT EXISTS "playerUpgrades" (
    "id" VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    "playerId" VARCHAR NOT NULL,
    "upgrades" JSONB DEFAULT '{}' NOT NULL,
    "updatedAt" TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Step 3: Add foreign key constraint
ALTER TABLE "playerUpgrades" 
ADD CONSTRAINT "playerUpgrades_playerId_players_id_fk" 
FOREIGN KEY ("playerId") REFERENCES "players"("id") ON DELETE CASCADE;

-- Step 4: Add unique constraint (1 row per player)
ALTER TABLE "playerUpgrades" 
ADD CONSTRAINT "playerUpgrades_playerId_unique" 
UNIQUE ("playerId");

-- Step 5: Create indexes for performance
CREATE INDEX IF NOT EXISTS "playerUpgrades_playerId_idx" ON "playerUpgrades" ("playerId");
CREATE INDEX IF NOT EXISTS "playerUpgrades_upgrades_gin_idx" ON "playerUpgrades" USING GIN ("upgrades");

-- Step 6: Restore migrated data (if backup exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'temp_json_upgrades') THEN
        INSERT INTO "playerUpgrades" ("playerId", "upgrades", "updatedAt")
        SELECT "playerId", "upgrades"::jsonb, "updatedAt"
        FROM temp_json_upgrades
        ON CONFLICT ("playerId") DO UPDATE SET
            "upgrades" = EXCLUDED."upgrades",
            "updatedAt" = EXCLUDED."updatedAt";
        
        DROP TABLE temp_json_upgrades;
        RAISE NOTICE 'Restored migrated data to new table structure';
    END IF;
END $$;

-- Step 7: Verify migration
DO $$
DECLARE
    player_count INTEGER;
    upgrade_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO player_count FROM "playerUpgrades";
    SELECT SUM(jsonb_array_length(jsonb_object_keys("upgrades"))) INTO upgrade_count FROM "playerUpgrades";
    
    RAISE NOTICE 'Migration completed: % players with % total upgrades', player_count, COALESCE(upgrade_count, 0);
END $$;

-- Success message
SELECT 'PlayerUpgrades migration completed successfully!' as status;