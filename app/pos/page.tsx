"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import AppHeader from "@/components/AppHeader";
import ItemEditModal from "@/components/ItemEditModal";
import WeightKeypad from "@/components/WeightKeypad";
import { categoryColor } from "@/lib/categoryColor";
import { computeItemPrice, emptySlipDraftMeta, PICKER_NAMES, round2 } from "@/lib/types";
import type { CartItem, PickerName, Product, Slip, SlipDraftMeta, SlipItem } from "@/lib/types";

function fmt(n: number): string {
  return "₪" + n.toFixed(2);
}

function cartQtyLabel(it: CartItem): string {
  const unitLabel = it.unit === "kg" ? 'ק"ג' : it.unit === "gram" ? "גרם" : "יח'";
  return `${it.qty} ${unitLabel}`;
}

type Phase = "menu" | "order-form" | "resume-list" | "working";
type Tab = "catalog" | "cart";

// שמירת טיוטת התעודה הפעילה ב-localStorage — כדי שרענון בטעות לא ימחק עגלה שכבר לוקטה
const DRAFT_KEY = "likut_pos_draft_v2";

interface LocalDraft {
  draftId: number;
  meta: SlipDraftMeta;
  cart: CartItem[];
}

function loadLocalDraft(): LocalDraft | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || !parsed.draftId) return null;
    return parsed as LocalDraft;
  } catch {
    return null;
  }
}

function saveLocalDraft(draft: LocalDraft) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  } catch {
    // localStorage לא זמין — לא קריטי
  }
}

function clearLocalDraft() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(DRAFT_KEY);
  } catch {
    // ignore
  }
}

function productToCartItem(p: Product): CartItem {
  // מוצר "מארז" מתומחר לק"ג (כמו משקל) — האריזה שוקלת כמות משתנה, ולכן צריך להזין משקל בפועל ולא רק "1 מארז"
  const isWeighed = p.pricing_type === "weight" || p.pricing_type === "package";
  return {
    product_id: p.id,
    name: p.name,
    sku: p.sku,
    unit: isWeighed ? "kg" : "unit",
    qty: isWeighed ? 0 : 1,
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

function slipToCartItem(it: SlipItem): CartItem {
  return {
    product_id: it.product_id,
    name: it.name,
    sku: null,
    unit: it.unit,
    qty: it.qty,
    unit_price: it.unit_price,
    line_total: it.line_total,
    note: it.note || "",
    requires_cleaning: it.requires_cleaning,
    ordered_weight: it.ordered_weight,
    actual_weight_for_billing: it.actual_weight_for_billing,
    clean_weight: it.clean_weight,
    catalog_price: null,
    status: it.status,
    missing_reason: it.missing_reason || "",
  };
}

function slipToMeta(s: Slip): SlipDraftMeta {
  return {
    order_number: s.order_number || "",
    customer_type: s.customer_name ? "specific" : "general",
    customer_name: s.customer_name || "",
    picker_name: (s.picker_name as PickerName) || "",
    customer_phone: s.customer_phone || "",
    customer_address_street: s.customer_address_street || "",
    customer_address_city: s.customer_address_city || "",
    shipping_method: s.shipping_method === "איסוף עצמי" ? "pickup" : s.shipping_method === "משלוח" ? "delivery" : "",
    shipping_free: !s.shipping_cost,
    shipping_cost: s.shipping_cost ? String(s.shipping_cost) : "",
    note: s.note || "",
  };
}

// ── מסך תפריט פתיחה — 2 אופציות: ליקוט הזמנה / המשך ליקוט קיים ──────────────
function MenuScreen({ onNew, onResume }: { onNew: () => void; onResume: () => void }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-4 p-6">
      <button
        type="button"
        onClick={onNew}
        className="w-full max-w-xs rounded-2xl bg-white shadow-sm border border-[var(--color-border)] py-6 text-center font-bold text-lg active:bg-[var(--color-bg-soft)]"
      >
        🧾 ליקוט הזמנה
        <div className="text-xs font-normal text-[var(--color-text-muted)] mt-1">התחלת תעודה חדשה</div>
      </button>
      <button
        type="button"
        onClick={onResume}
        className="w-full max-w-xs rounded-2xl bg-white shadow-sm border border-[var(--color-border)] py-6 text-center font-bold text-lg active:bg-[var(--color-bg-soft)]"
      >
        📋 המשך ליקוט קיים
        <div className="text-xs font-normal text-[var(--color-text-muted)] mt-1">תעודות שלא הושלמו</div>
      </button>
    </div>
  );
}

// ── כרטיס שדה בטופס — מבהיר מיד מה חובה, מה לא, ומה כבר מולא ────────────────
function FormSection({
  icon,
  title,
  required,
  done,
  children,
}: {
  icon: string;
  title: string;
  required: boolean;
  done: boolean;
  children: React.ReactNode;
}) {
  const accent = required ? (done ? "border-r-4 border-r-[var(--color-brand)]" : "border-r-4 border-r-[var(--color-danger)]") : "";
  return (
    <div className={`mb-4 bg-white rounded-2xl border border-[var(--color-border)] p-4 ${accent}`}>
      <div className="flex items-center gap-2 mb-3">
        <span className="font-bold text-lg">
          {icon} {title}
        </span>
        {required ? (
          <span className="text-xs font-bold text-[var(--color-danger)]">* חובה</span>
        ) : (
          <span className="text-xs text-[var(--color-text-muted)]">לא חובה</span>
        )}
        {done && <span className="text-[var(--color-brand)] font-bold text-base">✓</span>}
      </div>
      {children}
    </div>
  );
}

// ── מסך פתיחת הזמנה — כל הפרטים נאספים כאן, לפני תחילת הליקוט ──────────────
function OrderForm({
  meta,
  setMeta,
  onBack,
  onStart,
  starting,
  startError,
  orderNumberTaken,
  onDismissError,
  onGoToResumeList,
}: {
  meta: SlipDraftMeta;
  setMeta: (m: SlipDraftMeta) => void;
  onBack: () => void;
  onStart: () => void;
  starting: boolean;
  startError: string | null;
  orderNumberTaken: boolean;
  onDismissError: () => void;
  onGoToResumeList: () => void;
}) {
  const [generatingOrderNumber, setGeneratingOrderNumber] = useState(false);
  const orderNumberRef = useRef<HTMLInputElement>(null);
  const now = useMemo(() => new Date(), []);
  const dateLabel = now.toLocaleDateString("he-IL", { weekday: "long", day: "2-digit", month: "2-digit", year: "numeric" });
  const timeLabel = now.toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" });

  async function generateOrderNumber() {
    setGeneratingOrderNumber(true);
    try {
      const res = await fetch("/api/slips/generate-order-number");
      const data = await res.json();
      if (res.ok && data.order_number) {
        setMeta({ ...meta, order_number: data.order_number });
      }
    } catch {
      // ignore — ניתן להזין ידנית
    } finally {
      setGeneratingOrderNumber(false);
    }
  }

  const isComplete =
    !!meta.picker_name &&
    !!meta.shipping_method &&
    (meta.customer_type === "general" || meta.customer_name.trim() !== "");
  const customerDone = meta.customer_type === "general" || meta.customer_name.trim() !== "";
  const pickerDone = !!meta.picker_name;
  const contactFilled = !!(meta.customer_phone || meta.customer_address_street || meta.customer_address_city);
  const shippingFilled = !!meta.shipping_method;
  const noteFilled = !!meta.note;

  return (
    <div className="flex-1 overflow-y-auto p-4 pb-28">
      <div className="text-sm text-[var(--color-text-muted)] mb-5 text-center">
        📅 {dateLabel} · 🕐 {timeLabel}
      </div>

      {/* ── מספר הזמנה ─────────────────────────────────────────────── */}
      <FormSection icon="🔢" title="מספר הזמנה" required={false} done={!!meta.order_number.trim()}>
        <input
          ref={orderNumberRef}
          className={`field-underline text-3xl font-bold text-center tracking-wide ${
            orderNumberTaken ? "border-b-[var(--color-danger)]" : ""
          }`}
          type="text"
          inputMode="numeric"
          placeholder="הזני מספר או צרי אחד"
          value={meta.order_number}
          onChange={(e) => setMeta({ ...meta, order_number: e.target.value })}
        />
        <button
          type="button"
          onClick={generateOrderNumber}
          disabled={generatingOrderNumber}
          className="mt-3 w-full rounded-xl border border-[var(--color-brand)] text-[var(--color-brand)] font-bold py-2.5 disabled:opacity-50"
        >
          {generatingOrderNumber ? "יוצר/ת..." : "✨ צור לי מספר הזמנה"}
        </button>
      </FormSection>

      {/* ── שם לקוח ─────────────────────────────────────────────────── */}
      <FormSection icon="👤" title="שם לקוח" required done={customerDone}>
        <div className="flex gap-2 mb-3">
          <button
            type="button"
            onClick={() => setMeta({ ...meta, customer_type: "general" })}
            className={`flex-1 rounded-xl py-4 text-center font-bold border-2 ${
              meta.customer_type === "general"
                ? "bg-[var(--color-brand)] text-white border-[var(--color-brand)]"
                : "bg-white border-[var(--color-border)]"
            }`}
          >
            👥 לקוח כללי
          </button>
          <button
            type="button"
            onClick={() => setMeta({ ...meta, customer_type: "specific" })}
            className={`flex-1 rounded-xl py-4 text-center font-bold border-2 ${
              meta.customer_type === "specific"
                ? "bg-[var(--color-brand)] text-white border-[var(--color-brand)]"
                : "bg-white border-[var(--color-border)]"
            }`}
          >
            🙋 הזנת שם
          </button>
        </div>
        {meta.customer_type === "specific" && (
          <input
            className="field-underline text-xl font-bold"
            type="text"
            placeholder="שם הלקוח/ה"
            value={meta.customer_name}
            onChange={(e) => setMeta({ ...meta, customer_name: e.target.value })}
            autoFocus
          />
        )}
      </FormSection>

      {/* ── שם המלקט ────────────────────────────────────────────────── */}
      <FormSection icon="🧑‍💼" title="שם המלקט/ת" required done={pickerDone}>
        <div className="flex gap-2">
          {PICKER_NAMES.map((p) => (
            <button
              key={p.value}
              type="button"
              onClick={() => setMeta({ ...meta, picker_name: p.value })}
              className={`flex-1 rounded-xl py-4 text-center font-bold border-2 ${
                meta.picker_name === p.value
                  ? "bg-[var(--color-brand)] text-white border-[var(--color-brand)]"
                  : "bg-white border-[var(--color-border)]"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </FormSection>

      {/* ── שיטת אספקה ──────────────────────────────────────────────── */}
      <FormSection icon="🚚" title="שיטת אספקה" required done={shippingFilled}>
        <div className="flex gap-2 mb-3">
          <button
            type="button"
            onClick={() => setMeta({ ...meta, shipping_method: "pickup" })}
            className={`flex-1 rounded-xl py-4 text-center font-bold border-2 ${
              meta.shipping_method === "pickup"
                ? "bg-[var(--color-brand)] text-white border-[var(--color-brand)]"
                : "bg-white border-[var(--color-border)]"
            }`}
          >
            🏪 איסוף עצמי
          </button>
          <button
            type="button"
            onClick={() => setMeta({ ...meta, shipping_method: "delivery" })}
            className={`flex-1 rounded-xl py-4 text-center font-bold border-2 ${
              meta.shipping_method === "delivery"
                ? "bg-[var(--color-brand)] text-white border-[var(--color-brand)]"
                : "bg-white border-[var(--color-border)]"
            }`}
          >
            🚛 משלוח
          </button>
        </div>

        {meta.shipping_method === "delivery" && (
          <div className="bg-[var(--color-bg-soft)] rounded-xl p-3">
            <div className="text-sm font-semibold text-[var(--color-text-muted)] mb-2">עלות משלוח</div>
            <div className="flex gap-2 mb-2">
              <button
                type="button"
                onClick={() => setMeta({ ...meta, shipping_free: true, shipping_cost: "" })}
                className={`flex-1 rounded-lg py-2.5 text-center font-bold border-2 ${
                  meta.shipping_free
                    ? "bg-[var(--color-brand)] text-white border-[var(--color-brand)]"
                    : "bg-white border-[var(--color-border)]"
                }`}
              >
                חינם
              </button>
              <button
                type="button"
                onClick={() => setMeta({ ...meta, shipping_free: false })}
                className={`flex-1 rounded-lg py-2.5 text-center font-bold border-2 ${
                  !meta.shipping_free
                    ? "bg-[var(--color-brand)] text-white border-[var(--color-brand)]"
                    : "bg-white border-[var(--color-border)]"
                }`}
              >
                בתשלום
              </button>
            </div>
            {!meta.shipping_free && (
              <input
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0"
                className="field-underline"
                placeholder="סכום ב-₪"
                value={meta.shipping_cost}
                onChange={(e) => setMeta({ ...meta, shipping_cost: e.target.value })}
              />
            )}
          </div>
        )}
      </FormSection>

      {/* ── פרטי קשר — אופציונלי ───────────────────────────────────── */}
      <FormSection icon="📞" title="פרטי קשר" required={false} done={contactFilled}>
        <div className="flex flex-col gap-2">
          <label className="flex flex-col gap-0.5">
            <span className="text-xs text-[var(--color-text-muted)]">📞 טלפון</span>
            <input
              className="field-underline text-sm py-2"
              inputMode="tel"
              placeholder="054-1234567"
              value={meta.customer_phone}
              onChange={(e) => setMeta({ ...meta, customer_phone: e.target.value })}
            />
          </label>
          <label className="flex flex-col gap-0.5">
            <span className="text-xs text-[var(--color-text-muted)]">🏘️ רחוב ומספר</span>
            <input
              className="field-underline text-sm py-2"
              placeholder="רחוב שטרן 15"
              value={meta.customer_address_street}
              onChange={(e) => setMeta({ ...meta, customer_address_street: e.target.value })}
            />
          </label>
          <label className="flex flex-col gap-0.5">
            <span className="text-xs text-[var(--color-text-muted)]">🏙️ עיר</span>
            <input
              className="field-underline text-sm py-2"
              placeholder="ירושלים"
              value={meta.customer_address_city}
              onChange={(e) => setMeta({ ...meta, customer_address_city: e.target.value })}
            />
          </label>
        </div>
      </FormSection>

      {/* ── הערה ללקוח ──────────────────────────────────────────────── */}
      <FormSection icon="💬" title="הערה ללקוח" required={false} done={noteFilled}>
        <input
          className="field-underline"
          placeholder="למשל: להתקשר לפני אספקה / להוסיף 1 ק&quot;ג כנפיים הודו"
          value={meta.note}
          onChange={(e) => setMeta({ ...meta, note: e.target.value })}
        />
      </FormSection>

      <div className="fixed bottom-0 inset-x-0 bg-white border-t border-[var(--color-border)] p-3 flex gap-2">
        <button
          type="button"
          onClick={onBack}
          className="flex-1 rounded-xl border border-[var(--color-border)] font-bold py-3 text-lg"
        >
          ← חזור
        </button>
        <button
          type="button"
          onClick={onStart}
          disabled={!isComplete || starting}
          className="flex-1 rounded-xl bg-[var(--color-brand)] text-white font-bold py-3 text-lg disabled:opacity-50"
        >
          {starting ? "מתחיל/ה..." : "התחל ליקוט →"}
        </button>
      </div>

      {startError && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-6">
          <div className="bg-white rounded-2xl p-5 w-full max-w-xs text-center shadow-xl">
            <div className="text-3xl mb-2">⚠️</div>
            <div className="font-bold text-lg mb-4">{startError}</div>
            {orderNumberTaken ? (
              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => {
                    onDismissError();
                    setTimeout(() => orderNumberRef.current?.focus(), 0);
                  }}
                  className="w-full rounded-xl bg-[var(--color-brand)] text-white font-bold py-3"
                >
                  ✏️ שינוי מספר הזמנה
                </button>
                <button
                  type="button"
                  onClick={onGoToResumeList}
                  className="w-full rounded-xl border border-[var(--color-border)] font-bold py-3"
                >
                  📋 מעבר לתעודות שמורות
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={onDismissError}
                className="w-full rounded-xl bg-[var(--color-brand)] text-white font-bold py-3"
              >
                הבנתי
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── מסך "המשך ליקוט קיים" — רשימת תעודות טיוטה מהשרת ────────────────────────
function ResumeListScreen({
  onResume,
  onDelete,
}: {
  onResume: (id: number) => void;
  onDelete: (id: number) => void;
}) {
  const [drafts, setDrafts] = useState<(Slip & { item_count: number })[] | null>(null);

  useEffect(() => {
    fetch("/api/slips/drafts")
      .then((r) => r.json())
      .then((data) => setDrafts(Array.isArray(data) ? data : []))
      .catch(() => setDrafts([]));
  }, []);

  return (
    <div className="flex-1 overflow-y-auto p-4">
      {drafts === null ? (
        <div className="text-center text-[var(--color-text-muted)] py-10">טוען...</div>
      ) : drafts.length === 0 ? (
        <div className="text-center text-[var(--color-text-muted)] py-10">אין תעודות פתוחות כרגע.</div>
      ) : (
        <div className="flex flex-col gap-2">
          {drafts.map((d) => (
            <div
              key={d.id}
              className="bg-white rounded-xl border border-[var(--color-border)] p-4 flex items-center justify-between gap-3"
            >
              <button type="button" onClick={() => onResume(d.id)} className="flex-1 text-right min-w-0">
                <div className="font-bold truncate">{d.customer_name || "👥 לקוח כללי"}</div>
                <div className="text-xs text-[var(--color-text-muted)] mt-0.5">
                  {d.order_number ? `הזמנה #${d.order_number} · ` : ""}
                  {d.item_count} פריטים · {new Date(d.created_at).toLocaleString("he-IL")}
                </div>
                <div className="font-bold text-[var(--color-brand-dark)] mt-1">{fmt(Number(d.total))}</div>
              </button>
              <button
                type="button"
                onClick={() => onDelete(d.id)}
                className="text-[var(--color-danger)] text-xl px-2 shrink-0"
                aria-label="מחיקת תעודה"
              >
                🗑
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function PosPage() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("menu");
  const [meta, setMeta] = useState<SlipDraftMeta>(emptySlipDraftMeta());
  const [draftId, setDraftId] = useState<number | null>(null);
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  const [orderNumberTaken, setOrderNumberTaken] = useState(false);

  const [tab, setTab] = useState<Tab>("catalog");
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string | null>(null);

  const [cart, setCart] = useState<CartItem[]>([]);
  const [editing, setEditing] = useState<{ index: number | null; item: CartItem } | null>(null);
  const [keypadFlow, setKeypadFlow] = useState<{ item: CartItem; stage: "primary" | "clean" } | null>(null);
  const [duplicatePrompt, setDuplicatePrompt] = useState<{ newItem: CartItem; existingIndex: number } | null>(null);

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // בעליית הרכיב — אם יש טיוטה שנשמרה מקומית (רענון בטעות באמצע ליקוט), משחזרים אותה ישירות
  useEffect(() => {
    const d = loadLocalDraft();
    if (d) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDraftId(d.draftId);
      setMeta(d.meta);
      setCart(d.cart);
      setPhase("working");
    }
  }, []);

  // שמירה אוטומטית של הטיוטה הפעילה — מגנה מפני רענון בטעות
  useEffect(() => {
    if (phase !== "working" || draftId === null) return;
    saveLocalDraft({ draftId, meta, cart });
  }, [phase, draftId, meta, cart]);

  // סנכרון שוטף של העגלה לשרת — כדי ש"המשך ליקוט קיים" יהיה עדכני מכל מכשיר
  useEffect(() => {
    if (phase !== "working" || draftId === null) return;
    const controller = new AbortController();
    fetch(`/api/slips/${draftId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: cart, status: "draft" }),
      signal: controller.signal,
    }).catch(() => {});
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cart, draftId]);

  async function handleCreateOrder() {
    setStarting(true);
    setStartError(null);
    setOrderNumberTaken(false);
    try {
      const res = await fetch("/api/slips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          order_number: meta.order_number || null,
          customer_type: meta.customer_type,
          customer_name: meta.customer_type === "specific" ? meta.customer_name : null,
          picker_name: meta.picker_name || null,
          customer_phone: meta.customer_phone || null,
          customer_address_street: meta.customer_address_street || null,
          customer_address_city: meta.customer_address_city || null,
          shipping_method: meta.shipping_method || null,
          shipping_cost: meta.shipping_method === "delivery" && !meta.shipping_free ? meta.shipping_cost || null : null,
          note: meta.note || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setStartError(data.error || "שגיאה בפתיחת התעודה");
        setOrderNumberTaken(res.status === 409);
        setStarting(false);
        return;
      }
      setDraftId(data.id);
      setPhase("working");
      setTab("catalog");
      setStarting(false);
    } catch {
      setStartError("בעיית תקשורת — יש לבדוק חיבור ולנסות שוב");
      setStarting(false);
    }
  }

  async function handleResumeDraft(id: number) {
    try {
      const res = await fetch(`/api/slips/${id}`);
      const data = await res.json();
      if (!res.ok) return;
      setDraftId(data.id);
      setMeta(slipToMeta(data));
      setCart((data.items as SlipItem[]).map(slipToCartItem));
      setPhase("working");
      setTab("cart");
    } catch {
      // ignore
    }
  }

  async function handleDeleteDraft(id: number) {
    if (!window.confirm("למחוק תעודה זו לצמיתות?")) return;
    try {
      await fetch(`/api/slips/${id}`, { method: "DELETE" });
      // רענון הרשימה — פשוט חוזרים למסך הרשימה מחדש
      setPhase("menu");
      setTimeout(() => setPhase("resume-list"), 0);
    } catch {
      // ignore
    }
  }

  function resetDraft() {
    if (!window.confirm("לבטל את התעודה הנוכחית ולהתחיל מחדש? כל הפריטים שנוספו יימחקו.")) return;
    if (draftId !== null) {
      fetch(`/api/slips/${draftId}`, { method: "DELETE" }).catch(() => {});
    }
    clearLocalDraft();
    setPhase("menu");
    setMeta(emptySlipDraftMeta());
    setCart([]);
    setDraftId(null);
    setTab("catalog");
    setEditing(null);
    setKeypadFlow(null);
    setSaveError(null);
  }

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

  // מוסיף פריט חדש לעגלה — אם אותו מוצר כבר קיים בעגלה, שואל האם למזג לשורה אחת או להוסיף בנפרד
  // (יכול להיות באמת מוצר שונה — חיתוך אחר, או הזמנה נפרדת בשביל מישהו אחר)
  function addNewItemToCart(item: CartItem) {
    if (item.product_id !== null) {
      const existingIndex = cart.findIndex((it) => it.product_id === item.product_id && it.status !== "missing");
      if (existingIndex !== -1) {
        setDuplicatePrompt({ newItem: item, existingIndex });
        return;
      }
    }
    setCart((prev) => [...prev, item]);
    setTab("cart");
    setSearch("");
  }

  function handleMergeDuplicate() {
    if (!duplicatePrompt) return;
    const { newItem, existingIndex } = duplicatePrompt;
    setCart((prev) =>
      prev.map((it, i) => {
        if (i !== existingIndex) return it;
        return {
          ...it,
          qty: (Number(it.qty) || 0) + (Number(newItem.qty) || 0),
          ordered_weight:
            it.ordered_weight != null || newItem.ordered_weight != null
              ? (Number(it.ordered_weight) || 0) + (Number(newItem.ordered_weight) || 0)
              : null,
          actual_weight_for_billing:
            it.actual_weight_for_billing != null || newItem.actual_weight_for_billing != null
              ? (Number(it.actual_weight_for_billing) || 0) + (Number(newItem.actual_weight_for_billing) || 0)
              : null,
        };
      })
    );
    setDuplicatePrompt(null);
    setTab("cart");
    setSearch("");
  }

  function handleAddSeparateDuplicate() {
    if (!duplicatePrompt) return;
    setCart((prev) => [...prev, duplicatePrompt.newItem]);
    setDuplicatePrompt(null);
    setTab("cart");
    setSearch("");
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
      setKeypadFlow(null);
      addNewItemToCart(item);
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
    const isNew = editing?.index === null || editing?.index === undefined;
    setEditing(null);
    if (isNew) {
      addNewItemToCart(updated);
    } else {
      setCart((prev) => prev.map((it, i) => (i === editing.index ? updated : it)));
      setTab("cart");
      setSearch("");
    }
  }

  function handleDeleteItem() {
    if (editing?.index !== null && editing?.index !== undefined) {
      setCart((prev) => prev.filter((_, i) => i !== editing.index));
    }
    setEditing(null);
  }

  async function handleFinishSlip() {
    if (cart.length === 0) {
      setSaveError("העגלה ריקה");
      return;
    }
    if (draftId === null) {
      setSaveError("שגיאה — לא נמצאה תעודה פעילה");
      return;
    }
    setSaving(true);
    setSaveError(null);
    try {
      const res = await fetch(`/api/slips/${draftId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: cart, status: "completed" }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSaveError(data.error || "שגיאה בשמירה");
        setSaving(false);
        return;
      }
      clearLocalDraft();
      router.push(`/slips/${data.id}/print`);
    } catch {
      setSaveError("בעיית תקשורת — יש לבדוק חיבור ולנסות שוב");
      setSaving(false);
    }
  }

  if (phase === "menu") {
    return (
      <div className="min-h-screen flex flex-col">
        <AppHeader title="תעודה חדשה" backHref="/" />
        <MenuScreen
          onNew={() => {
            // התחלת הזמנה חדשה — מנקים כל שארית של תעודה קודמת שלא הושלמה (היא עדיין שמורה בשרת, נגישה דרך "המשך ליקוט קיים")
            clearLocalDraft();
            setMeta(emptySlipDraftMeta());
            setCart([]);
            setDraftId(null);
            setPhase("order-form");
          }}
          onResume={() => setPhase("resume-list")}
        />
      </div>
    );
  }

  if (phase === "order-form") {
    return (
      <div className="min-h-screen flex flex-col">
        <AppHeader title="פרטי הזמנה" onBack={() => setPhase("menu")} />
        <OrderForm
          meta={meta}
          setMeta={setMeta}
          onBack={() => setPhase("menu")}
          onStart={handleCreateOrder}
          starting={starting}
          startError={startError}
          orderNumberTaken={orderNumberTaken}
          onDismissError={() => setStartError(null)}
          onGoToResumeList={() => {
            setStartError(null);
            setPhase("resume-list");
          }}
        />
      </div>
    );
  }

  if (phase === "resume-list") {
    return (
      <div className="min-h-screen flex flex-col">
        <AppHeader title="המשך ליקוט קיים" onBack={() => setPhase("menu")} />
        <ResumeListScreen onResume={handleResumeDraft} onDelete={handleDeleteDraft} />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <AppHeader
        title={
          (meta.order_number ? `#${meta.order_number} · ` : "") + (meta.customer_name || "לקוח כללי")
        }
        onBack={() => setPhase("menu")}
      />

      <div className="flex border-b border-[var(--color-border)] bg-white sticky top-14 z-10">
        <button
          type="button"
          onClick={() => setTab("catalog")}
          className={`flex-1 py-3 font-bold ${tab === "catalog" ? "text-[var(--color-brand)] border-b-2 border-[var(--color-brand)]" : "text-[var(--color-text-muted)]"}`}
        >
          🧺 קטלוג ➕
        </button>
        <button
          type="button"
          onClick={() => setTab("cart")}
          className={`flex-1 py-3 font-bold ${tab === "cart" ? "text-[var(--color-brand)] border-b-2 border-[var(--color-brand)]" : "text-[var(--color-text-muted)]"}`}
        >
          🧾 עגלה {cart.length > 0 ? `(${cart.length})` : ""}
        </button>
        <button
          type="button"
          onClick={resetDraft}
          className="px-3 text-xs text-[var(--color-danger)] shrink-0"
          aria-label="ביטול תעודה"
        >
          🗑 ביטול
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
                  <div className="font-bold shrink-0 text-left">
                    {p.is_on_sale && p.sale_price ? (
                      <>
                        <div className="text-[var(--color-danger)]">{fmt(p.sale_price)}</div>
                        <div className="text-xs font-normal text-[var(--color-text-muted)] line-through">{fmt(p.price)}</div>
                      </>
                    ) : (
                      <div>{fmt(p.price)}</div>
                    )}
                    <span className="text-xs font-normal text-[var(--color-text-muted)]">/ {p.pricing_type === "weight" || p.pricing_type === "package" ? 'ק"ג' : "יח'"}</span>
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
              onClick={handleFinishSlip}
              disabled={saving || cart.length === 0}
              className="rounded-xl bg-[var(--color-brand)] text-white font-bold py-3 text-lg disabled:opacity-50"
            >
              {saving ? "שומר/ת..." : "✓ סיום ליקוט + הדפסה"}
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
              ? "משקל לפני ניקוי"
              : keypadFlow.item.unit === "unit"
                ? "כמות יחידות"
                : "משקל"
          }
          allowGramToggle={keypadFlow.item.unit !== "unit"}
          initialValue={keypadFlow.item.unit === "unit" ? "1" : ""}
          onConfirm={handleKeypadPrimaryConfirm}
          onClose={() => setKeypadFlow(null)}
          onMoreOptions={handleKeypadMoreOptions}
        />
      )}
      {keypadFlow && keypadFlow.stage === "clean" && (
        <WeightKeypad
          title={keypadFlow.item.name}
          label="משקל אחרי ניקוי — לתיעוד בלבד"
          allowGramToggle
          onConfirm={handleKeypadCleanConfirm}
          onClose={() => setKeypadFlow(null)}
        />
      )}

      {duplicatePrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-6">
          <div className="bg-white rounded-2xl p-5 w-full max-w-xs text-center shadow-xl">
            <div className="text-3xl mb-2">🔄</div>
            <div className="font-bold text-lg mb-1">{duplicatePrompt.newItem.name}</div>
            <div className="text-sm text-[var(--color-text-muted)] mb-4">
              כבר יש שורה כזו בעגלה — {cartQtyLabel(cart[duplicatePrompt.existingIndex])}
              <br />
              מוסיפים עכשיו: {cartQtyLabel(duplicatePrompt.newItem)}
            </div>
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={handleMergeDuplicate}
                className="w-full rounded-xl bg-[var(--color-brand)] text-white font-bold py-3"
              >
                🔗 מיזוג לשורה אחת
              </button>
              <button
                type="button"
                onClick={handleAddSeparateDuplicate}
                className="w-full rounded-xl border border-[var(--color-border)] font-bold py-3"
              >
                ➕ הוספה כשורה נפרדת
              </button>
              <button
                type="button"
                onClick={() => setDuplicatePrompt(null)}
                className="text-sm text-[var(--color-text-muted)] py-1"
              >
                ביטול
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
