import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { select } from "@inquirer/prompts";
import { z } from "zod";
import { sql } from "drizzle-orm";
import { execSync } from "child_process";
import { mkdirSync, writeFileSync, existsSync } from "fs";
import { join } from "path";
import { createTestUsers } from "../src/server/db/mocks/createTestUsers";
import * as schema from "../src/server/db/schema";

// ================================
// HELPER FUNCTIONS
// ================================

const envSchema = z.object({
  DATABASE_URL: z.string(),
  DATABASE_TOKEN: z.string(),
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
});

const validatedEnv = envSchema.parse({
  DATABASE_URL: process.env.DATABASE_URL,
  DATABASE_TOKEN: process.env.DATABASE_TOKEN,
  NODE_ENV: process.env.NODE_ENV,
});

const client = createClient({
  url: validatedEnv.DATABASE_URL,
  authToken: validatedEnv.DATABASE_TOKEN,
});

export const dev_db = drizzle(client, { schema });

async function createTables() {
  // Ensure migration journal file exists before running db:generate
  const migrationsDir = join(process.cwd(), "src/server/db/_migrations");
  const metaDir = join(migrationsDir, "meta");
  const journalPath = join(metaDir, "_journal.json");

  if (!existsSync(journalPath)) {
    console.log("\n📝 Creating migration journal file...");
    mkdirSync(metaDir, { recursive: true });
    const journalContent = {
      version: "7",
      dialect: "turso",
      entries: [],
    };
    writeFileSync(
      journalPath,
      JSON.stringify(journalContent, null, 2) + "\n",
      "utf-8",
    );
    console.log(`   ✓ Created journal file at: ${journalPath}`);
  }

  try {
    console.log("\n📦 Running bun run db:generate...");
    execSync("bun run db:generate", { stdio: "inherit" });
  } catch {
    // db:generate may still fail, but that's OK - db:push will work
    console.log("\n⚠️  db:generate failed, continuing with db:push...");
  }
  console.log("\n🚀 Running bun run db:push...");
  execSync("bun run db:push", { stdio: "inherit" });
}

// ================================
// MAIN FUNCTIONS
// ================================
const mockDataPresets = [
  {
    name: "full",
    description: "Complete mock environment with test users",
    setup: async () => {
      await createTables();
      await createTestUsers();
    },
  },
  {
    name: "empty",
    description: "Only tables, no data",
    setup: async () => {
      await createTables();
    },
  },
  {
    name: "clean",
    description: "Clean database with no tables, for experimenting",
    setup: async () => {
      // Do nothing - tables will be dropped but not recreated
    },
  },
];

async function clearDatabase() {
  console.log("\n🗑️  Clearing database - dropping all tables...");

  // Get list of all tables
  const tablesResult = await dev_db.run(sql`
    SELECT name FROM sqlite_master 
    WHERE type='table' 
    AND name NOT LIKE 'sqlite_%'
    AND name NOT LIKE '_drizzle%'
  `);

  const tables = tablesResult.rows.map(
    (row) => (row as unknown as { name: string }).name,
  );

  if (tables.length === 0) {
    console.log("   ✓ Database is already empty");
    return;
  }

  // Drop all existing tables (including auth tables)
  for (const table of tables) {
    await dev_db.run(sql`DROP TABLE IF EXISTS ${sql.identifier(table)}`);
    console.log(`   ✓ Dropped table: ${table}`);
  }

  console.log(
    `\n✅ Cleared ${tables.length} table(s) including all auth users and data`,
  );
}

async function main() {
  if (validatedEnv.NODE_ENV !== "development") {
    console.error("❌ This script can only be run in development mode");
    process.exit(1);
  }

  while (true) {
    console.log("\n🗃️  Database Setup Tool");
    console.log("----------------------");

    // Let user select a preset
    const preset = await select({
      message: "Select a mock data preset:",
      choices: [
        ...mockDataPresets.map((p) => ({
          name: `${p.name} - ${p.description}`,
          value: p.name,
        })),
        { name: "Cancel - ❌ Cancel the setup ❌", value: "cancel" },
      ],
    });
    console.clear();

    if (preset === "cancel") {
      console.log("\n👋 Goodbye!");
      process.exit(0);
    }

    const selectedPreset = mockDataPresets.find((p) => p.name === preset);
    if (!selectedPreset) {
      console.error("❌ Invalid preset selected");
      process.exit(1);
    }

    // Always clear database first
    await clearDatabase();

    console.log("\n🔄 Setting up new database with preset:", preset);

    try {
      await selectedPreset.setup();
      console.log("\n✅ Database reset complete!");
      console.log("\n🔄 Relaunching setup tool...\n");
    } catch (error) {
      console.error("\n❌ Error during setup:", error);
      process.exit(1);
    }
  }
}

main().catch(console.error);
