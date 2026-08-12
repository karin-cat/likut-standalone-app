import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { sql } from "./db";

export const SESSION_COOKIE = "likut_session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 90; // 90 יום — טאבלט עבודה, לא צריך התחברות תכופה
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 5;

function getSessionSecret(): Uint8Array {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error(
      "SESSION_SECRET אינו מוגדר (או קצר מדי). יש להגדיר משתנה סביבה עם מחרוזת אקראית ארוכה."
    );
  }
  return new TextEncoder().encode(secret);
}

// ── יצירה/אימות של עוגיית session (JWT חתום) ──────────────────────────────

export async function createSessionToken(): Promise<string> {
  return await new SignJWT({ ok: true })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE_SECONDS}s`)
    .sign(getSessionSecret());
}

export async function verifySessionToken(token: string): Promise<boolean> {
  try {
    await jwtVerify(token, getSessionSecret());
    return true;
  } catch {
    return false;
  }
}

export const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: SESSION_MAX_AGE_SECONDS,
};

// ── אימות ביטוי משותף + חסימה אחרי כשלונות ─────────────────────────────────

interface AuthRow {
  id: number;
  passphrase_hash: string;
  failed_attempts: number;
  locked_until: string | null;
}

export type VerifyResult =
  | { ok: true }
  | { ok: false; reason: "locked"; retryAfterSeconds: number }
  | { ok: false; reason: "wrong" }
  | { ok: false; reason: "not_configured" };

/**
 * בודק ביטוי מול ה-hash השמור. מטפל בנעילה אחרי MAX_FAILED_ATTEMPTS כשלונות —
 * זו ההגנה האמיתית (לא רק אורך הביטוי).
 */
export async function verifyPassphrase(input: string): Promise<VerifyResult> {
  const rows = (await sql`SELECT id, passphrase_hash, failed_attempts, locked_until FROM app_auth WHERE id = 1`) as AuthRow[];
  const row = rows[0];
  if (!row) {
    return { ok: false, reason: "not_configured" };
  }

  if (row.locked_until) {
    const lockedUntil = new Date(row.locked_until).getTime();
    if (lockedUntil > Date.now()) {
      return {
        ok: false,
        reason: "locked",
        retryAfterSeconds: Math.ceil((lockedUntil - Date.now()) / 1000),
      };
    }
  }

  const matches = await bcrypt.compare(input, row.passphrase_hash);

  if (matches) {
    await sql`UPDATE app_auth SET failed_attempts = 0, locked_until = NULL WHERE id = 1`;
    return { ok: true };
  }

  const newFailedAttempts = row.failed_attempts + 1;
  if (newFailedAttempts >= MAX_FAILED_ATTEMPTS) {
    await sql`
      UPDATE app_auth
      SET failed_attempts = ${newFailedAttempts},
          locked_until = now() + (${LOCKOUT_MINUTES} || ' minutes')::interval
      WHERE id = 1
    `;
    return { ok: false, reason: "locked", retryAfterSeconds: LOCKOUT_MINUTES * 60 };
  }

  await sql`UPDATE app_auth SET failed_attempts = ${newFailedAttempts} WHERE id = 1`;
  return { ok: false, reason: "wrong" };
}

/** עוזר להגדרה חד-פעמית (scripts/setup-db.mjs) — לא בשימוש בזמן ריצה רגיל. */
export async function hashPassphrase(passphrase: string): Promise<string> {
  return await bcrypt.hash(passphrase, 12);
}
