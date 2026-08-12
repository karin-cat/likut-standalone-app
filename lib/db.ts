import { neon } from "@neondatabase/serverless";

/**
 * חיבור למסד הנתונים (Neon Postgres).
 * DATABASE_URL מוגדר כמשתנה סביבה — לא נכתב בקוד בשום מקום.
 */
function getConnectionString(): string {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL אינו מוגדר. יש להגדיר משתנה סביבה עם מחרוזת החיבור של Neon."
    );
  }
  return url;
}

// sql`...` — תבנית מתויגת, כל ערך מוכנס בצורה בטוחה (parameterized), לא פגיע ל-SQL Injection.
export const sql = neon(getConnectionString());
