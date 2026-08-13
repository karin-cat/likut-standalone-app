"use client";

import { useMemo, useState } from "react";
import type { CartItem } from "@/lib/types";
import { computeItemPrice } from "@/lib/types";

function fmt(n: number): string {
  return "₪" + n.toFixed(2);
}

export default function ItemEditModal({
  item,
  isNew,
  onCancel,
  onSave,
  onDelete,
}: {
  item: CartItem;
  isNew: boolean;
  onCancel: () => void;
  onSave: (item: CartItem) => void;
  onDelete?: () => void;
}) {
  const isFreeItem = item.product_id === null;
  const [name, setName] = useState(item.name);
  const [unit, setUnit] = useState<CartItem["unit"]>(item.unit);
  const isWeight = unit !== "unit";
  const [qty, setQty] = useState<string>(item.qty ? String(item.qty) : "");
  const [unitPrice, setUnitPrice] = useState<string>(item.unit_price ? String(item.unit_price) : "");
  const [lineTotal, setLineTotal] = useState<string>(
    item.line_total !== null && item.line_total !== undefined ? String(item.line_total) : ""
  );
  const [note, setNote] = useState(item.note || "");
  const [orderedWeight, setOrderedWeight] = useState<string>(
    item.ordered_weight !== null && item.ordered_weight !== undefined ? String(item.ordered_weight) : ""
  );
  const [actualWeightForBilling, setActualWeightForBilling] = useState<string>(
    item.actual_weight_for_billing !== null && item.actual_weight_for_billing !== undefined ? String(item.actual_weight_for_billing) : ""
  );
  const [cleanWeight, setCleanWeight] = useState<string>(
    item.clean_weight !== null && item.clean_weight !== undefined ? String(item.clean_weight) : ""
  );
  const [missing, setMissing] = useState(item.status === "missing");
  const [missingReason, setMissingReason] = useState(item.missing_reason || "");

  const calcText = useMemo(() => {
    const up = parseFloat(unitPrice) || 0;
    let base = 0;

    // אם יש משקל בפועל ללחיוב, משתמש בו (cleaning products)
    if (item.requires_cleaning && actualWeightForBilling) {
      const awb = parseFloat(actualWeightForBilling) || 0;
      base = awb * up;
    } else {
      const q = parseFloat(qty) || 0;
      base = unit === "gram" ? (q / 1000) * up : q * up;
    }

    const lt = parseFloat(lineTotal);
    let txt = `מחיר רגיל: ${fmt(base)}`;
    if (!isNaN(lt) && lt >= 0) txt += `  ·  מחיר סופי (דורס): ${fmt(lt)}`;
    return txt;
  }, [qty, unitPrice, lineTotal, unit, item.requires_cleaning, actualWeightForBilling]);

  function handleSave() {
    const q = parseFloat(qty);
    const up = parseFloat(unitPrice);
    const lt = parseFloat(lineTotal);
    const ow = parseFloat(orderedWeight);
    const awb = parseFloat(actualWeightForBilling);
    const cw = parseFloat(cleanWeight);

    const updated: CartItem = {
      ...item,
      name: isFreeItem ? name.trim() || item.name : item.name,
      unit: isFreeItem ? unit : item.unit,
      qty: !isNaN(q) && q >= 0 ? (item.unit === "unit" ? Math.max(1, Math.round(q)) : q) : item.qty,
      unit_price: !isNaN(up) && up >= 0 ? up : item.unit_price,
      line_total: !isNaN(lt) && lt >= 0 ? lt : null,
      note,
      ordered_weight: item.requires_cleaning ? (!isNaN(ow) && ow >= 0 ? ow : null) : null,
      actual_weight_for_billing: item.requires_cleaning ? (!isNaN(awb) && awb >= 0 ? awb : null) : null,
      clean_weight: item.requires_cleaning ? (!isNaN(cw) && cw >= 0 ? cw : null) : null,
      status: missing ? "missing" : "picked",
      missing_reason: missing ? missingReason.trim() : "",
    };
    onSave(updated);
  }

  return (
    <div className="fixed inset-0 z-30 flex items-end sm:items-center justify-center bg-black/30">
      <div className="bg-white w-full sm:max-w-sm sm:rounded-2xl rounded-t-2xl p-5 max-h-[92vh] overflow-y-auto">
        {isFreeItem ? (
          <label className="flex flex-col gap-1 mb-3">
            <span className="text-sm text-[var(--color-text-muted)]">שם מוצר</span>
            <input
              type="text"
              className="field-underline font-bold"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="לדוגמה: מוצר מיוחד"
              autoFocus
            />
          </label>
        ) : (
          <div className="font-bold text-lg mb-1">✏️ {item.name}</div>
        )}
        {isNew && <div className="text-xs text-[var(--color-text-muted)] mb-3">הוספה לעגלה</div>}

        {isFreeItem && (
          <label className="flex flex-col gap-1 mb-3">
            <span className="text-sm text-[var(--color-text-muted)]">יחידת מידה</span>
            <select
              className="field-underline"
              value={unit}
              onChange={(e) => setUnit(e.target.value as CartItem["unit"])}
            >
              <option value="unit">יח&apos;</option>
              <option value="kg">ק&quot;ג</option>
              <option value="gram">גרם</option>
            </select>
          </label>
        )}

        <button
          type="button"
          onClick={() => setMissing((v) => !v)}
          className={`w-full flex items-center justify-center gap-2 rounded-lg py-2 mb-3 font-bold text-sm border ${
            missing
              ? "bg-[var(--color-danger)] text-white border-[var(--color-danger)]"
              : "border-[var(--color-border)] text-[var(--color-text-muted)]"
          }`}
        >
          {missing ? "✕ מסומן כלא לוקט / חסר" : "✕ סמן כלא לוקט / חסר"}
        </button>

        {missing ? (
          <label className="flex flex-col gap-1 mb-5">
            <span className="text-sm text-[var(--color-text-muted)]">
              סיבה (למשל: &quot;חסר במלאי, יגיע חודש הבא&quot;)
            </span>
            <input
              type="text"
              className="field-underline"
              value={missingReason}
              onChange={(e) => setMissingReason(e.target.value)}
              autoFocus
            />
          </label>
        ) : (
          <>
            {item.requires_cleaning && (
              <div className="bg-amber-50 border border-amber-300 text-amber-800 text-sm font-bold rounded-lg px-3 py-2 mb-3 text-center">
                ⚠️ מוצר שמצריך ניקוי — החיוב על המשקל <u>לפני</u> הניקוי
              </div>
            )}

            {item.catalog_price !== null && item.catalog_price > 0 && (
              <div className="text-sm text-blue-700 font-bold mb-3">
                🏷️ מחיר קטלוגי: {fmt(item.catalog_price)} {isWeight ? "/ ק\"ג" : "/ יח'"}
              </div>
            )}

            <label className="flex flex-col gap-1 mb-3">
              <span className="text-sm text-[var(--color-text-muted)]">📦 כמה הוזמן — למראה בתעודה</span>
              <input
                type="number"
                inputMode="decimal"
                step={isWeight ? "0.01" : "1"}
                min="0"
                className="field-underline"
                value={orderedWeight}
                onChange={(e) => setOrderedWeight(e.target.value)}
                placeholder={isWeight ? "למשל: 6" : "למשל: 10"}
              />
              <span className="text-xs text-[var(--color-text-muted)]">יוצג בתעודה כ: "הוזמן X, בפועל Y"</span>
            </label>

            {isWeight ? (
              <>
                {item.requires_cleaning ? (
                  <>
                    <label className="flex flex-col gap-1 mb-3">
                      <span className="text-sm text-[var(--color-text-muted)] font-bold">⚖️ משקל בפועל ולחיוב (ק"ג) — לחישוב מחיר</span>
                      <input
                        type="number"
                        inputMode="decimal"
                        step="0.01"
                        min="0"
                        className="field-underline"
                        value={actualWeightForBilling}
                        onChange={(e) => setActualWeightForBilling(e.target.value)}
                        placeholder="למשל: 5"
                      />
                    </label>
                  </>
                ) : (
                  <label className="flex flex-col gap-1 mb-3">
                    <span className="text-sm text-[var(--color-text-muted)]">⚖️ משקל בפועל (ק"ג)</span>
                    <input
                      type="number"
                      inputMode="decimal"
                      step="0.01"
                      min="0"
                      className="field-underline"
                      value={qty}
                      onChange={(e) => setQty(e.target.value)}
                      placeholder="למשל: 5"
                    />
                  </label>
                )}
              </>
            ) : (
              <label className="flex flex-col gap-1 mb-3">
                <span className="text-sm text-[var(--color-text-muted)]">
                  📦 כמות בפועל
                </span>
                <input
                  type="number"
                  inputMode="decimal"
                  step="1"
                  min="0"
                  className="field-underline"
                  value={qty}
                  onChange={(e) => setQty(e.target.value)}
                  placeholder="למשל: 3"
                />
              </label>
            )}

            <label className="flex flex-col gap-1 mb-1">
              <span className="text-sm text-[var(--color-text-muted)]">
                מחיר {isWeight ? 'לק"ג' : "ליחידה"} (₪)
              </span>
              <input
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0"
                className="field-underline"
                value={unitPrice}
                onChange={(e) => setUnitPrice(e.target.value)}
              />
            </label>

            <div className="text-xs text-[var(--color-text-muted)] font-semibold my-2">{calcText}</div>

            <label className="flex flex-col gap-1 mb-3">
              <span className="text-sm text-[var(--color-text-muted)]">💰 מחיר סופי לשורה (₪) — לא חובה, דורס</span>
              <input
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0"
                placeholder="אוטומטי"
                className="field-underline"
                value={lineTotal}
                onChange={(e) => setLineTotal(e.target.value)}
              />
            </label>

            {item.requires_cleaning && (
              <label className="flex flex-col gap-1 mb-3">
                <span className="text-sm text-[var(--color-text-muted)]">🧽 משקל אחרי ניקוי (ק&quot;ג) — לתיעוד בלבד</span>
                <input
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min="0"
                  className="field-underline"
                  value={cleanWeight}
                  onChange={(e) => setCleanWeight(e.target.value)}
                />
              </label>
            )}
          </>
        )}

        <label className="flex flex-col gap-1 mb-5">
          <span className="text-sm text-[var(--color-text-muted)]">📝 הערה (תודפס בתעודה)</span>
          <input
            type="text"
            className="field-underline"
            placeholder="לא חובה"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </label>

        <button
          type="button"
          onClick={handleSave}
          className="w-full rounded-xl bg-[var(--color-brand)] text-white font-bold py-3 mb-2"
        >
          {isNew ? "✓ הוספה לעגלה" : "✓ שמירה"}
        </button>
        {!isNew && onDelete && (
          <button
            type="button"
            onClick={onDelete}
            className="w-full rounded-xl border border-[var(--color-danger)] text-[var(--color-danger)] font-bold py-3 mb-2"
          >
            🗑 הסרה מהעגלה
          </button>
        )}
        <button type="button" onClick={onCancel} className="w-full rounded-xl border border-[var(--color-border)] py-3">
          ביטול
        </button>
      </div>
    </div>
  );
}

export { computeItemPrice };
