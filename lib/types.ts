export type ProductUnit = "unit" | "kg";
export type PricingType = "unit" | "weight" | "package";

export interface Product {
  id: number;
  name: string;
  sku: string | null;
  category: string | null;
  image_url: string | null;
  unit: ProductUnit; // legacy
  price: number; // מחיר רגיל
  pricing_type: PricingType;
  sale_price: number | null;
  is_on_sale: boolean;
  sold_by_weight: boolean; // legacy
  requires_cleaning: boolean; // רלוונטי רק ל-weight
  unit_weight: number | null; // עבור unit type
  package_description: string | null;
  package_estimated_weight_min: number | null;
  package_estimated_weight_max: number | null;
  created_at: string;
  updated_at: string;
}

export type SlipItemUnit = "kg" | "gram" | "unit";
export type SlipItemStatus = "picked" | "missing";
export type SlipMode = "linked" | "standalone";

export interface SlipItem {
  id: number;
  slip_id: number;
  product_id: number | null;
  name: string;
  unit: SlipItemUnit;
  qty: number;
  unit_price: number;
  line_total: number | null;
  note: string | null;
  requires_cleaning: boolean;
  ordered_weight: number | null;
  actual_weight_for_billing: number | null; // משמש לחישוב מחיר
  clean_weight: number | null;
  status: SlipItemStatus;
  missing_reason: string | null;
}

export interface Slip {
  id: number;
  created_at: string;
  mode: SlipMode;
  order_number: string | null;
  customer_name: string | null;
  customer_address: string | null;
  shipping_method: string | null;
  delivery_date: string | null;
  shipping_cost: number | null;
  note: string | null;
  original_total: number | null;
  total: number;
}

export interface SlipWithItems extends Slip {
  items: SlipItem[];
}

/** פריט בעגלה (בזמן בנייה, לפני שמירה — עדיין ללא id/slip_id). */
export interface CartItem {
  product_id: number | null;
  name: string;
  sku: string | null;
  unit: SlipItemUnit;
  qty: number;
  unit_price: number;
  line_total: number | null;
  note: string;
  requires_cleaning: boolean;
  ordered_weight: number | null;
  actual_weight_for_billing: number | null;
  clean_weight: number | null;
  catalog_price: number | null; // מחיר קטלוגי מקורי — לתצוגת עזר בעריכה בלבד
  status: SlipItemStatus;
  missing_reason: string;
}

/** נתוני פתיחת תעודה — מצב + פרטי הזמנה (רק אם mode === 'linked'). */
export interface SlipDraftMeta {
  mode: SlipMode;
  order_number: string;
  customer_name: string;
  customer_address: string;
  shipping_method: string;
  delivery_date: string;
  shipping_cost: string; // טקסט בזמן עריכה, מומר למספר בשמירה
  note: string;
  original_total: string; // טקסט בזמן עריכה, מומר למספר בשמירה
}

export function emptySlipDraftMeta(): SlipDraftMeta {
  return {
    mode: "standalone",
    order_number: "",
    customer_name: "",
    customer_address: "",
    shipping_method: "",
    delivery_date: "",
    shipping_cost: "",
    note: "",
    original_total: "",
  };
}

/**
 * חישוב מחיר סופי לפריט — פריט "לא לוקט/חסר" לא נגבה בכלל (0).
 * אחרת: מחיר סופי (line_total) גובר; אחרת משתמש ב-actual_weight_for_billing אם קיים;
 * אחרת gram מומר, אחרת qty * unit_price.
 * הערכים מומרים ל-Number בבטחה — עמודות NUMERIC ב-Postgres חוזרות כמחרוזות.
 */
export function computeItemPrice(item: {
  unit: SlipItemUnit;
  qty: number | string;
  unit_price: number | string;
  line_total: number | string | null;
  actual_weight_for_billing?: number | string | null;
  status?: SlipItemStatus;
}): number {
  if (item.status === "missing") return 0;
  const lt = item.line_total === null || item.line_total === undefined ? NaN : Number(item.line_total);
  if (!Number.isNaN(lt)) {
    return round2(lt);
  }

  // אם יש משקל בפועל ללחיוב (עבור cleaning products או package), משתמש בו
  if (item.actual_weight_for_billing !== null && item.actual_weight_for_billing !== undefined) {
    const weight = Number(item.actual_weight_for_billing) || 0;
    const unitPrice = Number(item.unit_price) || 0;
    return round2(weight * unitPrice);
  }

  const qty = Number(item.qty) || 0;
  const unitPrice = Number(item.unit_price) || 0;
  const base = item.unit === "gram" ? (qty / 1000) * unitPrice : qty * unitPrice;
  return round2(base);
}

export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

// ── נרמול שורות שמגיעות ישירות מ-Postgres — עמודות NUMERIC חוזרות כמחרוזות ──
// (למשל "45.00" ולא 45), ולכן צריך להמיר ל-Number לפני שמשתמשים בהן כמספר.

export function normalizeProduct(row: Record<string, unknown>): Product {
  return {
    ...row,
    price: Number(row.price),
    sale_price: row.sale_price == null ? null : Number(row.sale_price),
    unit_weight: row.unit_weight == null ? null : Number(row.unit_weight),
    package_estimated_weight_min: row.package_estimated_weight_min == null ? null : Number(row.package_estimated_weight_min),
    package_estimated_weight_max: row.package_estimated_weight_max == null ? null : Number(row.package_estimated_weight_max),
  } as Product;
}

export function normalizeSlip(row: Record<string, unknown>): Slip {
  return {
    ...row,
    shipping_cost: row.shipping_cost == null ? null : Number(row.shipping_cost),
    original_total: row.original_total == null ? null : Number(row.original_total),
    total: Number(row.total),
  } as Slip;
}

export function normalizeSlipItem(row: Record<string, unknown>): SlipItem {
  return {
    ...row,
    qty: Number(row.qty),
    unit_price: Number(row.unit_price),
    line_total: row.line_total == null ? null : Number(row.line_total),
    ordered_weight: row.ordered_weight == null ? null : Number(row.ordered_weight),
    actual_weight_for_billing: row.actual_weight_for_billing == null ? null : Number(row.actual_weight_for_billing),
    clean_weight: row.clean_weight == null ? null : Number(row.clean_weight),
  } as SlipItem;
}
