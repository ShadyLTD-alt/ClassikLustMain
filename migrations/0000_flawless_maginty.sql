CREATE TABLE "characters" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"unlockLevel" integer NOT NULL,
	"description" text NOT NULL,
	"rarity" text NOT NULL,
	"defaultImage" text,
	"avatarImage" text,
	"displayImage" text,
	"isHidden" boolean DEFAULT false NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "levels" (
	"level" integer PRIMARY KEY NOT NULL,
	"experienceRequired" integer NOT NULL,
	"requirements" jsonb NOT NULL,
	"unlocks" text[] NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "playerCharacters" (
	"id" varchar PRIMARY KEY NOT NULL,
	"playerId" varchar NOT NULL,
	"characterId" text NOT NULL,
	"unlockedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "playerUpgrades" (
	"id" varchar PRIMARY KEY NOT NULL,
	"playerId" varchar NOT NULL,
	"upgradeId" text NOT NULL,
	"level" integer DEFAULT 0 NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "players" (
	"id" varchar PRIMARY KEY NOT NULL,
	"telegramId" text,
	"username" text NOT NULL,
	"points" integer DEFAULT 0 NOT NULL,
	"energy" integer DEFAULT 1000 NOT NULL,
	"maxEnergy" integer DEFAULT 1000 NOT NULL,
	"level" integer DEFAULT 1 NOT NULL,
	"experience" integer DEFAULT 0 NOT NULL,
	"passiveIncomeRate" integer DEFAULT 0 NOT NULL,
	"isAdmin" boolean DEFAULT false NOT NULL,
	"selectedCharacterId" text,
	"displayImage" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"lastLogin" timestamp DEFAULT now() NOT NULL,
	"lastEnergyUpdate" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "players_telegramId_unique" UNIQUE("telegramId")
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" varchar PRIMARY KEY NOT NULL,
	"playerId" varchar NOT NULL,
	"token" text NOT NULL,
	"expiresAt" timestamp NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "sessions_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "upgrades" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"type" text NOT NULL,
	"icon" text NOT NULL,
	"maxLevel" integer NOT NULL,
	"baseCost" integer NOT NULL,
	"costMultiplier" real NOT NULL,
	"baseValue" real NOT NULL,
	"valueIncrement" real NOT NULL,
	"isHidden" boolean DEFAULT false NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "playerCharacters" ADD CONSTRAINT "playerCharacters_playerId_players_id_fk" FOREIGN KEY ("playerId") REFERENCES "public"."players"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "playerCharacters" ADD CONSTRAINT "playerCharacters_characterId_characters_id_fk" FOREIGN KEY ("characterId") REFERENCES "public"."characters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "playerUpgrades" ADD CONSTRAINT "playerUpgrades_playerId_players_id_fk" FOREIGN KEY ("playerId") REFERENCES "public"."players"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "playerUpgrades" ADD CONSTRAINT "playerUpgrades_upgradeId_upgrades_id_fk" FOREIGN KEY ("upgradeId") REFERENCES "public"."upgrades"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_playerId_players_id_fk" FOREIGN KEY ("playerId") REFERENCES "public"."players"("id") ON DELETE cascade ON UPDATE no action;