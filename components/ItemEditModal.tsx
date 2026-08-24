"use client";

import { useState } from "react";
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
  const [freeQty, setFreeQty] = useState<string>(item.qty ? String(item.qty) : "");
  const [unitPrice, setUnitPrice] = useState<string>(item.unit_price ? String(item.unit_price) : "");
  const [lineTotal, setLineTotal] = useState<string>(
    item.line_total !== null && item.line_total !== undefined ? String(item.line_total) : ""
  );
  const [note, setNote] = useState(item.note || "");
  const [unitCount, setUnitCount] = useState<string>(item.unit_count != null ? String(item.unit_count) : "");
  const [missing, setMissing] = useState(item.status === "missing");
  const [missingReason, setMissingReason] = useState(item.missing_reason || "");

  function handleSave() {
    const fq = parseFloat(freeQty);
    const up = parseFloat(unitPrice);
    const lt = parseFloat(lineTotal);
    const uc = parseFloat(unitCount);

    const updated: CartItem = {
      ...item,
      name: isFreeItem ? name.trim() || item.name : item.name,
      unit: isFreeItem ? unit : item.unit,
      qty: isFreeItem && !isNaN(fq) && fq >= 0 ? (unit === "unit" ? Math.max(1, Math.round(fq)) : fq) : item.qty,
      unit_price: isFreeItem && !isNaN(up) && up >= 0 ? up : item.unit_price,
      line_total: !isNaN(lt) && lt >= 0 ? lt : null,
      note,
      unit_count: item.unit_count != null ? (!isNaN(uc) && uc >= 1 ? Math.round(uc) : item.unit_count) : null,
      status: missing ? "missing" : "picked",
      missing_reason: missing ? missingReason.trim() : "",
    };
    onSave(updated);
  }

  return (
    <div className="fixed inset-0 z-30 flex items-end sm:items-center justify-center bg-black/30">
      <div className="bg-white w-full sm:max-w-sm sm:rounded-2xl rounded-t-2xl max-h-[92vh] overflow-y-auto flex flex-col">
        {/* ── אזור מידע — למוצר קטלוגי זה קריאה בלבד, למוצר חופשי זה ההגדרה שלו ── */}
        <div className="bg-[var(--color-bg-soft)] p-5 border-b border-[var(--color-border)]">
          {isFreeItem ? (
            <div className="flex flex-col gap-3">
              <label className="flex flex-col gap-1">
                <span className="text-sm text-[var(--color-text-muted)]">שם מוצר</span>
                <input
                  type="text"
                  className="field-underline font-bold text-lg"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="לדוגמה: מוצר מיוחד"
                  autoFocus
                />
              </label>
              <div className="flex gap-3">
                <label className="flex flex-col gap-1 flex-1">
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
                <label className="flex flex-col gap-1 flex-1">
                  <span className="text-sm text-[var(--color-text-muted)]">כמות</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    step={unit === "unit" ? "1" : "0.01"}
                    min="0"
                    className="field-underline"
                    value={freeQty}
                    onChange={(e) => setFreeQty(e.target.value)}
                  />
                </label>
              </div>
              <label className="flex flex-col gap-1">
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
            </div>
          ) : (
            <>
              <div className="font-bold text-xl">{item.name}</div>
              {item.description && (
                <div className="text-sm text-[var(--color-text-muted)] mt-1">{item.description}</div>
              )}
              <div className="font-bold text-lg mt-2">
                {fmt(item.unit_price)} <span className="text-sm font-normal">{isWeight ? '/ ק"ג' : "/ יח'"}</span>
              </div>
            </>
          )}
        </div>

        {/* ── אזור פעיל — סימון חוסר / הערה ── */}
        <div className="p-5 flex flex-col gap-4">
          <button
            type="button"
            onClick={() => setMissing((v) => !v)}
            className={`w-full flex items-center justify-center gap-2 rounded-lg py-2.5 font-bold text-sm border ${
              missing
                ? "bg-[var(--color-danger)] text-white border-[var(--color-danger)]"
                : "border-[var(--color-border)] text-[var(--color-text-muted)]"
            }`}
          >
            {missing ? "✕ מסומן כלא לוקט / חסר" : "✕ סמן כלא לוקט / חסר"}
          </button>

          {missing ? (
            <label className="flex flex-col gap-1">
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
              {item.unit_count != null && (
                <label className="flex flex-col gap-1">
                  <span className="text-sm text-[var(--color-text-muted)]">
                    🐔 כמה יחידות שקלת יחד? (למשל: 2 עופות)
                  </span>
                  <input
                    type="number"
                    inputMode="numeric"
                    step="1"
                    min="1"
                    className="field-underline"
                    value={unitCount}
                    onChange={(e) => setUnitCount(e.target.value)}
                  />
                </label>
              )}

              <label className="flex flex-col gap-1">
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
            </>
          )}

          <label className="flex flex-col gap-1">
            <span className="text-sm text-[var(--color-text-muted)]">📝 הערה למוצר (תודפס בתעודה)</span>
            <input
              type="text"
              className="field-underline"
              placeholder="לא חובה"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </label>
        </div>

        <div className="p-5 pt-0 flex flex-col gap-2">
          <button
            type="button"
            onClick={handleSave}
            className="w-full rounded-xl bg-[var(--color-brand)] text-white font-bold py-3"
          >
            {isNew ? "✓ הוספה לעגלה" : "✓ שמירה"}
          </button>
          {!isNew && onDelete && (
            <button
              type="button"
              onClick={onDelete}
              className="w-full rounded-xl border border-[var(--color-danger)] text-[var(--color-danger)] font-bold py-3"
            >
              🗑 הסרה מהעגלה
            </button>
          )}
          <button type="button" onClick={onCancel} className="w-full rounded-xl border border-[var(--color-border)] py-3">
            ביטול
          </button>
        </div>
      </div>
    </div>
  );
}

export { computeItemPrice };
