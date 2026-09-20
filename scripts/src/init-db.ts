import { initPostgresTables } from "@workspace/db";

async function main() {
  console.log("Initializing Drishti PostgreSQL Database Schema...");
  const success = await initPostgresTables();
  if (success) {
    console.log("Database initialized successfully!");
  } else {
    console.log("Database initialization finished with fallback or warning.");
  }
  process.exit(0);
}

main().catch((err) => {
  console.error("Database initialization script failed:", err);
  process.exit(1);
});
