"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AppHeader from "@/components/AppHeader";
import type { Product } from "@/lib/types";

function fmt(n: number): string {
  return "₪" + n.toFixed(2);
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // דפוס טעינה סטנדרטי (fetch + AbortController בניקוי) — לא לולאת רינדור אמיתית.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    const controller = new AbortController();
    const qs = search ? `?q=${encodeURIComponent(search)}` : "";
    fetch(`/api/products${qs}`, { signal: controller.signal })
      .then((r) => r.json())
      .then((data: Product[]) => setProducts(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [search]);

  return (
    <div className="min-h-screen flex flex-col">
      <AppHeader title="ניהול מוצרים" backHref="/" />

      <div className="p-3 bg-white border-b border-[var(--color-border)] flex flex-col gap-2">
        <input
          type="text"
          placeholder="🔍 חיפוש..."
          className="field-underline"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="flex gap-2">
          <Link
            href="/products/new"
            className="flex-1 text-center rounded-xl bg-[var(--color-brand)] text-white font-bold py-2.5"
          >
            ➕ מוצר חדש
          </Link>
          <Link
            href="/products/import"
            className="flex-1 text-center rounded-xl border border-[var(--color-border)] font-bold py-2.5"
          >
            📥 ייבוא מקובץ
          </Link>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="p-6 text-center text-[var(--color-text-muted)]">טוען...</div>
        ) : products.length === 0 ? (
          <div className="p-6 text-center text-[var(--color-text-muted)]">אין מוצרים עדיין.</div>
        ) : (
          products.map((p) => (
            <Link
              key={p.id}
              href={`/products/${p.id}`}
              className="flex items-center gap-3 px-4 py-3 border-b border-[var(--color-border)] bg-white"
            >
              {p.image_url && (
                <img
                  src={p.image_url}
                  alt={p.name}
                  className="w-12 h-12 object-cover rounded shrink-0"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
              )}
              <div className="min-w-0 flex-1">
                <div className="font-semibold truncate">{p.name}</div>
                <div className="text-xs text-[var(--color-text-muted)] flex gap-1">
                  {p.sku && <span>מק&quot;ט {p.sku}</span>}
                  {p.sku && p.category && <span>·</span>}
                  {p.category && <span>{p.category}</span>}
                  {!p.sku && !p.category && <span>ללא קטגוריה</span>}
                </div>
              </div>
              <div className="font-bold shrink-0 text-right">
                <div>{fmt(p.price)}</div>
                <div className="text-xs font-normal text-[var(--color-text-muted)]">
                  {p.pricing_type === "weight" && 'ק"ג'}
                  {p.pricing_type === "package" && "מארז"}
                  {p.pricing_type === "unit" && "יח'"}
                  {p.is_on_sale && p.sale_price && <span> · מבצע {fmt(p.sale_price)}</span>}
                </div>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
