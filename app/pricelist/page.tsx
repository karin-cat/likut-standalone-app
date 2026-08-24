import Link from "next/link";
import AppHeader from "@/components/AppHeader";
import PrintButton from "@/components/PrintButton";
import { sql } from "@/lib/db";
import { normalizeProduct } from "@/lib/types";
import type { Product } from "@/lib/types";

// נתוני מוצרים משתנים כל הזמן — לא ניתן לבנות מראש בזמן build, תמיד לרנדר בזמן בקשה.
export const dynamic = "force-dynamic";

function fmt(n: number): string {
  return "₪" + n.toFixed(2);
}

export default async function PriceListPage() {
  const rows = await sql`SELECT * FROM products ORDER BY category NULLS LAST, name ASC`;
  const products: Product[] = rows.map(normalizeProduct);

  const groups = new Map<string, Product[]>();
  for (const p of products) {
    const key = p.category || "ללא קטגוריה";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(p);
  }

  return (
    <div className="min-h-screen flex flex-col">
      <div className="no-print">
        <AppHeader title="מחירון" backHref="/" />
      </div>
      <PrintButton backHref="/" />

      <div className="no-print p-3">
        <a
          href="/api/pricelist/export"
          className="block text-center rounded-xl border border-[var(--color-border)] font-bold py-2.5"
        >
          ⬇️ הורדת קובץ (Excel/CSV)
        </a>
      </div>

      <div className="max-w-lg mx-auto w-full p-4">
        <h1 className="text-lg font-bold mb-1">מחירון</h1>
        <div className="text-sm text-[var(--color-text-muted)] mb-4">
          {new Date().toLocaleDateString("he-IL")} · {products.length} מוצרים
        </div>

        {products.length === 0 ? (
          <div className="text-center text-[var(--color-text-muted)] py-10">
            אין מוצרים עדיין.{" "}
            <Link href="/products" className="text-[var(--color-brand-dark)] font-bold">
              הוספת מוצרים
            </Link>
          </div>
        ) : (
          Array.from(groups.entries()).map(([cat, items]) => (
            <div key={cat} className="mb-5">
              <div className="font-bold text-[var(--color-brand-dark)] mb-1">{cat}</div>
              <table className="w-full text-sm border-collapse">
                <tbody>
                  {items.map((p) => (
                    <tr key={p.id} className="border-b border-[var(--color-border)]">
                      <td className="py-1.5">
                        {p.name}
                        {p.sku && <span className="text-xs text-[var(--color-text-muted)]"> · מק&quot;ט {p.sku}</span>}
                      </td>
                      <td className="py-1.5 text-left font-bold whitespace-nowrap">
                        <div>
                          {fmt(p.price)}{" "}
                          <span className="text-xs font-normal text-[var(--color-text-muted)]">
                            / {p.pricing_type === "weight" || (p.pricing_type === "package" && !p.package_fixed_price) ? 'ק"ג' : p.pricing_type === "package" ? "מארז" : "יח'"}
                          </span>
                        </div>
                        {p.sale_price && (
                          <div className="text-xs text-green-700 font-bold">
                            מבצע: {fmt(p.sale_price)} {p.is_on_sale && "✓"}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
