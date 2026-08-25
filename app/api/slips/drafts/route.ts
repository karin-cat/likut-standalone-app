import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { normalizeSlip } from "@/lib/types";

// רשימת תעודות ל"המשך ליקוט קיים" — טיוטות פתוחות וגם תעודות שכבר הופקו (ניתנות לעריכה מחדש).
// טיוטות מוצגות ראשונות, ואז תעודות שהופקו — כל קבוצה ממוינת מהחדש לישן.
export async function GET() {
  const rows = await sql`
    SELECT s.*, COALESCE(COUNT(si.id), 0)::int AS item_count
    FROM slips s
    LEFT JOIN slip_items si ON si.slip_id = s.id
    WHERE s.status IN ('draft', 'completed')
    GROUP BY s.id
    ORDER BY (s.status = 'draft') DESC, s.created_at DESC
  `;
  const drafts = rows.map((r) => ({ ...normalizeSlip(r), item_count: Number(r.item_count) }));
  return NextResponse.json(drafts);
}
