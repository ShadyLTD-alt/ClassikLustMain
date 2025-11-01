
import { defineConfig } from "drizzle-kit";

if (!process.env.SUPABASE_URL) {
  throw new Error("SUPABASE_URL must be set for database migrations");
}

// Extract the project reference from the Supabase URL
const projectRef = process.env.SUPABASE_URL.split('//')[1]?.split('.')[0];

// Construct the database URL for Drizzle migrations
// You'll need to set SUPABASE_DB_PASSWORD in your secrets
const databaseUrl = process.env.DATABASE_URL || 
  `postgresql://postgres.${projectRef}:${process.env.SUPABASE_DB_PASSWORD}@aws-0-us-east-1.pooler.supabase.com:5432/postgres`;

export default defineConfig({
  out: "./migrations",
  schema: "./shared/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: databaseUrl,
  },
});
