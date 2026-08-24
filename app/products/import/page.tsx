"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import AppHeader from "@/components/AppHeader";
import { parseCsv } from "@/lib/csv";

const FIELD_GUESSES: Record<string, string[]> = {
  name: ["name", "שם", "שם המוצר", "product name", "title"],
  sku: ["sku", "מק\"ט", "מקט"],
  category: ["category", "categories", "קטגוריה", "קטגוריות"],
  image_url: ["images", "image", "image url", "תמונות", "תמונה", "תמונה url"],
  pricing_type: ["pricing type", "סוג תמחור"],
  price: ["price", "regular price", "מחיר", "מחיר רגיל"],
  sale_price: ["sale price", "מחיר מבצע"],
  is_on_sale: ["on sale", "במבצע"],
  package_description: ["package description", "תיאור מארז"],
  package_estimated_weight_min: ["min weight", "משקל משוער מינימום"],
  package_estimated_weight_max: ["max weight", "משקל משוער מקסימום"],
  package_fixed_price: ["package fixed price", "תמחור מארז קבוע", "מחיר קבוע למארז"],
  description: ["description", "תיאור מקוצר", "תיאור"],
  notes: ["notes", "הערות"],
};

const FIELD_LABELS: Record<ImportField, string> = {
  name: "שם מוצר (חובה)",
  sku: 'מק"ט',
  category: "קטגוריה",
  image_url: "קישור לתמונה",
  pricing_type: "סוג תמחור (unit / weight / package)",
  price: "מחיר רגיל",
  sale_price: "מחיר מבצע",
  is_on_sale: "במבצע (כן/לא)",
  package_description: "תיאור מארז",
  package_estimated_weight_min: "משקל משוער מינימום",
  package_estimated_weight_max: "משקל משוער מקסימום",
  package_fixed_price: "מחיר מארז קבוע (כן/לא) — במקום מחיר לק\"ג",
  description: "תיאור מקוצר",
  notes: "הערות",
};

type ImportField =
  | "name"
  | "sku"
  | "category"
  | "image_url"
  | "pricing_type"
  | "price"
  | "sale_price"
  | "is_on_sale"
  | "package_description"
  | "package_estimated_weight_min"
  | "package_estimated_weight_max"
  | "package_fixed_price"
  | "description"
  | "notes";

const IMPORT_FIELDS: ImportField[] = [
  "name",
  "sku",
  "category",
  "image_url",
  "pricing_type",
  "price",
  "sale_price",
  "is_on_sale",
  "package_description",
  "package_estimated_weight_min",
  "package_estimated_weight_max",
  "package_fixed_price",
  "description",
  "notes",
];

function guessColumn(headers: string[], field: string): number {
  const candidates = FIELD_GUESSES[field] || [];
  const lower = headers.map((h) => h.trim().toLowerCase());
  for (const c of candidates) {
    const idx = lower.indexOf(c.toLowerCase());
    if (idx !== -1) return idx;
  }
  return -1;
}

// "כן"/"לא" (או true/yes/1) → boolean
function parseBool(raw: string): boolean {
  const s = raw.trim();
  return s === "כן" || /^(true|yes|1)$/i.test(s);
}

// משקל מארז — תומך גם ב"700 גרם" (מומר לק"ג) וגם במספר נקי שכבר בק"ג
function parseWeightKg(raw: string): number | null {
  const s = raw.trim();
  if (!s) return null;
  const num = parseFloat(s.replace(/[^\d.]/g, ""));
  if (isNaN(num)) return null;
  return /גרם|gram|g\b/i.test(s) && !/ק"?ג|קילו|kg/i.test(s) ? num / 1000 : num;
}

export default function ImportProductsPage() {
  const router = useRouter();
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<string[][]>([]);
  const [mapping, setMapping] = useState<Record<ImportField, number>>({
    name: -1,
    sku: -1,
    category: -1,
    image_url: -1,
    pricing_type: -1,
    price: -1,
    sale_price: -1,
    is_on_sale: -1,
    package_description: -1,
    package_estimated_weight_min: -1,
    package_estimated_weight_max: -1,
    package_fixed_price: -1,
    description: -1,
    notes: -1,
  });
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [duplicates, setDuplicates] = useState<{ sku: string; name: string }[]>([]);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setResult(null);
    setDuplicates([]);
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
        image_url: guessColumn(hdrs, "image_url"),
        pricing_type: guessColumn(hdrs, "pricing_type"),
        price: guessColumn(hdrs, "price"),
        sale_price: guessColumn(hdrs, "sale_price"),
        is_on_sale: guessColumn(hdrs, "is_on_sale"),
        package_description: guessColumn(hdrs, "package_description"),
        package_estimated_weight_min: guessColumn(hdrs, "package_estimated_weight_min"),
        package_estimated_weight_max: guessColumn(hdrs, "package_estimated_weight_max"),
        package_fixed_price: guessColumn(hdrs, "package_fixed_price"),
        description: guessColumn(hdrs, "description"),
        notes: guessColumn(hdrs, "notes"),
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
      pricing_type: mapping.pricing_type !== -1 ? r[mapping.pricing_type] || "" : "",
      price: mapping.price !== -1 ? r[mapping.price] || "" : "",
      sale_price: mapping.sale_price !== -1 ? r[mapping.sale_price] || "" : "",
      image_url: mapping.image_url !== -1 ? r[mapping.image_url] || "" : "",
    }));
  }, [rows, mapping]);

  async function handleImport() {
    if (mapping.name === -1) {
      setError("יש לבחור עמודה לשם המוצר לפחות");
      return;
    }
    setImporting(true);
    setError(null);
    const importRows = rows.map((r) => {
      const salePriceRaw = mapping.sale_price !== -1 ? (r[mapping.sale_price] || "").trim() : "";
      const salePrice = salePriceRaw ? parseFloat(salePriceRaw.replace(/[^\d.]/g, "")) || 0 : 0;
      const pricingTypeRaw = mapping.pricing_type !== -1 ? (r[mapping.pricing_type] || "").trim().toLowerCase() : "";
      const isOnSale = mapping.is_on_sale !== -1 ? parseBool(r[mapping.is_on_sale] || "") : !!salePrice;
      const weightMin = mapping.package_estimated_weight_min !== -1 ? parseWeightKg(r[mapping.package_estimated_weight_min] || "") : null;
      const weightMax = mapping.package_estimated_weight_max !== -1 ? parseWeightKg(r[mapping.package_estimated_weight_max] || "") : null;
      const packageFixedPrice = mapping.package_fixed_price !== -1 ? parseBool(r[mapping.package_fixed_price] || "") : false;
      return {
        name: r[mapping.name] || "",
        sku: mapping.sku !== -1 ? r[mapping.sku] || "" : "",
        category: mapping.category !== -1 ? r[mapping.category] || "" : "",
        image_url: mapping.image_url !== -1 ? (r[mapping.image_url] || "").split(",")[0].trim() : "",
        pricing_type: pricingTypeRaw || undefined,
        price: mapping.price !== -1 ? parseFloat((r[mapping.price] || "0").replace(/[^\d.]/g, "")) || 0 : 0,
        sale_price: salePrice || undefined,
        is_on_sale: isOnSale,
        package_description: mapping.package_description !== -1 ? r[mapping.package_description] || "" : "",
        package_estimated_weight_min: weightMin || undefined,
        package_estimated_weight_max: weightMax || undefined,
        package_fixed_price: packageFixedPrice,
        description: mapping.description !== -1 ? r[mapping.description] || "" : "",
        notes: mapping.notes !== -1 ? r[mapping.notes] || "" : "",
      };
    });
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
      setDuplicates(Array.isArray(data.duplicates) ? data.duplicates : []);
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

            {IMPORT_FIELDS.map((field) => (
              <label key={field} className="flex flex-col gap-1">
                <span className="text-sm text-[var(--color-text-muted)]">{FIELD_LABELS[field]}</span>
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
                      <th className="text-right py-1">סוג תמחור</th>
                      <th className="text-right py-1">מחיר</th>
                      <th className="text-right py-1">מחיר מבצע</th>
                      <th className="text-right py-1">תמונה</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewRows.map((r, i) => (
                      <tr key={i} className="border-b border-[var(--color-border)]">
                        <td className="py-1">{r.name}</td>
                        <td className="py-1">{r.sku}</td>
                        <td className="py-1">{r.category}</td>
                        <td className="py-1">{r.pricing_type}</td>
                        <td className="py-1">{r.price}</td>
                        <td className="py-1">{r.sale_price}</td>
                        <td className="py-1 max-w-[120px] truncate">{r.image_url}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2">
              💡 עמודת &quot;סוג תמחור&quot; צריכה להכיל אחד מהערכים: <strong>unit</strong> (יחידה), <strong>weight</strong> (משקל) או <strong>package</strong> (מארז). שדה &quot;משקל ליחידה&quot; לא מיובא אוטומטית — ניתן להוסיף ידנית לכל מוצר רלוונטי אחרי הייבוא (בעריכת המוצר).
            </div>

            {error && <div className="text-sm text-[var(--color-danger)]">{error}</div>}
            {result && <div className="text-sm text-green-700">{result}</div>}

            {duplicates.length > 0 && (
              <div className="text-sm bg-amber-50 border border-amber-300 rounded-lg px-3 py-2 text-amber-900">
                <div className="font-bold mb-1">
                  ⚠️ {duplicates.length} מוצר{duplicates.length > 1 ? "ים" : ""} דולג{duplicates.length > 1 ? "ו" : ""} — מק&quot;ט כבר קיים בקטלוג:
                </div>
                <ul className="list-disc pr-5">
                  {duplicates.map((d, i) => (
                    <li key={i}>
                      מק&quot;ט {d.sku} — {d.name}
                    </li>
                  ))}
                </ul>
              </div>
            )}

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
