import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { normalizeSlip } from "@/lib/types";
import type { CustomerType, PickerName, ShippingMethod } from "@/lib/types";

export async function GET() {
  const rows = await sql`SELECT * FROM slips WHERE status = 'completed' ORDER BY created_at DESC LIMIT 300`;
  return NextResponse.json(rows.map(normalizeSlip));
}

interface CreateSlipBody {
  order_number?: string | null;
  customer_type?: CustomerType;
  customer_name?: string | null;
  picker_name?: PickerName | "" | null;
  customer_phone?: string | null;
  customer_address_street?: string | null;
  customer_address_city?: string | null;
  shipping_method?: ShippingMethod | null;
  shipping_cost?: string | number | null;
  note?: string | null;
}

// יוצר תעודת ליקוט חדשה במצב "טיוטה" — נקרא מיד בתחילת הליקוט, לפני שנוספו פריטים.
export async function POST(request: Request) {
  const body: CreateSlipBody = await request.json();

  const order_number = body.order_number ? String(body.order_number).trim() : null;
  const customer_type = body.customer_type === "specific" ? "specific" : "general";
  const customer_name = customer_type === "specific" && body.customer_name ? String(body.customer_name).trim() : null;
  const picker_name = body.picker_name ? String(body.picker_name).trim() : null;
  const customer_phone = body.customer_phone ? String(body.customer_phone).trim() : null;
  const customer_address_street = body.customer_address_street ? String(body.customer_address_street).trim() : null;
  const customer_address_city = body.customer_address_city ? String(body.customer_address_city).trim() : null;
  const shipping_method =
    body.shipping_method === "pickup" ? "איסוף עצמי" : body.shipping_method === "delivery" ? "משלוח" : null;
  const shipping_cost =
    body.shipping_cost !== undefined && body.shipping_cost !== null && body.shipping_cost !== ""
      ? Number(body.shipping_cost)
      : null;
  const note = body.note ? String(body.note).trim() : null;

  try {
    const rows = await sql`
      INSERT INTO slips
        (mode, status, order_number, customer_name, picker_name,
         customer_phone, customer_address_street, customer_address_city,
         shipping_method, shipping_cost, note, total)
      VALUES
        ('standalone', 'draft', ${order_number}, ${customer_name}, ${picker_name},
         ${customer_phone}, ${customer_address_street}, ${customer_address_city},
         ${shipping_method}, ${shipping_cost}, ${note}, 0)
      RETURNING *
    `;
    return NextResponse.json(normalizeSlip(rows[0]), { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes("idx_slips_order_number_unique") || message.includes("duplicate key")) {
      return NextResponse.json({ error: "מספר ההזמנה הזה כבר קיים במערכת — נסי מספר אחר" }, { status: 409 });
    }
    return NextResponse.json({ error: "שגיאה ביצירת התעודה" }, { status: 500 });
  }
}
