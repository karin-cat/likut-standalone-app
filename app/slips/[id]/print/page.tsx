import { notFound } from "next/navigation";
import { sql } from "@/lib/db";
import PrintButton from "@/components/PrintButton";
import { computeItemPrice, normalizeSlip, normalizeSlipItem, round2 } from "@/lib/types";
import type { Slip, SlipItem } from "@/lib/types";

export const dynamic = "force-dynamic";

function fmt(n: number): string {
  return "₪" + n.toFixed(2);
}

function fmtQty(q: number, unit: string): string {
  const label = unit === "kg" ? 'ק"ג' : unit === "gram" ? "גרם" : "יח'";
  const rounded = Math.round(q * 1000) / 1000;
  const text = rounded % 1 === 0 ? String(rounded) : rounded.toFixed(3).replace(/0+$/, "").replace(/\.$/, "");
  return `${text} ${label}`;
}

async function getSlip(id: string): Promise<{ slip: Slip; items: SlipItem[] } | null> {
  const slipRows = await sql`SELECT * FROM slips WHERE id = ${id}`;
  if (!slipRows[0]) return null;
  const slip = normalizeSlip(slipRows[0]);
  const itemRows = await sql`SELECT * FROM slip_items WHERE slip_id = ${id} ORDER BY id ASC`;
  const items = itemRows.map(normalizeSlipItem);
  return { slip, items };
}

function Copy({ title, slip, items }: { title: string; slip: Slip; items: SlipItem[] }) {
  const total = round2(
    items.reduce((s, it) => s + computeItemPrice({
      unit: it.unit,
      qty: it.qty,
      unit_price: it.unit_price,
      line_total: it.line_total,
      actual_weight_for_billing: it.actual_weight_for_billing,
      status: it.status,
    }), 0)
  );
  const diff = slip.mode === "linked" && slip.original_total != null ? round2(total - Number(slip.original_total)) : null;
  const missingItems = items.filter((it) => it.status === "missing");

  return (
    <div className="print-copy border border-[var(--color-border)] rounded-xl p-5 mb-6 bg-white">
      <h2 className="text-lg font-bold mb-1">
        תעודת ליקוט #{slip.id} ({title})
      </h2>
      <div className="text-sm text-[var(--color-text-muted)] mb-3">
        {new Date(slip.created_at).toLocaleString("he-IL")}
      </div>

      <div className="text-sm mb-4 border-b border-[var(--color-border)] pb-3 flex flex-col gap-0.5">
        {slip.order_number && <div>מספר הזמנה: {slip.order_number}</div>}
        {slip.picker_name && <div>🧑‍💼 מלקט/ת: {slip.picker_name}</div>}
        <div>👤 לקוח/ה: {slip.customer_name || "כללי"}</div>
        {slip.customer_phone && <div>📞 {slip.customer_phone}</div>}
        {slip.customer_email && <div>📧 {slip.customer_email}</div>}
        {slip.customer_address_street && <div>🏘️ {slip.customer_address_street}</div>}
        {slip.customer_address_city && <div>🏙️ {slip.customer_address_city}</div>}
        {slip.customer_address && <div>📍 {slip.customer_address}</div>}
        {slip.shipping_method && (
          <div>
            🚚 {slip.shipping_method}
            {slip.shipping_method !== "איסוף עצמי" &&
              (slip.shipping_cost ? ` — ${fmt(Number(slip.shipping_cost))}` : " — חינם")}
          </div>
        )}
        {slip.delivery_date && <div>📅 {slip.delivery_date}</div>}
        {slip.note && <div>💬 {slip.note}</div>}
      </div>

      <table className="w-full text-sm border-collapse mb-3">
        <thead>
          <tr className="border-b-2 border-black">
            <th className="text-right py-1.5">מוצר</th>
            <th className="text-center py-1.5">כמות</th>
            <th className="text-left py-1.5">מחיר</th>
          </tr>
        </thead>
        <tbody>
          {items.map((it, i) => {
            const actualDisplay = it.status === "missing" ? "—" : (it.requires_cleaning && it.actual_weight_for_billing ? fmtQty(Number(it.actual_weight_for_billing), "kg") : fmtQty(Number(it.qty), it.unit));
            return (
              <tr key={it.id} className="border-b border-[var(--color-border)]">
                <td className="py-1.5 pr-1">
                  <div className="font-semibold">{i + 1}. {it.name}</div>
                  {it.status === "missing" && (
                    <div className="text-xs text-[var(--color-danger)] font-bold mt-1">
                      ✕ לא סופק{it.missing_reason ? ` — ${it.missing_reason}` : ""}
                    </div>
                  )}
                  {it.status !== "missing" && it.line_total != null && (
                    <div className="text-xs text-green-700 font-bold mt-1">💰 מחיר סופי קבוע</div>
                  )}
                  {it.status !== "missing" && it.requires_cleaning && (
                    <div className="text-xs text-[var(--color-text-muted)] mt-1 space-y-0.5 border-t border-[var(--color-border)] pt-1">
                      <div>⚖️ מחויב לפי משקל לפני ניקוי</div>
                      {it.actual_weight_for_billing != null && (
                        <div>📦 לחיוב: {fmtQty(Number(it.actual_weight_for_billing), "kg")}</div>
                      )}
                      {it.clean_weight != null && (
                        <div>🧽 אחרי ניקוי: {fmtQty(Number(it.clean_weight), "kg")}</div>
                      )}
                    </div>
                  )}
                  {it.note && (
                    <div className="text-xs text-amber-700 mt-1 border-t border-[var(--color-border)] pt-1">
                      📝 {it.note}
                    </div>
                  )}
                </td>
                <td className="text-center py-1.5">
                  {actualDisplay}
                </td>
                <td className="text-left py-1.5">
                  {it.status === "missing" ? "—" : fmt(computeItemPrice({
                    unit: it.unit,
                    qty: it.qty,
                    unit_price: it.unit_price,
                    line_total: it.line_total,
                    actual_weight_for_billing: it.actual_weight_for_billing,
                    status: it.status,
                  }))}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <table className="w-full text-sm">
        <tbody>
          {slip.mode === "linked" && slip.original_total != null && (
            <tr className="text-[var(--color-text-muted)]">
              <td className="py-1">מחיר הזמנה מקורי</td>
              <td className="text-left py-1">{fmt(Number(slip.original_total))}</td>
            </tr>
          )}
          {diff !== null && Math.abs(diff) > 0.005 && (
            <tr className="text-[var(--color-text-muted)]">
              <td className="py-1">התאמת מחיר למשקל בפועל</td>
              <td className="text-left py-1">
                {diff >= 0 ? "+" : ""}
                {fmt(diff)}
              </td>
            </tr>
          )}
          {missingItems.length > 0 && (
            <tr className="text-[var(--color-danger)] text-xs">
              <td className="py-1" colSpan={2}>
                ✕ {missingItems.length} פריט{missingItems.length > 1 ? "ים" : ""} לא סופקו
              </td>
            </tr>
          )}
          <tr className="font-bold text-lg border-t-2 border-black">
            <td className="py-2">סה&quot;כ לתשלום</td>
            <td className="text-left py-2">{fmt(total)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

export default async function SlipPrintPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await getSlip(id);
  if (!data) notFound();
  const { slip, items } = data;

  return (
    <div className="min-h-screen bg-[var(--color-bg-soft)]">
      <PrintButton backHref="/pos" />
      <div className="max-w-lg mx-auto p-4">
        <Copy title="עותק לעסק" slip={slip} items={items} />
        <Copy title="עותק ללקוח/ה" slip={slip} items={items} />
      </div>
    </div>
  );
}
