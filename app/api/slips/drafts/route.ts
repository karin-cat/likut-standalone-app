import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { normalizeSlip } from "@/lib/types";

// רשימת תעודות ליקוט שלא הושלמו — ל"המשך ליקוט קיים" (זמין מכל מכשיר, כי נשמר בשרת)
export async function GET() {
  const rows = await sql`
    SELECT s.*, COALESCE(COUNT(si.id), 0)::int AS item_count
    FROM slips s
    LEFT JOIN slip_items si ON si.slip_id = s.id
    WHERE s.status = 'draft'
    GROUP BY s.id
    ORDER BY s.customer_name NULLS LAST, s.created_at DESC
  `;
  const drafts = rows.map((r) => ({ ...normalizeSlip(r), item_count: Number(r.item_count) }));
  return NextResponse.json(drafts);
}
