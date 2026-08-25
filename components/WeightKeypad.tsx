"use client";

import { useEffect, useState } from "react";

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9"];

export default function WeightKeypad({
  title,
  priceLabel,
  imageUrl,
  avatarColor,
  label,
  onConfirm,
  onClose,
  onMoreOptions,
  initialValue,
  allowGramToggle = false,
  notice,
}: {
  title: string;
  priceLabel?: string;
  imageUrl?: string | null;
  avatarColor?: string;
  label: string;
  onConfirm: (value: number) => void;
  onClose: () => void;
  onMoreOptions?: (currentValue: number | null) => void;
  initialValue?: string;
  allowGramToggle?: boolean;
  notice?: string | null;
}) {
  const [digits, setDigits] = useState(initialValue || "");
  const [entryUnit, setEntryUnit] = useState<"kg" | "gram">("kg");

  // נועל את גלילת העמוד שברקע כל עוד המקלדת פתוחה — אחרת גלילה בתוך המקלדת
  // "מדליפה" לעמוד שמתחת (הקטלוג נראה זז ברקע)
  useEffect(() => {
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, []);

  function pressKey(k: string) {
    if (k === ".") {
      if (digits.includes(".")) return;
      setDigits((d) => (d === "" ? "0." : d + "."));
      return;
    }
    // הגבלת אורך סבירה
    if (digits.replace(".", "").length >= 6) return;
    setDigits((d) => (d === "0" ? k : d + k));
  }

  // הערך המספרי שהוקלד עד כה (מומר לק"ג אם רלוונטי) — null אם עדיין לא הוקלד כלום תקין
  function currentValue(): number | null {
    const v = parseFloat(digits);
    if (isNaN(v) || v <= 0) return null;
    return entryUnit === "gram" ? v / 1000 : v;
  }

  function handleConfirm() {
    const v = currentValue();
    if (v !== null) onConfirm(v);
  }

  function switchUnit(u: "kg" | "gram") {
    if (u === entryUnit) return;
    setEntryUnit(u);
    setDigits("");
  }

  function backspace() {
    setDigits((d) => d.slice(0, -1));
  }

  // צעד ההעלאה/הורדה בטוגל +/- : יחידות שלמות ליחידה, 100 גרם / 0.1 ק"ג למוצרי משקל
  const step = !allowGramToggle ? 1 : entryUnit === "gram" ? 50 : 0.1;

  function step3(n: number): string {
    const rounded = Math.round(n * 1000) / 1000;
    return String(rounded);
  }

  function increment() {
    // עדכון פונקציונלי — כדי שלחיצות מהירות ברצף (טאבל-טאב) לא "יבלעו" זו את זו
    setDigits((d) => step3((parseFloat(d) || 0) + step));
  }

  function decrement() {
    setDigits((d) => step3(Math.max(0, (parseFloat(d) || 0) - step)));
  }

  // לחיצה על התצוגה הגדולה — מנקה כדי שאפשר יהיה להתחיל להקליד ערך חדש מאפס
  function clearDigits() {
    setDigits("");
  }

  return (
    <div className="fixed inset-0 z-40 bg-white overflow-y-auto overscroll-contain">
      <div className="flex items-start justify-between px-4 py-2 border-b border-[var(--color-border)] sticky top-0 bg-white z-10">
        <button type="button" onClick={onClose} className="text-2xl w-8 shrink-0 text-[var(--color-text-muted)]" aria-label="סגירה">
          ✕
        </button>
        <div className="flex-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 min-w-0 justify-center py-1">
          {imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={imageUrl} alt="" className="w-9 h-9 rounded-lg object-cover shrink-0" />
          ) : (
            <div
              className="w-9 h-9 rounded-lg shrink-0 flex items-center justify-center text-white font-bold text-sm"
              style={{ background: avatarColor || "#999" }}
            >
              {title.trim().charAt(0)}
            </div>
          )}
          <span className="font-bold text-lg text-center">{title}</span>
          {priceLabel && <span className="text-xs text-[var(--color-text-muted)] shrink-0">{priceLabel}</span>}
        </div>
        <span className="w-8 shrink-0" />
      </div>

      {notice && (
        <div className="mx-6 mt-4 bg-amber-50 border border-amber-300 rounded-lg px-3 py-2 text-sm text-amber-900">
          {notice}
        </div>
      )}

      <div className="px-4 pb-3 pt-3">
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
          <div className="flex flex-col gap-2 shrink-0 w-36">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={increment}
                className="flex-1 h-16 rounded-lg bg-[var(--color-bg-soft)] flex items-center justify-center text-3xl font-bold text-[var(--color-brand)]"
                aria-label="הוספת יחידה"
              >
                +
              </button>
              <button
                type="button"
                onClick={decrement}
                className="flex-1 h-16 rounded-lg bg-[var(--color-bg-soft)] flex items-center justify-center text-3xl font-bold text-[var(--color-text-muted)]"
                aria-label="הפחתת יחידה"
              >
                −
              </button>
            </div>
            <button
              type="button"
              onClick={backspace}
              className="w-full h-16 rounded-lg bg-[var(--color-bg-soft)] flex items-center justify-center text-2xl"
              aria-label="מחיקה"
            >
              ⌫
            </button>
          </div>
          <button
            type="button"
            onClick={clearDigits}
            className="flex-1 min-w-0 text-5xl font-bold tabular-nums text-left whitespace-nowrap"
            aria-label="ניקוי כדי להקליד ערך חדש"
          >
            {digits || "0"}
          </button>
        </div>
        {onMoreOptions && (
          <button
            type="button"
            onClick={() => onMoreOptions(currentValue())}
            className="my-5 text-sm text-[var(--color-brand-dark)] font-bold self-start"
          >
            ⚙️ אפשרויות נוספות (הערה / מחיר ידני)
          </button>
        )}
      </div>

      <div className="px-4 py-2 border-t border-[var(--color-border)] grid grid-cols-4 gap-2">
        <button
          type="button"
          onClick={() => pressKey(".")}
          className="rounded-xl border border-[var(--color-border)] text-2xl font-bold py-2.5 active:bg-[var(--color-bg-soft)]"
        >
          .
        </button>
        <button
          type="button"
          onClick={() => pressKey("0")}
          className="rounded-xl border border-[var(--color-border)] text-2xl font-bold py-2.5 active:bg-[var(--color-bg-soft)]"
        >
          0
        </button>
        <button
          type="button"
          onClick={handleConfirm}
          className="col-span-2 rounded-xl bg-[var(--color-brand)] text-white font-bold text-xl py-2.5"
        >
          ✓ אשר
        </button>
      </div>

      <div className="grid grid-cols-3">
        {KEYS.map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => pressKey(k)}
            className="h-16 border border-[var(--color-border)] text-3xl font-bold flex items-center justify-center active:bg-[var(--color-bg-soft)]"
          >
            {k}
          </button>
        ))}
      </div>
    </div>
  );
}
