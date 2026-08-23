import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

// אותיות/ספרות בלי תווים מבלבלים (0/O, 1/I) — קל יותר להקריא/להעתיק ידנית
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function randomCode(length = 6): string {
  let code = "";
  for (let i = 0; i < length; i++) {
    code += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return code;
}

export async function GET() {
  for (let attempt = 0; attempt < 10; attempt++) {
    const code = randomCode();
    const existing = await sql`SELECT id FROM slips WHERE order_number = ${code}`;
    if (existing.length === 0) {
      return NextResponse.json({ order_number: code });
    }
  }
  return NextResponse.json({ error: "לא ניתן היה ליצור מספר הזמנה ייחודי, נסי שוב" }, { status: 500 });
}
