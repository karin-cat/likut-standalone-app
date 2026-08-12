import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { normalizeCategory } from "@/lib/types";

export async function GET() {
  const rows = await sql`SELECT * FROM categories ORDER BY name ASC`;
  return NextResponse.json(rows.map(normalizeCategory));
}

export async function POST(request: Request) {
  const body = await request.json();
  const name = String(body.name || "").trim();
  if (!name) {
    return NextResponse.json({ error: "יש להזין שם קטגוריה" }, { status: 400 });
  }

  const icon_url = body.icon_url ? String(body.icon_url).trim() : null;
  const color = body.color ? String(body.color).trim() : null;

  try {
    const rows = await sql`
      INSERT INTO categories (name, icon_url, color)
      VALUES (${name}, ${icon_url}, ${color})
      RETURNING *
    `;
    return NextResponse.json(normalizeCategory(rows[0]), { status: 201 });
  } catch (error: unknown) {
    const err = error as { code?: string };
    if (err.code === "23505") {
      // קטגוריה עם שם זה כבר קיימת
      return NextResponse.json({ error: "קטגוריה עם שם זה כבר קיימת" }, { status: 400 });
    }
    throw error;
  }
}
