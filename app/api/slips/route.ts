import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { computeItemPrice, normalizeSlip, round2 } from "@/lib/types";
import type { CartItem, SlipMode } from "@/lib/types";

export async function GET() {
  const rows = await sql`SELECT * FROM slips ORDER BY created_at DESC LIMIT 300`;
  return NextResponse.json(rows.map(normalizeSlip));
}

export async function POST(request: Request) {
  const body = await request.json();
  const items: CartItem[] = Array.isArray(body.items) ? body.items : [];
  if (items.length === 0) {
    return NextResponse.json({ error: "אין פריטים בעגלה" }, { status: 400 });
  }

  const mode: SlipMode = body.mode === "linked" ? "linked" : "standalone";
  const order_number = body.order_number ? String(body.order_number).trim() : null;
  const customer_name = body.customer_name ? String(body.customer_name).trim() : null;
  const customer_phone = body.customer_phone ? String(body.customer_phone).trim() : null;
  const customer_email = body.customer_email ? String(body.customer_email).trim() : null;
  const customer_address_street = body.customer_address_street ? String(body.customer_address_street).trim() : null;
  const customer_address_city = body.customer_address_city ? String(body.customer_address_city).trim() : null;
  const customer_address = body.customer_address ? String(body.customer_address).trim() : null;
  const shipping_method = body.shipping_method ? String(body.shipping_method).trim() : null;
  const delivery_date = body.delivery_date ? String(body.delivery_date).trim() : null;
  const shipping_cost =
    body.shipping_cost !== undefined && body.shipping_cost !== null && body.shipping_cost !== ""
      ? Number(body.shipping_cost)
      : null;
  const note = body.note ? String(body.note).trim() : null;
  const original_total =
    mode === "linked" &&
    body.original_total !== undefined &&
    body.original_total !== null &&
    body.original_total !== ""
      ? Number(body.original_total)
      : null;

  // סה"כ בפועל = סכום הפריטים שנגבו בפועל (פריט "לא לוקט/חסר" נספר כ-0)
  const total = round2(
    items.reduce((sum, it) => sum + computeItemPrice({
      unit: it.unit,
      qty: it.qty,
      unit_price: it.unit_price,
      line_total: it.line_total,
      actual_weight_for_billing: it.actual_weight_for_billing,
      status: it.status,
    }), 0)
  );

  const slipRows = await sql`
    INSERT INTO slips
      (mode, order_number, customer_name, customer_phone, customer_email,
       customer_address_street, customer_address_city, customer_address, shipping_method,
       delivery_date, shipping_cost, note, original_total, total)
    VALUES
      (${mode}, ${order_number}, ${customer_name}, ${customer_phone}, ${customer_email},
       ${customer_address_street}, ${customer_address_city}, ${customer_address}, ${shipping_method},
       ${delivery_date}, ${shipping_cost}, ${note}, ${original_total}, ${total})
    RETURNING *
  `;
  const slip = normalizeSlip(slipRows[0]);

  for (const it of items) {
    const status = it.status === "missing" ? "missing" : "picked";
    await sql`
      INSERT INTO slip_items
        (slip_id, product_id, name, unit, qty, unit_price, line_total, note,
         requires_cleaning, ordered_weight, actual_weight_for_billing, clean_weight,
         status, missing_reason)
      VALUES
        (${slip.id}, ${it.product_id}, ${it.name}, ${it.unit}, ${it.qty}, ${it.unit_price},
         ${it.line_total}, ${it.note || null}, ${!!it.requires_cleaning}, ${it.ordered_weight || null},
         ${it.actual_weight_for_billing || null}, ${it.clean_weight || null},
         ${status}, ${status === "missing" ? it.missing_reason || null : null})
    `;
  }

  return NextResponse.json(slip, { status: 201 });
}
