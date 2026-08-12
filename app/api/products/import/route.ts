import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

interface ImportRow {
  name: string;
  sku?: string;
  category?: string;
  price?: number;
}

export async function POST(request: Request) {
  const body = await request.json();
  const rows: ImportRow[] = Array.isArray(body.rows) ? body.rows : [];
  if (rows.length === 0) {
    return NextResponse.json({ error: "אין שורות לייבוא" }, { status: 400 });
  }

  let inserted = 0;
  for (const r of rows) {
    const name = String(r.name || "").trim();
    if (!name) continue;
    const sku = r.sku ? String(r.sku).trim() : null;
    const category = r.category ? String(r.category).trim() : null;
    const price = Number(r.price) || 0;
    await sql`
      INSERT INTO products (
        name, sku, category, unit, price, pricing_type, sale_price, is_on_sale,
        sold_by_weight, requires_cleaning
      )
      VALUES (
        ${name}, ${sku}, ${category}, 'unit', ${price}, 'unit', NULL, FALSE,
        FALSE, FALSE
      )
    `;
    inserted++;
  }

  return NextResponse.json({ ok: true, inserted });
}
