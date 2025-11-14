# 🗃️ Steven's Database Schema - For Luna's Reference

## 📋 **Schema Overview**

Steven's database uses **CONSISTENT camelCase** throughout ALL identifiers:
- Tables: `camelCase` (players, boostPurchases)
- Columns: `camelCase` (playerId, boostActive) 
- Constraints: `camelCase` (players_pkey)
- No snake_case, no quoted identifiers, no spaces!

---

## 🎮 **Game Tables**

### **players** (Main user data)
```sql
CREATE TABLE public.players (
  id character varying NOT NULL,
  telegramId text UNIQUE,
  username text NOT NULL,
  points integer NOT NULL DEFAULT 0,
  energy integer NOT NULL DEFAULT 1000,
  maxEnergy integer NOT NULL DEFAULT 1000,
  level integer NOT NULL DEFAULT 1,
  experience integer NOT NULL DEFAULT 0,
  passiveIncomeRate integer NOT NULL DEFAULT 0,
  isAdmin boolean NOT NULL DEFAULT false,
  selectedCharacterId text,
  selectedImageId text,
  displayImage text,
  upgrades jsonb NOT NULL DEFAULT '{}'::jsonb,
  unlockedCharacters jsonb NOT NULL DEFAULT '[]'::jsonb,
  createdAt timestamp without time zone NOT NULL DEFAULT now(),
  lastLogin timestamp without time zone NOT NULL DEFAULT now(),
  lastEnergyUpdate timestamp without time zone NOT NULL DEFAULT now(),
  -- NEW LUSTGEMS & BOOST FIELDS
  lustGems integer DEFAULT 0 CHECK ("lustGems" >= 0),
  boostActive boolean DEFAULT false,
  boostMultiplier numeric DEFAULT 1.00 CHECK ("boostMultiplier" >= 1.0 AND "boostMultiplier" <= 10.0),
  boostExpiresAt timestamp with time zone,
  boostEnergy integer DEFAULT 0 CHECK ("boostEnergy" >= 0 AND "boostEnergy" <= 1024),
  totalTapsToday integer DEFAULT 0,
  totalTapsAllTime integer DEFAULT 0,
  lastDailyReset timestamp with time zone DEFAULT now(),
  lastWeeklyReset timestamp with time zone DEFAULT now(),
  CONSTRAINT players_pkey PRIMARY KEY (id)
);
```

### **boostPurchases** (Premium boost tracking)
```sql
CREATE TABLE public.boostPurchases (
  id character varying NOT NULL DEFAULT gen_random_uuid(),
  playerId character varying,
  expiresAt timestamp with time zone,
  createdAt timestamp with time zone DEFAULT now(),
  metadata jsonb DEFAULT '{}'::jsonb,
  CONSTRAINT boostPurchases_pkey PRIMARY KEY (id),
  CONSTRAINT boostPurchases_playerId_fkey FOREIGN KEY (playerId) REFERENCES public.players(id)
);
```

### **upgrades** (Game upgrades configuration)
```sql
CREATE TABLE public.upgrades (
  id text NOT NULL,
  name text NOT NULL,
  description text NOT NULL,
  type text NOT NULL,
  icon text NOT NULL,
  maxLevel integer NOT NULL,
  baseCost integer NOT NULL,
  costMultiplier real NOT NULL,
  baseValue real NOT NULL,
  valueIncrement real NOT NULL,
  isHidden boolean NOT NULL DEFAULT false,
  createdAt timestamp without time zone NOT NULL DEFAULT now(),
  CONSTRAINT upgrades_pkey PRIMARY KEY (id)
);
```

### **characters** (Game characters)
```sql
CREATE TABLE public.characters (
  id text NOT NULL,
  name text NOT NULL,
  unlockLevel integer NOT NULL,
  description text NOT NULL,
  rarity text NOT NULL,
  defaultImage text,
  avatarImage text,
  displayImage text,
  isHidden boolean NOT NULL DEFAULT false,
  createdAt timestamp without time zone NOT NULL DEFAULT now(),
  CONSTRAINT characters_pkey PRIMARY KEY (id)
);
```

### **levels** (Level progression)
```sql
CREATE TABLE public.levels (
  level integer NOT NULL,
  cost integer NOT NULL DEFAULT 100,
  experienceRequired integer,
  requirements jsonb NOT NULL DEFAULT '[]'::jsonb,
  unlocks jsonb NOT NULL DEFAULT '[]'::jsonb,
  createdAt timestamp without time zone NOT NULL DEFAULT now(),
  CONSTRAINT levels_pkey PRIMARY KEY (level)
);
```

---

## 🔗 **Relationship Tables**

### **playerUpgrades** (Player's upgrade levels)
```sql
CREATE TABLE public.playerUpgrades (
  id character varying NOT NULL,
  playerId character varying NOT NULL,
  upgradeId text NOT NULL,
  type text,
  level integer NOT NULL DEFAULT 0,
  updatedAt timestamp without time zone NOT NULL DEFAULT now(),
  CONSTRAINT playerUpgrades_pkey PRIMARY KEY (id),
  CONSTRAINT playerUpgrades_playerId_players_id_fk FOREIGN KEY (playerId) REFERENCES public.players(id),
  CONSTRAINT playerUpgrades_upgradeId_upgrades_id_fk FOREIGN KEY (upgradeId) REFERENCES public.upgrades(id)
);
```

### **playerCharacters** (Unlocked characters)
```sql
CREATE TABLE public.playerCharacters (
  id character varying NOT NULL,
  playerId character varying NOT NULL,
  characterId text NOT NULL,
  unlockedAt timestamp without time zone NOT NULL DEFAULT now(),
  CONSTRAINT playerCharacters_pkey PRIMARY KEY (id),
  CONSTRAINT playerCharacters_playerId_players_id_fk FOREIGN KEY (playerId) REFERENCES public.players(id),
  CONSTRAINT playerCharacters_characterId_characters_id_fk FOREIGN KEY (characterId) REFERENCES public.characters(id)
);
```

### **mediaUploads** (Character images/media)
```sql
CREATE TABLE public.mediaUploads (
  id text NOT NULL DEFAULT gen_random_uuid(),
  characterId text NOT NULL,
  url text NOT NULL,
  type text NOT NULL DEFAULT 'character'::text,
  unlockLevel integer NOT NULL DEFAULT 1,
  categories jsonb NOT NULL DEFAULT '[]'::jsonb,
  poses jsonb NOT NULL DEFAULT '[]'::jsonb,
  isHidden boolean NOT NULL DEFAULT false,
  chatEnable boolean NOT NULL DEFAULT false,
  chatSendPercent integer NOT NULL DEFAULT 0,
  createdAt timestamp without time zone NOT NULL DEFAULT now(),
  updatedAt timestamp without time zone NOT NULL DEFAULT now(),
  CONSTRAINT mediaUploads_pkey PRIMARY KEY (id),
  CONSTRAINT mediaUploads_characterId_characters_id_fk FOREIGN KEY (characterId) REFERENCES public.characters(id)
);
```

---

## 🔐 **Auth Tables**

### **sessions** (Authentication tokens)
```sql
CREATE TABLE public.sessions (
  id character varying NOT NULL,
  playerId character varying NOT NULL,
  token text NOT NULL UNIQUE,
  expiresAt timestamp without time zone NOT NULL,
  createdAt timestamp without time zone NOT NULL DEFAULT now(),
  CONSTRAINT sessions_pkey PRIMARY KEY (id),
  CONSTRAINT sessions_playerId_players_id_fk FOREIGN KEY (playerId) REFERENCES public.players(id)
);
```

### **playerLevelUps** (Level progression tracking)
```sql
CREATE TABLE public.playerLevelUps (
  id character varying NOT NULL,
  playerId character varying NOT NULL,
  level integer NOT NULL,
  unlockedAt timestamp without time zone NOT NULL DEFAULT now(),
  source text,
  CONSTRAINT playerLevelUps_pkey PRIMARY KEY (id),
  CONSTRAINT playerLevelUps_playerId_players_id_fk FOREIGN KEY (playerId) REFERENCES public.players(id)
);
```

---

## 🎯 **Key Points for Luna:**

1. **EVERYTHING is camelCase** - no exceptions!
2. **JSONB fields** store complex data (upgrades, requirements, unlocks, categories)
3. **Foreign keys** properly link related data
4. **Check constraints** ensure data integrity (lustGems >= 0, boostMultiplier 1.0-10.0)
5. **Timestamps** track creation/updates consistently
6. **UUID generation** via gen_random_uuid() where needed

## 🔍 **Important Notes:**
- `players.upgrades` is JSONB storing upgrade levels: `{"upgradeId": level}`
- `players.unlockedCharacters` is JSONB array: `["characterId1", "characterId2"]`
- `levels.requirements` and `levels.unlocks` are JSONB arrays
- `mediaUploads.categories` and `mediaUploads.poses` are JSONB arrays

**This schema represents Steven's EXACT database structure exported directly from Supabase!**