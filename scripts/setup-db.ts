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
import { seedQuestionTypes } from "../src/server/db/mocks/seed/question-types";
import { seedQuestionnaires } from "../src/server/db/mocks/seed/questionnaires";
import { seedSyntheticSessions } from "../src/server/db/mocks/seed/synthetic-sessions";

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
    description:
      "Complete mock environment with test users, questionnaires, and synthetic data",
    setup: async () => {
      await createTables();
      await createTestUsers();
      await seedQuestionTypes();
      await seedQuestionnaires();
      await seedSyntheticSessions();
    },
  },
  {
    name: "questionnaires",
    description: "Tables + questionnaires (no synthetic data)",
    setup: async () => {
      await createTables();
      await seedQuestionTypes();
      await seedQuestionnaires();
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

  try {
    // Disable foreign key constraints to allow dropping tables in any order
    // This is critical for SQLite to drop tables with foreign key dependencies
    await dev_db.run(sql`PRAGMA foreign_keys = OFF`);

    // First, delete all data from all tables to prevent constraint violations
    // This prevents CHECK constraint errors when dropping/recreating tables
    try {
      const allTablesResult = await dev_db.run(sql`
        SELECT name FROM sqlite_master 
        WHERE type='table' 
        AND name NOT LIKE 'sqlite_%'
        AND name NOT LIKE '_drizzle%'
      `);

      const allTables = allTablesResult.rows.map(
        (row) => (row as unknown as { name: string }).name,
      );

      if (allTables.length > 0) {
        for (const tableName of allTables) {
          try {
            const escapedName = tableName.replace(/"/g, '""');
            await dev_db.run(sql.raw(`DELETE FROM "${escapedName}"`));
          } catch {
            // Table might not exist or might be a view, ignore
          }
        }
        console.log(`   ✓ Cleaned data from ${allTables.length} table(s)`);
      }
    } catch {
      // Ignore cleanup errors
    }

    // Get list of all tables
    const tablesResult = await dev_db.run(sql`
      SELECT name FROM sqlite_master 
      WHERE type='table' 
      AND name NOT LIKE 'sqlite_%'
      AND name NOT LIKE '_drizzle%'
      ORDER BY name DESC
    `);

    const tables = tablesResult.rows.map(
      (row) => (row as unknown as { name: string }).name,
    );

    if (tables.length === 0) {
      console.log("   ✓ Database is already empty");
      // Re-enable foreign keys
      await dev_db.run(sql`PRAGMA foreign_keys = ON`);
      return;
    }

    // Drop all existing tables (including auth tables)
    // Use IF EXISTS to handle cases where tables don't exist
    // Drop in reverse order to minimize dependency issues
    let droppedCount = 0;
    for (const table of tables) {
      try {
        // Use sql.raw with proper escaping for table names
        // SQLite table names can be quoted with double quotes
        const tableName = table.replace(/"/g, '""');
        await dev_db.run(sql.raw(`DROP TABLE IF EXISTS "${tableName}"`));
        console.log(`   ✓ Dropped table: ${table}`);
        droppedCount++;
      } catch (error) {
        // Log warning but continue - table might already be dropped
        // or might have been dropped as a dependency
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        // Only warn if it's not a "no such table" error (which is expected)
        if (!errorMessage.includes("no such table")) {
          console.warn(`   ⚠️  Could not drop table ${table}: ${errorMessage}`);
        }
      }
    }

    // Clean up any remaining indexes that might reference dropped tables
    try {
      const indexesResult = await dev_db.run(sql`
        SELECT name FROM sqlite_master 
        WHERE type='index' 
        AND name NOT LIKE 'sqlite_%'
        AND name NOT LIKE '_drizzle%'
      `);

      const indexes = indexesResult.rows.map(
        (row) => (row as unknown as { name: string }).name,
      );

      for (const index of indexes) {
        try {
          const indexName = index.replace(/"/g, '""');
          await dev_db.run(sql.raw(`DROP INDEX IF EXISTS "${indexName}"`));
        } catch {
          // Ignore index drop errors
        }
      }
    } catch {
      // Ignore index cleanup errors
    }

    // Drop any remaining views or triggers
    try {
      await dev_db.run(sql`PRAGMA foreign_keys = OFF`);
      // Force drop any remaining constraints
      const allObjects = await dev_db.run(sql`
        SELECT name, type FROM sqlite_master 
        WHERE type IN ('table', 'index', 'trigger', 'view')
        AND name NOT LIKE 'sqlite_%'
        AND name NOT LIKE '_drizzle%'
      `);

      for (const obj of allObjects.rows) {
        const objData = obj as unknown as { name: string; type: string };
        const objName = objData.name;
        const objType = objData.type;
        try {
          const escapedName = objName.replace(/"/g, '""');
          if (objType === "table") {
            await dev_db.run(sql.raw(`DROP TABLE IF EXISTS "${escapedName}"`));
          } else if (objType === "index") {
            await dev_db.run(sql.raw(`DROP INDEX IF EXISTS "${escapedName}"`));
          } else if (objType === "trigger") {
            await dev_db.run(
              sql.raw(`DROP TRIGGER IF EXISTS "${escapedName}"`),
            );
          } else if (objType === "view") {
            await dev_db.run(sql.raw(`DROP VIEW IF EXISTS "${escapedName}"`));
          }
        } catch {
          // Ignore errors
        }
      }
    } catch {
      // Ignore cleanup errors
    }

    // Re-enable foreign key constraints
    await dev_db.run(sql`PRAGMA foreign_keys = ON`);

    console.log(
      `\n✅ Cleared ${droppedCount} of ${tables.length} table(s) including all auth users and data`,
    );
  } catch (error) {
    // Always re-enable foreign keys even if there's an error
    try {
      await dev_db.run(sql`PRAGMA foreign_keys = ON`);
    } catch {
      // Ignore errors when re-enabling
    }

    console.error("\n❌ Error clearing database:", error);
    throw error;
  }
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
