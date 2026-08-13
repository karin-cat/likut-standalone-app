#!/usr/bin/env node
/**
 * הגדרה חד-פעמית של מסד הנתונים ב-Neon:
 *  1. יוצר את הטבלאות (db/schema.sql)
 *  2. שומר hash של ביטוי הכניסה (לא את הביטוי עצמו)
 *
 * הרצה:
 *   node scripts/setup-db.mjs "הביטוי-שלי"
 *
 * דורש DATABASE_URL מוגדר ב-.env.local (או כמשתנה סביבה בטרמינל).
 */
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import bcrypt from "bcryptjs";
import { neon } from "@neondatabase/serverless";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

// טעינה ידנית פשוטה של .env.local (בלי תלות בחבילה חיצונית)
function loadEnvLocal() {
  const envPath = path.join(root, ".env.local");
  if (!existsSync(envPath)) return;
  const content = readFileSync(envPath, "utf-8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (!process.env[key]) process.env[key] = value;
  }
}

async function main() {
  loadEnvLocal();

  const passphrase = process.argv[2];
  if (!passphrase || passphrase.length < 4) {
    console.error('שימוש: node scripts/setup-db.mjs "הביטוי-שלך"');
    process.exit(1);
  }

  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl || dbUrl.includes("placeholder")) {
    console.error("DATABASE_URL אינו מוגדר כראוי ב-.env.local (מחרוזת החיבור האמיתית של Neon).");
    process.exit(1);
  }

  const sql = neon(dbUrl);

  console.log("יוצר טבלאות...");
  const rawSchema = readFileSync(path.join(root, "db", "schema.sql"), "utf-8");
  // הסרת הערות שורה (-- ...) מכל שורה לפני הפיצול — אחרת פקודה שיש לה הערה
  // מעליה/לצידה "נבלעת" בטעות יחד עם ההערה כשמסננים לפי "מתחיל ב-- ".
  const withoutComments = rawSchema
    .split("\n")
    .map((line) => {
      const idx = line.indexOf("--");
      return idx === -1 ? line : line.slice(0, idx);
    })
    .join("\n");
  // פיצול לפי ';' — כל פקודת CREATE בנפרד (הדרייבר של Neon לא תומך במספר פקודות בקריאה אחת)
  const statements = withoutComments
    .split(";")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  for (const stmt of statements) {
    await sql.query(stmt);
  }
  console.log("✓ טבלאות מוכנות.");

  // הרצת migration scripts אם קיימים
  console.log("מריץ migrations...");
  const migrationsDir = path.join(root, "db");
  const migrationFiles = [
    "migration-001.sql",
    "migration-002.sql",
    "migration-003.sql",
    "migration-004.sql",
  ];
  for (const migrationFile of migrationFiles) {
    const migrationPath = path.join(migrationsDir, migrationFile);
    if (existsSync(migrationPath)) {
      console.log(`  מריץ ${migrationFile}...`);
      const rawMigration = readFileSync(migrationPath, "utf-8");
      const migrationWithoutComments = rawMigration
        .split("\n")
        .map((line) => {
          const idx = line.indexOf("--");
          return idx === -1 ? line : line.slice(0, idx);
        })
        .join("\n");
      const migrationStatements = migrationWithoutComments
        .split(";")
        .map((s) => s.trim())
        .filter((s) => s.length > 0);
      for (const stmt of migrationStatements) {
        await sql.query(stmt);
      }
      console.log(`  ✓ ${migrationFile} בוצע בהצלחה.`);
    }
  }

  console.log("שומר את ביטוי הכניסה (מוצפן)...");
  const hash = await bcrypt.hash(passphrase, 12);
  await sql.query(
    `INSERT INTO app_auth (id, passphrase_hash, failed_attempts, locked_until)
     VALUES (1, $1, 0, NULL)
     ON CONFLICT (id) DO UPDATE SET passphrase_hash = $1, failed_attempts = 0, locked_until = NULL`,
    [hash]
  );
  console.log("✓ ביטוי הכניסה נשמר בהצלחה (כ-hash בלבד).");
  console.log("\nהכל מוכן! אפשר להיכנס לאפליקציה עם הביטוי שהוזן.");
}

main().catch((err) => {
  console.error("שגיאה:", err);
  process.exit(1);
});
