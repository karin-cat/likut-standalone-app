"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import AppHeader from "@/components/AppHeader";
import { parseCsv } from "@/lib/csv";

const FIELD_GUESSES: Record<string, string[]> = {
  name: ["name", "שם", "product name", "title"],
  sku: ["sku", "מק\"ט", "מקט"],
  category: ["category", "categories", "קטגוריה", "קטגוריות"],
  price: ["price", "regular price", "מחיר", "מחיר רגיל"],
};

function guessColumn(headers: string[], field: string): number {
  const candidates = FIELD_GUESSES[field] || [];
  const lower = headers.map((h) => h.trim().toLowerCase());
  for (const c of candidates) {
    const idx = lower.indexOf(c.toLowerCase());
    if (idx !== -1) return idx;
  }
  return -1;
}

export default function ImportProductsPage() {
  const router = useRouter();
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<string[][]>([]);
  const [mapping, setMapping] = useState<{ name: number; sku: number; category: number; price: number }>({
    name: -1,
    sku: -1,
    category: -1,
    price: -1,
  });
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setResult(null);
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result || "");
      const parsed = parseCsv(text);
      if (parsed.length < 2) {
        setError("הקובץ ריק או לא בפורמט CSV תקין");
        return;
      }
      const hdrs = parsed[0];
      setHeaders(hdrs);
      setRows(parsed.slice(1));
      setMapping({
        name: guessColumn(hdrs, "name"),
        sku: guessColumn(hdrs, "sku"),
        category: guessColumn(hdrs, "category"),
        price: guessColumn(hdrs, "price"),
      });
    };
    reader.readAsText(file, "utf-8");
  }

  const previewRows = useMemo(() => {
    if (mapping.name === -1) return [];
    return rows.slice(0, 5).map((r) => ({
      name: r[mapping.name] || "",
      sku: mapping.sku !== -1 ? r[mapping.sku] || "" : "",
      category: mapping.category !== -1 ? r[mapping.category] || "" : "",
      price: mapping.price !== -1 ? r[mapping.price] || "" : "",
    }));
  }, [rows, mapping]);

  async function handleImport() {
    if (mapping.name === -1) {
      setError("יש לבחור עמודה לשם המוצר לפחות");
      return;
    }
    setImporting(true);
    setError(null);
    const importRows = rows.map((r) => ({
      name: r[mapping.name] || "",
      sku: mapping.sku !== -1 ? r[mapping.sku] || "" : "",
      category: mapping.category !== -1 ? r[mapping.category] || "" : "",
      price: mapping.price !== -1 ? parseFloat((r[mapping.price] || "0").replace(/[^\d.]/g, "")) || 0 : 0,
    }));
    try {
      const res = await fetch("/api/products/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: importRows }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "שגיאה בייבוא");
        setImporting(false);
        return;
      }
      setResult(`יובאו ${data.inserted} מוצרים בהצלחה.`);
      setImporting(false);
    } catch {
      setError("בעיית תקשורת");
      setImporting(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      <AppHeader title="ייבוא קטלוג מקובץ" backHref="/products" />

      <div className="p-4 flex flex-col gap-4 pb-10">
        <div className="text-sm text-[var(--color-text-muted)]">
          יש לייצא את המוצרים מוורדפרס לקובץ CSV (WooCommerce → מוצרים → ייצוא), ואז לבחור אותו כאן.
        </div>

        <input type="file" accept=".csv,text/csv" onChange={handleFile} />

        {headers.length > 0 && (
          <>
            <div className="text-sm text-[var(--color-text-muted)]">
              נמצאו {rows.length} שורות. יש לוודא שהמיפוי נכון:
            </div>

            {(["name", "sku", "category", "price"] as const).map((field) => (
              <label key={field} className="flex flex-col gap-1">
                <span className="text-sm text-[var(--color-text-muted)]">
                  {field === "name" ? "שם מוצר (חובה)" : field === "sku" ? 'מק"ט' : field === "category" ? "קטגוריה" : "מחיר"}
                </span>
                <select
                  className="field-underline"
                  value={mapping[field]}
                  onChange={(e) => setMapping({ ...mapping, [field]: Number(e.target.value) })}
                >
                  <option value={-1}>— לא לייבא —</option>
                  {headers.map((h, i) => (
                    <option key={i} value={i}>
                      {h}
                    </option>
                  ))}
                </select>
              </label>
            ))}

            {previewRows.length > 0 && (
              <div className="text-sm">
                <div className="font-bold mb-1">תצוגה מקדימה:</div>
                <table className="w-full border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-[var(--color-border)]">
                      <th className="text-right py-1">שם</th>
                      <th className="text-right py-1">מק&quot;ט</th>
                      <th className="text-right py-1">קטגוריה</th>
                      <th className="text-right py-1">מחיר</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewRows.map((r, i) => (
                      <tr key={i} className="border-b border-[var(--color-border)]">
                        <td className="py-1">{r.name}</td>
                        <td className="py-1">{r.sku}</td>
                        <td className="py-1">{r.category}</td>
                        <td className="py-1">{r.price}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2">
              💡 שדות &quot;נמכר לפי משקל&quot; ו&quot;מצריך ניקוי&quot; לא מיובאים אוטומטית — יש לסמן אותם ידנית לכל מוצר רלוונטי אחרי הייבוא (בעריכת המוצר).
            </div>

            {error && <div className="text-sm text-[var(--color-danger)]">{error}</div>}
            {result && <div className="text-sm text-green-700">{result}</div>}

            {!result && (
              <button
                type="button"
                onClick={handleImport}
                disabled={importing}
                className="rounded-xl bg-[var(--color-brand)] text-white font-bold py-3 disabled:opacity-50"
              >
                {importing ? "מייבא/ת..." : `📥 ייבוא ${rows.length} מוצרים`}
              </button>
            )}
            {result && (
              <button
                type="button"
                onClick={() => router.push("/products")}
                className="rounded-xl bg-[var(--color-brand)] text-white font-bold py-3"
              >
                חזרה לרשימת מוצרים
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
