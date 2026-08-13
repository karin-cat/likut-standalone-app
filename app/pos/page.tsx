"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import AppHeader from "@/components/AppHeader";
import ItemEditModal from "@/components/ItemEditModal";
import WeightKeypad from "@/components/WeightKeypad";
import { categoryColor } from "@/lib/categoryColor";
import { computeItemPrice, emptySlipDraftMeta, round2 } from "@/lib/types";
import type { CartItem, Product, SlipDraftMeta } from "@/lib/types";

function fmt(n: number): string {
  return "₪" + n.toFixed(2);
}

type Phase = "start" | "working";
type Tab = "catalog" | "cart";

function productToCartItem(p: Product): CartItem {
  const isWeight = p.pricing_type === "weight";
  const isPackage = p.pricing_type === "package";
  return {
    product_id: p.id,
    name: p.name,
    sku: p.sku,
    unit: isWeight ? "kg" : isPackage ? "unit" : "unit",
    qty: isWeight ? 0 : isPackage ? 1 : 1,
    unit_price: p.is_on_sale && p.sale_price ? p.sale_price : p.price,
    line_total: null,
    note: "",
    requires_cleaning: p.requires_cleaning,
    ordered_weight: null,
    actual_weight_for_billing: null,
    clean_weight: null,
    catalog_price: p.price,
    status: "picked",
    missing_reason: "",
  };
}

function freeCartItem(): CartItem {
  return {
    product_id: null,
    name: "",
    sku: null,
    unit: "unit",
    qty: 1,
    unit_price: 0,
    line_total: null,
    note: "",
    requires_cleaning: false,
    ordered_weight: null,
    actual_weight_for_billing: null,
    clean_weight: null,
    catalog_price: null,
    status: "picked",
    missing_reason: "",
  };
}

// ── מסך פתיחה — בחירת מצב + (אם מקושר) פרטי הזמנה ──────────────────────────
function StartScreen({
  meta,
  setMeta,
  onStart,
}: {
  meta: SlipDraftMeta;
  setMeta: (m: SlipDraftMeta) => void;
  onStart: () => void;
}) {
  const [showLinkedForm, setShowLinkedForm] = useState(meta.mode === "linked");

  function chooseMode(mode: "linked" | "standalone") {
    setMeta({ ...meta, mode });
    if (mode === "standalone") {
      onStart();
    } else {
      setShowLinkedForm(true);
    }
  }

  if (!showLinkedForm) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4 p-6">
        <div className="text-lg font-bold mb-2">איך מתחילים?</div>
        <button
          type="button"
          onClick={() => chooseMode("linked")}
          className="w-full max-w-xs rounded-2xl bg-white shadow-sm border border-[var(--color-border)] py-6 text-center font-bold text-lg active:bg-[var(--color-bg-soft)]"
        >
          📋 ליקוט הזמנה קיימת
          <div className="text-xs font-normal text-[var(--color-text-muted)] mt-1">
            יש הזמנה מודפסת מוורדפרס
          </div>
        </button>
        <button
          type="button"
          onClick={() => chooseMode("standalone")}
          className="w-full max-w-xs rounded-2xl bg-white shadow-sm border border-[var(--color-border)] py-6 text-center font-bold text-lg active:bg-[var(--color-bg-soft)]"
        >
          🧺 ליקוט עצמאי
          <div className="text-xs font-normal text-[var(--color-text-muted)] mt-1">בלי הזמנה מקורית</div>
        </button>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 pb-28">
      <div className="font-bold text-lg mb-3">📋 פרטי ההזמנה הקיימת</div>
      <div className="flex flex-col gap-3">
        <label className="flex flex-col gap-1">
          <span className="text-sm text-[var(--color-text-muted)]">מספר הזמנה</span>
          <input
            className="field-underline"
            type="number"
            value={meta.order_number}
            onChange={(e) => setMeta({ ...meta, order_number: e.target.value })}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm text-[var(--color-text-muted)]">שם לקוח</span>
          <input
            className="field-underline"
            inputMode="text"
            value={meta.customer_name}
            onChange={(e) => setMeta({ ...meta, customer_name: e.target.value })}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm text-[var(--color-text-muted)]">📞 טלפון לקוח</span>
          <input
            className="field-underline"
            inputMode="tel"
            placeholder="למשל: 054-1234567"
            value={meta.customer_phone}
            onChange={(e) => setMeta({ ...meta, customer_phone: e.target.value })}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm text-[var(--color-text-muted)]">📧 מייל לקוח</span>
          <input
            className="field-underline"
            inputMode="email"
            placeholder="customer@example.com"
            value={meta.customer_email}
            onChange={(e) => setMeta({ ...meta, customer_email: e.target.value })}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm text-[var(--color-text-muted)]">🏘️ רחוב ומספר</span>
          <input
            className="field-underline"
            inputMode="text"
            placeholder="למשל: רחוב שטרן 15"
            value={meta.customer_address_street}
            onChange={(e) => setMeta({ ...meta, customer_address_street: e.target.value })}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm text-[var(--color-text-muted)]">🏙️ עיר</span>
          <input
            className="field-underline"
            inputMode="text"
            placeholder="למשל: ירושלים"
            value={meta.customer_address_city}
            onChange={(e) => setMeta({ ...meta, customer_address_city: e.target.value })}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm text-[var(--color-text-muted)]">📍 כתובת מלאה (אם קיימת בהזמנה המקורית)</span>
          <input
            className="field-underline"
            inputMode="text"
            placeholder="למשל: רחוב שטרן 15, ירושלים"
            value={meta.customer_address}
            onChange={(e) => setMeta({ ...meta, customer_address: e.target.value })}
          />
          <span className="text-xs text-[var(--color-text-muted)]">אופציונלי - במקום רחוב + עיר נפרדים</span>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm text-[var(--color-text-muted)]">🚚 שיטת משלוח</span>
          <select
            className="field-underline"
            value={meta.shipping_method}
            onChange={(e) => setMeta({ ...meta, shipping_method: e.target.value })}
          >
            <option value="">בחר שיטת משלוח...</option>
            <option value="איסוף עצמי">איסוף עצמי</option>
            <option value="משלוח עד הבית">משלוח עד הבית</option>
            <option value="אחר">אחר</option>
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm text-[var(--color-text-muted)]">📅 תאריך אספקה</span>
          <input
            type="date"
            className="field-underline"
            value={meta.delivery_date}
            onChange={(e) => setMeta({ ...meta, delivery_date: e.target.value })}
          />
          <span className="text-xs text-[var(--color-text-muted)]">פורמט: יום/חודש/שנה</span>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm text-[var(--color-text-muted)]">💵 עלות משלוח (₪)</span>
          <input
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0"
            className="field-underline"
            value={meta.shipping_cost}
            onChange={(e) => setMeta({ ...meta, shipping_cost: e.target.value })}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm text-[var(--color-text-muted)]">💬 הערות כלליות</span>
          <input
            className="field-underline"
            inputMode="text"
            value={meta.note}
            onChange={(e) => setMeta({ ...meta, note: e.target.value })}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm text-[var(--color-text-muted)] font-bold">
            💰 סכום ההזמנה המקורי (₪)
          </span>
          <input
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0"
            className="field-underline"
            placeholder="מהעתק ההזמנה המודפס"
            value={meta.original_total}
            onChange={(e) => setMeta({ ...meta, original_total: e.target.value })}
          />
          <span className="text-xs text-[var(--color-text-muted)]">
            ⚠️ הסכום צריך <strong>לכלול את עלות המשלוח</strong>. ישמש בסוף הליקוט להשוואה מול הסכום בפועל.
          </span>
        </label>
      </div>

      <div className="fixed bottom-0 inset-x-0 bg-white border-t border-[var(--color-border)] p-3">
        <button
          type="button"
          onClick={onStart}
          className="w-full rounded-xl bg-[var(--color-brand)] text-white font-bold py-3 text-lg"
        >
          התחל ליקוט →
        </button>
      </div>
    </div>
  );
}

export default function PosPage() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("start");
  const [meta, setMeta] = useState<SlipDraftMeta>(emptySlipDraftMeta());

  const [tab, setTab] = useState<Tab>("catalog");
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string | null>(null);

  const [cart, setCart] = useState<CartItem[]>([]);
  const [editing, setEditing] = useState<{ index: number | null; item: CartItem } | null>(null);
  const [keypadFlow, setKeypadFlow] = useState<{ item: CartItem; stage: "primary" | "clean" } | null>(null);

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (phase !== "working") return;
    // דפוס טעינה סטנדרטי (fetch + AbortController בניקוי) — לא לולאת רינדור אמיתית.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoadingProducts(true);
    const controller = new AbortController();
    const qs = search ? `?q=${encodeURIComponent(search)}` : "";
    fetch(`/api/products${qs}`, { signal: controller.signal })
      .then((r) => r.json())
      .then((data: Product[]) => setProducts(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setLoadingProducts(false));
    return () => controller.abort();
  }, [search, phase]);

  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const p of products) if (p.category) set.add(p.category);
    return Array.from(set).sort();
  }, [products]);

  const visibleProducts = useMemo(() => {
    if (!category) return products;
    return products.filter((p) => p.category === category);
  }, [products, category]);

  const total = useMemo(() => {
    return round2(cart.reduce((s, it) => s + computeItemPrice({
      unit: it.unit,
      qty: it.qty,
      unit_price: it.unit_price,
      line_total: it.line_total,
      actual_weight_for_billing: it.actual_weight_for_billing,
      status: it.status,
    }), 0));
  }, [cart]);
  const missingItems = useMemo(() => cart.filter((it) => it.status === "missing"), [cart]);

  function openAddModal(item: CartItem) {
    setEditing({ index: null, item });
  }

  // ── זרימת מקלדת מסך-מלא — הדרך המהירה להוסיף מוצר מהקטלוג ──────────────────
  function openKeypadForProduct(p: Product) {
    setKeypadFlow({ item: productToCartItem(p), stage: "primary" });
  }

  function handleKeypadPrimaryConfirm(value: number) {
    if (!keypadFlow) return;
    const item: CartItem = {
      ...keypadFlow.item,
      qty: keypadFlow.item.unit === "unit" ? Math.round(value) : value,
      ordered_weight: keypadFlow.item.requires_cleaning ? value : null,
    };
    if (item.requires_cleaning) {
      setKeypadFlow({ item, stage: "clean" });
    } else {
      setCart((prev) => [...prev, item]);
      setKeypadFlow(null);
      setTab("cart");
    }
  }

  function handleKeypadCleanConfirm(value: number) {
    if (!keypadFlow) return;
    const item: CartItem = {
      ...keypadFlow.item,
      actual_weight_for_billing: value,
    };
    // עבור ניקוי, המשתמש צריך להיכנס ל-ItemEditModal כדי להוסיף את משקל אחרי הניקוי
    setEditing({ index: null, item });
    setKeypadFlow(null);
  }

  function handleKeypadMoreOptions() {
    if (!keypadFlow) return;
    setEditing({ index: null, item: keypadFlow.item });
    setKeypadFlow(null);
  }

  function openEditModal(index: number) {
    setEditing({ index, item: cart[index] });
  }

  function handleSaveItem(updated: CartItem) {
    if (editing?.index === null || editing?.index === undefined) {
      setCart((prev) => [...prev, updated]);
    } else {
      setCart((prev) => prev.map((it, i) => (i === editing.index ? updated : it)));
    }
    setEditing(null);
    setTab("cart");
  }

  function handleDeleteItem() {
    if (editing?.index !== null && editing?.index !== undefined) {
      setCart((prev) => prev.filter((_, i) => i !== editing.index));
    }
    setEditing(null);
  }

  async function handleSaveSlip() {
    if (cart.length === 0) {
      setSaveError("העגלה ריקה");
      return;
    }
    setSaving(true);
    setSaveError(null);
    try {
      const res = await fetch("/api/slips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: cart,
          mode: meta.mode,
          order_number: meta.order_number || null,
          customer_name: meta.customer_name || null,
          customer_address: meta.customer_address || null,
          shipping_method: meta.shipping_method || null,
          delivery_date: meta.delivery_date || null,
          shipping_cost: meta.shipping_cost || null,
          note: meta.note || null,
          original_total: meta.mode === "linked" ? meta.original_total || null : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSaveError(data.error || "שגיאה בשמירה");
        setSaving(false);
        return;
      }
      router.push(`/slips/${data.id}/print`);
    } catch {
      setSaveError("בעיית תקשורת — יש לבדוק חיבור ולנסות שוב");
      setSaving(false);
    }
  }

  if (phase === "start") {
    return (
      <div className="min-h-screen flex flex-col">
        <AppHeader title="תעודה חדשה" backHref="/" />
        <StartScreen meta={meta} setMeta={setMeta} onStart={() => setPhase("working")} />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <AppHeader title={meta.mode === "linked" ? `הזמנה ${meta.order_number || ""}` : "ליקוט עצמאי"} backHref="/pos" />

      <div className="flex border-b border-[var(--color-border)] bg-white sticky top-14 z-10">
        <button
          type="button"
          onClick={() => setTab("catalog")}
          className={`flex-1 py-3 font-bold ${tab === "catalog" ? "text-[var(--color-brand)] border-b-2 border-[var(--color-brand)]" : "text-[var(--color-text-muted)]"}`}
        >
          🧺 קטלוג
        </button>
        <button
          type="button"
          onClick={() => setTab("cart")}
          className={`flex-1 py-3 font-bold ${tab === "cart" ? "text-[var(--color-brand)] border-b-2 border-[var(--color-brand)]" : "text-[var(--color-text-muted)]"}`}
        >
          🧾 עגלה {cart.length > 0 ? `(${cart.length})` : ""}
        </button>
      </div>

      {tab === "catalog" && (
        <div className="flex-1 flex flex-col">
          <div className="p-3 flex flex-col gap-2 bg-white border-b border-[var(--color-border)]">
            <input
              type="text"
              placeholder="🔍 חיפוש מוצר / מק&quot;ט..."
              className="field-underline"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {categories.length > 0 && (
              <div className="flex gap-2 overflow-x-auto pb-1">
                <button
                  type="button"
                  onClick={() => setCategory(null)}
                  className={`shrink-0 px-3 py-1.5 rounded-full text-sm border ${!category ? "bg-[var(--color-brand)] text-white border-[var(--color-brand)]" : "border-[var(--color-border)]"}`}
                >
                  הכל
                </button>
                {categories.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCategory(c)}
                    className="shrink-0 px-3 py-1.5 rounded-full text-sm border flex items-center gap-1.5"
                    style={
                      category === c
                        ? { background: categoryColor(c), borderColor: categoryColor(c), color: "#fff" }
                        : { borderColor: "var(--color-border)" }
                    }
                  >
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ background: category === c ? "#fff" : categoryColor(c) }}
                    />
                    {c}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto pb-24">
            {loadingProducts ? (
              <div className="p-6 text-center text-[var(--color-text-muted)]">טוען מוצרים...</div>
            ) : visibleProducts.length === 0 ? (
              <div className="p-6 text-center text-[var(--color-text-muted)]">
                אין מוצרים. אפשר להוסיף בעמוד &quot;ניהול מוצרים&quot;.
              </div>
            ) : (
              visibleProducts.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => openKeypadForProduct(p)}
                  className="w-full flex items-center gap-3 px-4 py-3 border-b border-[var(--color-border)] bg-white text-right active:bg-[var(--color-bg-soft)]"
                >
                  {p.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.image_url} alt="" className="w-11 h-11 rounded-lg object-cover shrink-0" />
                  ) : (
                    <div
                      className="w-11 h-11 rounded-lg shrink-0 flex items-center justify-center text-white font-bold text-lg"
                      style={{ background: categoryColor(p.category) }}
                    >
                      {p.name.trim().charAt(0)}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold truncate">
                      {p.name}
                      {p.requires_cleaning && <span className="text-amber-600"> ⚠️</span>}
                    </div>
                    {p.sku && <div className="text-xs text-[var(--color-text-muted)]">מק&quot;ט {p.sku}</div>}
                  </div>
                  <div className="font-bold shrink-0">
                    {fmt(p.price)} <span className="text-xs font-normal text-[var(--color-text-muted)]">/ {p.sold_by_weight ? 'ק"ג' : "יח'"}</span>
                  </div>
                </button>
              ))
            )}
            <button
              type="button"
              onClick={() => openAddModal(freeCartItem())}
              className="w-full text-center py-4 text-[var(--color-brand-dark)] font-bold"
            >
              ➕ הוספת מוצר חופשי (לא בקטלוג)
            </button>
            <button
              type="button"
              onClick={() =>
                openAddModal({ ...freeCartItem(), status: "missing", note: "", missing_reason: "" })
              }
              className="w-full text-center py-4 text-[var(--color-danger)] font-bold"
            >
              ✕ סימון מוצר כלא לוקט / חסר (לא בקטלוג)
            </button>
          </div>
        </div>
      )}

      {tab === "cart" && (
        <div className="flex-1 flex flex-col pb-28">
          {cart.length === 0 ? (
            <div className="p-6 text-center text-[var(--color-text-muted)]">
              🧺 העגלה ריקה — עברי לקטלוג והוסיפי מוצרים
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto">
              {cart.map((it, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => openEditModal(i)}
                  className={`w-full flex items-start justify-between gap-3 px-4 py-3 border-b border-[var(--color-border)] bg-white text-right ${it.status === "missing" ? "opacity-70" : ""}`}
                >
                  <div className="min-w-0">
                    <div className="font-semibold truncate">{it.name}</div>
                    {it.status === "missing" ? (
                      <div className="text-xs text-[var(--color-danger)] font-bold">
                        ✕ לא לוקט / חסר{it.missing_reason ? ` — ${it.missing_reason}` : ""}
                      </div>
                    ) : (
                      <>
                        <div className="text-xs text-[var(--color-text-muted)]">
                          {it.qty} {it.unit === "kg" ? 'ק"ג' : it.unit === "gram" ? "גרם" : "יח'"} × {fmt(it.unit_price)}
                        </div>
                        {it.line_total !== null && (
                          <div className="text-xs text-green-700 font-bold">💰 מחיר סופי קבוע</div>
                        )}
                        {it.requires_cleaning && (
                          <div className="text-xs text-amber-700 font-bold">
                            ⚠️ ניקוי{it.clean_weight != null ? ` · אחרי: ${it.clean_weight} ק"ג` : ""}
                          </div>
                        )}
                        {it.note && <div className="text-xs text-amber-700">📝 {it.note}</div>}
                      </>
                    )}
                  </div>
                  <div className="font-bold shrink-0">{fmt(computeItemPrice(it))}</div>
                </button>
              ))}
            </div>
          )}

          <div className="fixed bottom-0 inset-x-0 bg-white border-t border-[var(--color-border)] p-3 flex flex-col gap-2">
            {saveError && <div className="text-sm text-[var(--color-danger)]">{saveError}</div>}
            {meta.mode === "linked" && meta.original_total && (
              <div className="flex items-center justify-between text-sm text-[var(--color-text-muted)] px-1">
                <span>מחיר הזמנה מקורי</span>
                <span>{fmt(Number(meta.original_total) || 0)}</span>
              </div>
            )}
            {missingItems.length > 0 && (
              <div className="text-xs text-[var(--color-danger)] px-1">
                ✕ {missingItems.length} פריט{missingItems.length > 1 ? "ים" : ""} לא לוקטו
              </div>
            )}
            <div className="flex items-center justify-between font-bold text-lg px-1">
              <span>סה&quot;כ בפועל</span>
              <span>{fmt(total)}</span>
            </div>
            <button
              type="button"
              onClick={handleSaveSlip}
              disabled={saving || cart.length === 0}
              className="rounded-xl bg-[var(--color-brand)] text-white font-bold py-3 text-lg disabled:opacity-50"
            >
              {saving ? "שומר/ת..." : "💾 שמירה + הדפסה"}
            </button>
          </div>
        </div>
      )}

      {editing && (
        <ItemEditModal
          item={editing.item}
          isNew={editing.index === null}
          onCancel={() => setEditing(null)}
          onSave={handleSaveItem}
          onDelete={editing.index !== null ? handleDeleteItem : undefined}
        />
      )}

      {keypadFlow && keypadFlow.stage === "primary" && (
        <WeightKeypad
          title={keypadFlow.item.name}
          label={
            keypadFlow.item.requires_cleaning
              ? `משקל לפני ניקוי (${keypadFlow.item.unit === "unit" ? "יח'" : 'ק"ג'})`
              : keypadFlow.item.unit === "unit"
                ? "כמות"
                : 'משקל (ק"ג)'
          }
          initialValue={keypadFlow.item.unit === "unit" ? "1" : ""}
          onConfirm={handleKeypadPrimaryConfirm}
          onClose={() => setKeypadFlow(null)}
          onMoreOptions={handleKeypadMoreOptions}
        />
      )}
      {keypadFlow && keypadFlow.stage === "clean" && (
        <WeightKeypad
          title={keypadFlow.item.name}
          label='משקל אחרי ניקוי (ק"ג) — לתיעוד בלבד'
          onConfirm={handleKeypadCleanConfirm}
          onClose={() => setKeypadFlow(null)}
        />
      )}
    </div>
  );
}
