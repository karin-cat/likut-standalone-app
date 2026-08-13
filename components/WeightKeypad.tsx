"use client";

import { useState } from "react";

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0", "אשר"];

export default function WeightKeypad({
  title,
  label,
  onConfirm,
  onClose,
  onMoreOptions,
  initialValue,
  allowGramToggle = false,
}: {
  title: string;
  label: string;
  onConfirm: (value: number) => void;
  onClose: () => void;
  onMoreOptions?: () => void;
  initialValue?: string;
  allowGramToggle?: boolean;
}) {
  const [digits, setDigits] = useState(initialValue || "");
  const [entryUnit, setEntryUnit] = useState<"kg" | "gram">("kg");

  function pressKey(k: string) {
    if (k === "אשר") {
      const v = parseFloat(digits);
      if (!isNaN(v) && v > 0) onConfirm(entryUnit === "gram" ? v / 1000 : v);
      return;
    }
    if (k === ".") {
      if (digits.includes(".")) return;
      setDigits((d) => (d === "" ? "0." : d + "."));
      return;
    }
    // הגבלת אורך סבירה
    if (digits.replace(".", "").length >= 6) return;
    setDigits((d) => (d === "0" ? k : d + k));
  }

  function switchUnit(u: "kg" | "gram") {
    if (u === entryUnit) return;
    setEntryUnit(u);
    setDigits("");
  }

  function backspace() {
    setDigits((d) => d.slice(0, -1));
  }

  return (
    <div className="fixed inset-0 z-40 bg-white flex flex-col">
      <div className="flex items-center justify-between px-4 h-14 border-b border-[var(--color-border)] shrink-0">
        <button type="button" onClick={onClose} className="text-2xl w-8 text-[var(--color-text-muted)]" aria-label="סגירה">
          ✕
        </button>
        <div className="font-bold text-lg truncate">{title}</div>
        <span className="w-8" />
      </div>

      <div className="flex-1 flex flex-col justify-end px-6 pb-6">
        <div className="flex items-center justify-between mb-1">
          <div className="text-sm text-[var(--color-text-muted)]">
            {label} {allowGramToggle ? `(${entryUnit === "kg" ? 'ק"ג' : "גרם"})` : ""}
          </div>
          {allowGramToggle && (
            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => switchUnit("kg")}
                className={`px-3 py-1 rounded-full text-xs font-bold border ${
                  entryUnit === "kg"
                    ? "bg-[var(--color-brand)] text-white border-[var(--color-brand)]"
                    : "border-[var(--color-border)] text-[var(--color-text-muted)]"
                }`}
              >
                ק&quot;ג
              </button>
              <button
                type="button"
                onClick={() => switchUnit("gram")}
                className={`px-3 py-1 rounded-full text-xs font-bold border ${
                  entryUnit === "gram"
                    ? "bg-[var(--color-brand)] text-white border-[var(--color-brand)]"
                    : "border-[var(--color-border)] text-[var(--color-text-muted)]"
                }`}
              >
                גרם
              </button>
            </div>
          )}
        </div>
        <div className="flex items-center justify-between">
          <div className="text-6xl font-bold tabular-nums">{digits || "0"}</div>
          <button
            type="button"
            onClick={backspace}
            className="w-12 h-12 rounded-lg bg-[var(--color-bg-soft)] flex items-center justify-center text-xl shrink-0"
            aria-label="מחיקה"
          >
            ⌫
          </button>
        </div>
        {onMoreOptions && (
          <button type="button" onClick={onMoreOptions} className="mt-4 text-sm text-[var(--color-brand-dark)] font-bold self-start">
            ⚙️ אפשרויות נוספות (הערה / מחיר ידני)
          </button>
        )}
      </div>

      <div className="grid grid-cols-3 border-t border-[var(--color-border)] shrink-0">
        {KEYS.map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => pressKey(k)}
            className={`h-20 border border-[var(--color-border)] text-3xl font-bold flex items-center justify-center active:bg-[var(--color-bg-soft)] ${
              k === "אשר" ? "text-[var(--color-brand)]" : ""
            }`}
          >
            {k}
          </button>
        ))}
      </div>
    </div>
  );
}
