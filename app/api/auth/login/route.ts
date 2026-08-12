import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { SESSION_COOKIE, SESSION_COOKIE_OPTIONS, createSessionToken, verifyPassphrase } from "@/lib/auth";

export async function POST(request: Request) {
  let body: { passphrase?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "בקשה לא תקינה" }, { status: 400 });
  }

  const passphrase = (body.passphrase ?? "").trim();
  if (!passphrase) {
    return NextResponse.json({ error: "יש להזין ביטוי" }, { status: 400 });
  }

  let result;
  try {
    result = await verifyPassphrase(passphrase);
  } catch {
    // תקלת מסד נתונים (למשל Neon לא זמין רגעית) — תשובה ברורה במקום קריסה גולמית
    return NextResponse.json(
      { error: "בעיה זמנית בשרת — יש לנסות שוב בעוד רגע." },
      { status: 503 }
    );
  }

  if (result.ok) {
    const token = await createSessionToken();
    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE, token, SESSION_COOKIE_OPTIONS);
    return NextResponse.json({ ok: true });
  }

  if (result.reason === "locked") {
    const minutes = Math.ceil(result.retryAfterSeconds / 60);
    return NextResponse.json(
      { error: `יותר מדי ניסיונות שגויים. יש לנסות שוב בעוד כ-${minutes} דקות.` },
      { status: 429 }
    );
  }

  if (result.reason === "not_configured") {
    return NextResponse.json(
      { error: "האפליקציה עדיין לא הוגדרה (לא הוגדר ביטוי כניסה)." },
      { status: 500 }
    );
  }

  return NextResponse.json({ error: "ביטוי שגוי" }, { status: 401 });
}
