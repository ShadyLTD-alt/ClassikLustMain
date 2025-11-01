ALTER TABLE "players" ALTER COLUMN "points" SET DATA TYPE numeric(10, 2);--> statement-breakpoint
ALTER TABLE "players" ALTER COLUMN "points" SET DEFAULT '0';--> statement-breakpoint
ALTER TABLE "players" ADD COLUMN "upgrades" jsonb DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE "players" ADD COLUMN "unlockedCharacters" jsonb DEFAULT '[]' NOT NULL;