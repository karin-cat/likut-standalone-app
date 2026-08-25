import Link from "next/link";
import AppHeader from "@/components/AppHeader";
import { sql } from "@/lib/db";
import { normalizeSlip } from "@/lib/types";

export const dynamic = "force-dynamic";

function fmt(n: number): string {
  return "₪" + n.toFixed(2);
}

export default async function SlipsHistoryPage() {
  const rows = await sql`SELECT * FROM slips WHERE status = 'completed' ORDER BY created_at DESC LIMIT 300`;
  const slips = rows.map(normalizeSlip);

  return (
    <div className="min-h-screen flex flex-col">
      <AppHeader title="היסטוריית תעודות" backHref="/" />

      <div className="flex-1 overflow-y-auto">
        {slips.length === 0 ? (
          <div className="p-6 text-center text-[var(--color-text-muted)]">אין תעודות עדיין.</div>
        ) : (
          slips.map((s) => (
            <div
              key={s.id}
              className="flex items-center justify-between gap-2 px-4 py-3 border-b border-[var(--color-border)] bg-white"
            >
              <Link href={`/slips/${s.id}/print`} className="min-w-0 flex-1">
                <div className="font-semibold">
                  #{s.id} · {s.mode === "linked" ? `📋 הזמנה ${s.order_number || ""}` : "🧺 ליקוט עצמאי"}
                </div>
                <div className="text-xs text-[var(--color-text-muted)]">
                  {new Date(s.created_at).toLocaleString("he-IL")}
                  {s.customer_name ? ` · ${s.customer_name}` : ""}
                </div>
              </Link>
              <div className="font-bold shrink-0">{fmt(Number(s.total))}</div>
              <Link
                href={`/pos?resume=${s.id}`}
                className="shrink-0 text-sm font-bold text-[var(--color-brand-dark)] px-2 py-1"
              >
                ✏️ עריכה
              </Link>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
