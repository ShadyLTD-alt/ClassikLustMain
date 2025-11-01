CREATE TABLE "mediaUploads" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"characterId" text NOT NULL,
	"url" text NOT NULL,
	"type" text DEFAULT 'character' NOT NULL,
	"unlockLevel" integer DEFAULT 1 NOT NULL,
	"categories" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"poses" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"isHidden" boolean DEFAULT false NOT NULL,
	"chatEnable" boolean DEFAULT false NOT NULL,
	"chatSendPercent" integer DEFAULT 0 NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "players" ADD COLUMN "selectedImageId" text;--> statement-breakpoint
ALTER TABLE "mediaUploads" ADD CONSTRAINT "mediaUploads_characterId_characters_id_fk" FOREIGN KEY ("characterId") REFERENCES "public"."characters"("id") ON DELETE cascade ON UPDATE no action;