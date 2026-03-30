import { db } from "../server/db";
import { sql } from "drizzle-orm";

async function main() {
  try {
    console.log("Adding 'department' column to 'appointments' table...");
    await db.run(sql`ALTER TABLE appointments ADD COLUMN department text`);
    console.log("✅ Success!");
  } catch (e: any) {
    if (e.message && e.message.includes("duplicate column name")) {
      console.log("Column already exists. Skipping.");
    } else {
      console.error("Migration failed:", e);
    }
  }
  process.exit(0);
}

main();
