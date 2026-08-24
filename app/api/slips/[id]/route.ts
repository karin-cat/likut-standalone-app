import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { computeItemPrice, normalizeSlip, normalizeSlipItem, round2 } from "@/lib/types";
import type { CartItem } from "@/lib/types";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const slipRows = await sql`SELECT * FROM slips WHERE id = ${id}`;
  if (!slipRows[0]) return NextResponse.json({ error: "תעודה לא נמצאה" }, { status: 404 });
  const slip = normalizeSlip(slipRows[0]);

  const itemRows = await sql`SELECT * FROM slip_items WHERE slip_id = ${id} ORDER BY id ASC`;
  const items = itemRows.map(normalizeSlipItem);

  return NextResponse.json({ ...slip, items });
}

interface UpdateSlipBody {
  items?: CartItem[];
  status?: "draft" | "completed";
  note?: string | null;
}

// מעדכן את פריטי התעודה (סנכרון שוטף בזמן ליקוט) ו/או מסמן כהושלמה בסיום.
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body: UpdateSlipBody = await request.json();

  const existing = await sql`SELECT id FROM slips WHERE id = ${id}`;
  if (!existing[0]) return NextResponse.json({ error: "תעודה לא נמצאה" }, { status: 404 });

  const items = Array.isArray(body.items) ? body.items : [];
  const total = round2(
    items.reduce(
      (sum, it) =>
        sum +
        computeItemPrice({
          unit: it.unit,
          qty: it.qty,
          unit_price: it.unit_price,
          line_total: it.line_total,
          actual_weight_for_billing: it.actual_weight_for_billing,
          status: it.status,
        }),
      0
    )
  );
  const status = body.status === "completed" ? "completed" : "draft";
  const note = body.note !== undefined ? (body.note ? String(body.note).trim() : null) : undefined;

  if (note !== undefined) {
    await sql`UPDATE slips SET total = ${total}, status = ${status}, note = ${note} WHERE id = ${id}`;
  } else {
    await sql`UPDATE slips SET total = ${total}, status = ${status} WHERE id = ${id}`;
  }

  // מסנכרן את הפריטים — מוחקים את הישנים ומכניסים מחדש (הדרך הפשוטה ביותר לשמור עקביות)
  await sql`DELETE FROM slip_items WHERE slip_id = ${id}`;
  for (const it of items) {
    const itemStatus = it.status === "missing" ? "missing" : "picked";
    await sql`
      INSERT INTO slip_items
        (slip_id, product_id, name, unit, qty, unit_price, line_total, note,
         requires_cleaning, ordered_weight, actual_weight_for_billing, clean_weight, unit_count,
         status, missing_reason)
      VALUES
        (${id}, ${it.product_id}, ${it.name}, ${it.unit}, ${it.qty}, ${it.unit_price},
         ${it.line_total}, ${it.note || null}, ${!!it.requires_cleaning}, ${it.ordered_weight || null},
         ${it.actual_weight_for_billing || null}, ${it.clean_weight || null}, ${it.unit_count ?? null},
         ${itemStatus}, ${itemStatus === "missing" ? it.missing_reason || null : null})
    `;
  }

  const slipRows = await sql`SELECT * FROM slips WHERE id = ${id}`;
  return NextResponse.json(normalizeSlip(slipRows[0]));
}

// מבטל תעודת טיוטה (למשל "ביטול" באמצע ליקוט) — הפריטים נמחקים אוטומטית (ON DELETE CASCADE)
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await sql`DELETE FROM slips WHERE id = ${id} AND status = 'draft'`;
  return NextResponse.json({ ok: true });
}
