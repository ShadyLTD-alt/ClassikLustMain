-- Migration: Add LustGems and Boost System Fields
-- Date: 2025-11-02
-- Purpose: Add LustGems premium currency and boost tracking fields to players table

-- Add LustGems and boost fields to players table
ALTER TABLE players 
ADD COLUMN IF NOT EXISTS "lustGems" INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS "boostActive" BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS "boostMultiplier" DECIMAL(3,2) DEFAULT 1.00,
ADD COLUMN IF NOT EXISTS "boostExpiresAt" TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS "boostEnergy" INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS "totalTapsToday" INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS "totalTapsAllTime" INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS "lastDailyReset" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS "lastWeeklyReset" TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_players_lustgems ON players("lustGems");
CREATE INDEX IF NOT EXISTS idx_players_boost_expires ON players("boostExpiresAt") WHERE "boostActive" = true;
CREATE INDEX IF NOT EXISTS idx_players_taps_today ON players("totalTapsToday");

-- Add check constraints for data integrity
ALTER TABLE players 
ADD CONSTRAINT IF NOT EXISTS chk_lustgems_positive CHECK ("lustGems" >= 0),
ADD CONSTRAINT IF NOT EXISTS chk_boost_multiplier_valid CHECK ("boostMultiplier" >= 1.0 AND "boostMultiplier" <= 10.0),
ADD CONSTRAINT IF NOT EXISTS chk_boost_energy_valid CHECK ("boostEnergy" >= 0 AND "boostEnergy" <= 1024);

-- Update existing players with default values
UPDATE players 
SET 
    "lustGems" = COALESCE("lustGems", 0),
    "boostActive" = COALESCE("boostActive", false),
    "boostMultiplier" = COALESCE("boostMultiplier", 1.00),
    "boostEnergy" = COALESCE("boostEnergy", 0),
    "totalTapsToday" = COALESCE("totalTapsToday", 0),
    "totalTapsAllTime" = COALESCE("totalTapsAllTime", 0),
    "lastDailyReset" = COALESCE("lastDailyReset", NOW()),
    "lastWeeklyReset" = COALESCE("lastWeeklyReset", NOW())
WHERE "lustGems" IS NULL 
   OR "boostActive" IS NULL 
   OR "boostMultiplier" IS NULL;

-- Create boost purchases tracking table
CREATE TABLE IF NOT EXISTS boost_purchases (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "playerId" UUID REFERENCES players("id") ON DELETE CASCADE,
    "boostId" VARCHAR(50) NOT NULL,
    "cost" INTEGER NOT NULL,
    "effect" VARCHAR(100) NOT NULL,
    "duration" INTEGER NOT NULL, -- in minutes, 0 for instant
    "multiplier" DECIMAL(3,2) NOT NULL,
    "purchasedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    "expiresAt" TIMESTAMP WITH TIME ZONE
);

-- Indexes for boost_purchases
CREATE INDEX IF NOT EXISTS idx_boost_purchases_player ON boost_purchases("playerId");
CREATE INDEX IF NOT EXISTS idx_boost_purchases_expires ON boost_purchases("expiresAt") WHERE "expiresAt" IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_boost_purchases_purchased ON boost_purchases("purchasedAt");

-- View for active boosts
CREATE OR REPLACE VIEW active_boosts AS
SELECT 
    bp.*,
    p."username",
    CASE 
        WHEN bp."expiresAt" IS NULL THEN true  -- instant boosts
        WHEN bp."expiresAt" > NOW() THEN true
        ELSE false
    END as "isActive"
FROM boost_purchases bp
JOIN players p ON bp."playerId" = p."id"
WHERE bp."expiresAt" IS NULL OR bp."expiresAt" > NOW();

-- Function to clean up expired boosts (call periodically)
CREATE OR REPLACE FUNCTION cleanup_expired_boosts()
RETURNS INTEGER AS $$
DECLARE
    affected_rows INTEGER;
BEGIN
    -- Update players with expired boosts
    UPDATE players 
    SET 
        "boostActive" = false,
        "boostMultiplier" = 1.00,
        "boostExpiresAt" = NULL
    WHERE "boostActive" = true 
      AND "boostExpiresAt" IS NOT NULL 
      AND "boostExpiresAt" <= NOW();
    
    GET DIAGNOSTICS affected_rows = ROW_COUNT;
    
    RETURN affected_rows;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION cleanup_expired_boosts() IS 'Cleans up expired boost states from players table';

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON boost_purchases TO authenticated;
GRANT SELECT ON active_boosts TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_expired_boosts() TO service_role;