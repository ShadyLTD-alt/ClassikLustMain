ALTER TABLE "mediaUploads" ALTER COLUMN "categories" SET DEFAULT '[]'::jsonb;--> statement-breakpoint
ALTER TABLE "players" ALTER COLUMN "points" SET DATA TYPE integer;