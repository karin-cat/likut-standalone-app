"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Product, PricingType, Category } from "@/lib/types";

export interface ProductFormValues {
  name: string;
  sku: string;
  category: string;
  categoryId: string;
  imageUrl: string;
  pricingType: PricingType;
  price: string;
  salePrice: string;
  isOnSale: boolean;
  requires_cleaning: boolean;
  unitWeight: string;
  packageDescription: string;
  packageWeightMin: string;
  packageWeightMax: string;
  description: string;
  notes: string;
}

function toFormValues(p?: Product): ProductFormValues {
  return {
    name: p?.name || "",
    sku: p?.sku || "",
    category: p?.category || "",
    categoryId: p?.category_id ? String(p.category_id) : "",
    imageUrl: p?.image_url || "",
    pricingType: p?.pricing_type || "unit",
    price: p != null ? String(p.price) : "",
    salePrice: p?.sale_price != null ? String(p.sale_price) : "",
    isOnSale: p?.is_on_sale || false,
    requires_cleaning: p?.requires_cleaning || false,
    unitWeight: p?.unit_weight != null ? String(p.unit_weight) : "",
    packageDescription: p?.package_description || "",
    packageWeightMin: p?.package_estimated_weight_min != null ? String(p.package_estimated_weight_min) : "",
    packageWeightMax: p?.package_estimated_weight_max != null ? String(p.package_estimated_weight_max) : "",
    description: p?.description || "",
    notes: p?.notes || "",
  };
}

export default function ProductForm({ product, id }: { product?: Product; id?: number }) {
  const router = useRouter();
  const [values, setValues] = useState<ProductFormValues>(toFormValues(product));
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);

  useEffect(() => {
    fetch("/api/categories")
      .then((r) => r.json())
      .then((data) => {
        setCategories(Array.isArray(data) ? data : []);
        setLoadingCategories(false);
      })
      .catch(() => setLoadingCategories(false));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const price = parseFloat(values.price) || 0;
      const salePrice = values.salePrice ? parseFloat(values.salePrice) : null;

      const payload = {
        name: values.name,
        sku: values.sku || null,
        category: values.category || null,
        category_id: values.categoryId ? parseInt(values.categoryId) : null,
        image_url: values.imageUrl || null,
        unit: "unit", // legacy, not used
        price,
        pricing_type: values.pricingType,
        sale_price: salePrice,
        is_on_sale: values.isOnSale,
        sold_by_weight: values.pricingType === "weight", // legacy
        requires_cleaning: values.pricingType === "weight" ? values.requires_cleaning : false,
        unit_weight: values.pricingType === "unit" ? (parseFloat(values.unitWeight) || null) : null,
        package_description: values.pricingType === "package" ? (values.packageDescription || null) : null,
        package_estimated_weight_min: values.pricingType === "package" ? (parseFloat(values.packageWeightMin) || null) : null,
        package_estimated_weight_max: values.pricingType === "package" ? (parseFloat(values.packageWeightMax) || null) : null,
        description: values.description || null,
        notes: values.notes || null,
      };
      const res = await fetch(id ? `/api/products/${id}` : "/api/products", {
        method: id ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "שגיאה בשמירה");
        setSaving(false);
        return;
      }
      router.push("/products");
      router.refresh();
    } catch {
      setError("בעיית תקשורת");
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!id) return;
    if (!confirm(`למחוק את "${values.name}"?`)) return;
    setDeleting(true);
    await fetch(`/api/products/${id}`, { method: "DELETE" });
    router.push("/products");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="p-4 flex flex-col gap-4 pb-28">
      <label className="flex flex-col gap-1">
        <span className="text-sm text-[var(--color-text-muted)]">שם מוצר</span>
        <input
          className="field-underline"
          required
          value={values.name}
          onChange={(e) => setValues({ ...values, name: e.target.value })}
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm text-[var(--color-text-muted)]">תיאור מקוצר</span>
        <input
          className="field-underline"
          placeholder="למשל: קפוא 500 גרם, בקבוק 1 ליטר"
          value={values.description}
          onChange={(e) => setValues({ ...values, description: e.target.value })}
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm text-[var(--color-text-muted)]">הערות — אופציונלי</span>
        <input
          className="field-underline"
          placeholder="למשל: משום סיבה מיוחדת זו דורשת טיפול מיוחד"
          value={values.notes}
          onChange={(e) => setValues({ ...values, notes: e.target.value })}
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm text-[var(--color-text-muted)]">מק&quot;ט</span>
        <input className="field-underline" value={values.sku} onChange={(e) => setValues({ ...values, sku: e.target.value })} />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm text-[var(--color-text-muted)]">קטגוריה</span>
        <select
          className="field-underline"
          value={values.categoryId}
          onChange={(e) => {
            const selectedId = e.target.value;
            const selected = categories.find((c) => String(c.id) === selectedId);
            setValues({
              ...values,
              categoryId: selectedId,
              category: selected?.name || "",
            });
          }}
          disabled={loadingCategories}
        >
          <option value="">בחר קטגוריה...</option>
          {categories.map((cat) => (
            <option key={cat.id} value={String(cat.id)}>
              {cat.icon_url ? `${cat.icon_url} ` : ""}
              {cat.name}
            </option>
          ))}
        </select>
        {loadingCategories && <div className="text-xs text-[var(--color-text-muted)]">טוען קטגוריות...</div>}
        <div className="text-xs text-blue-600 font-bold">
          <a href="/categories" target="_blank" rel="noopener noreferrer">
            ➕ הוסף קטגוריה חדשה
          </a>
        </div>
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm text-[var(--color-text-muted)]">תמונה - URL (אופציונלי)</span>
        <input
          className="field-underline"
          placeholder="https://example.com/image.jpg"
          value={values.imageUrl}
          onChange={(e) => setValues({ ...values, imageUrl: e.target.value })}
        />
        {values.imageUrl && (
          <img
            src={values.imageUrl}
            alt={values.name}
            className="mt-2 max-w-xs max-h-48 rounded"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
        )}
      </label>

      <label className="flex flex-col gap-2">
        <span className="text-sm text-[var(--color-text-muted)]">סוג תמחור</span>
        <div className="flex gap-2">
          {(["unit", "weight", "package"] as const).map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => setValues({ ...values, pricingType: type })}
              className={`flex-1 rounded-lg py-2 px-3 font-bold text-sm transition ${
                values.pricingType === type
                  ? "bg-[var(--color-brand)] text-white"
                  : "border border-[var(--color-border)] text-[var(--color-text-muted)]"
              }`}
            >
              {type === "unit" && "יחידה"}
              {type === "weight" && "משקל"}
              {type === "package" && "מארז"}
            </button>
          ))}
        </div>
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm text-[var(--color-text-muted)]">
          מחיר רגיל {values.pricingType === "weight" ? 'לק"ג' : values.pricingType === "package" ? 'לק"ג' : "ליחידה"} (₪)
        </span>
        <input
          type="number"
          inputMode="decimal"
          step="0.01"
          min="0"
          required
          className="field-underline"
          value={values.price}
          onChange={(e) => setValues({ ...values, price: e.target.value })}
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm text-[var(--color-text-muted)]">
          מחיר מבצע {values.pricingType === "weight" ? 'לק"ג' : values.pricingType === "package" ? 'לק"ג' : "ליחידה"} (₪) — אופציונלי
        </span>
        <input
          type="number"
          inputMode="decimal"
          step="0.01"
          min="0"
          className="field-underline"
          value={values.salePrice}
          onChange={(e) => setValues({ ...values, salePrice: e.target.value })}
        />
      </label>

      {values.salePrice && (
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={values.isOnSale}
            onChange={(e) => setValues({ ...values, isOnSale: e.target.checked })}
          />
          <span>🏷️ מוצר נמצא כרגע במבצע</span>
        </label>
      )}

      {values.pricingType === "weight" && (
        <label className="flex items-center gap-2 mr-6">
          <input
            type="checkbox"
            checked={values.requires_cleaning}
            onChange={(e) => setValues({ ...values, requires_cleaning: e.target.checked })}
          />
          <span>🧽 מצריך ניקוי — החיוב לפי משקל לפני ניקוי</span>
        </label>
      )}

      {values.pricingType === "unit" && (
        <label className="flex flex-col gap-1">
          <span className="text-sm text-[var(--color-text-muted)]">משקל ליחידה (ק"ג) — אופציונלי, לתצוגה בלבד</span>
          <input
            type="number"
            inputMode="decimal"
            step="0.001"
            min="0"
            className="field-underline"
            value={values.unitWeight}
            onChange={(e) => setValues({ ...values, unitWeight: e.target.value })}
          />
        </label>
      )}

      {values.pricingType === "package" && (
        <>
          <label className="flex flex-col gap-1">
            <span className="text-sm text-[var(--color-text-muted)]">תיאור המארז — מה מכיל המארז</span>
            <input
              type="text"
              className="field-underline"
              placeholder="למשל: 10 יחידות, קבב משפחתי"
              value={values.packageDescription}
              onChange={(e) => setValues({ ...values, packageDescription: e.target.value })}
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm text-[var(--color-text-muted)]">משקל משוער מינימום (ק"ג) — אופציונלי</span>
            <input
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0"
              className="field-underline"
              value={values.packageWeightMin}
              onChange={(e) => setValues({ ...values, packageWeightMin: e.target.value })}
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm text-[var(--color-text-muted)]">משקל משוער מקסימום (ק"ג) — אופציונלי</span>
            <input
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0"
              className="field-underline"
              value={values.packageWeightMax}
              onChange={(e) => setValues({ ...values, packageWeightMax: e.target.value })}
            />
          </label>
        </>
      )}

      {error && <div className="text-sm text-[var(--color-danger)]">{error}</div>}

      <div className="fixed bottom-0 inset-x-0 bg-white border-t border-[var(--color-border)] p-3 flex flex-col gap-2">
        <button
          type="submit"
          disabled={saving}
          className="rounded-xl bg-[var(--color-brand)] text-white font-bold py-3 disabled:opacity-50"
        >
          {saving ? "שומר/ת..." : "✓ שמירה"}
        </button>
        {id && (
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            className="rounded-xl border border-[var(--color-danger)] text-[var(--color-danger)] font-bold py-3 disabled:opacity-50"
          >
            🗑 מחיקת מוצר
          </button>
        )}
      </div>
    </form>
  );
}
