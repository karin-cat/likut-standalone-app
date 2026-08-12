import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { normalizeCategory } from "@/lib/types";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const rows = await sql`SELECT * FROM categories WHERE id = ${id}`;
  if (!rows[0]) return NextResponse.json({ error: "קטגוריה לא נמצאה" }, { status: 404 });
  return NextResponse.json(normalizeCategory(rows[0]));
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();

  const name = String(body.name || "").trim();
  if (!name) {
    return NextResponse.json({ error: "יש להזין שם קטגוריה" }, { status: 400 });
  }

  const icon_url = body.icon_url ? String(body.icon_url).trim() : null;
  const color = body.color ? String(body.color).trim() : null;

  try {
    const rows = await sql`
      UPDATE categories
      SET name = ${name}, icon_url = ${icon_url}, color = ${color}, updated_at = now()
      WHERE id = ${id}
      RETURNING *
    `;

    if (!rows[0]) return NextResponse.json({ error: "קטגוריה לא נמצאה" }, { status: 404 });
    return NextResponse.json(normalizeCategory(rows[0]));
  } catch (error: unknown) {
    const err = error as { code?: string };
    if (err.code === "23505") {
      return NextResponse.json({ error: "שם קטגוריה זה כבר קיים" }, { status: 400 });
    }
    throw error;
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // כאשר מוחקים קטגוריה, המוצרים המחוברים לה יקבלו category_id = NULL
  await sql`DELETE FROM categories WHERE id = ${id}`;
  return NextResponse.json({ ok: true });
}
