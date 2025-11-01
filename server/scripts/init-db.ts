import { syncAllGameData } from "../utils/dataLoader";

async function initDatabase() {
  console.log("🔄 Initializing database with game data from JSON files...");
  console.log("This will load all upgrades, characters, and levels into the database.\n");

  try {
    await syncAllGameData();
    console.log("\n✅ Database initialization complete!");
    console.log("You can now start the application.");
    process.exit(0);
  } catch (error) {
    console.error("\n❌ Database initialization failed:");
    console.error(error);
    process.exit(1);
  }
}

initDatabase();
