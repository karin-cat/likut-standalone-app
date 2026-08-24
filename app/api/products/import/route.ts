import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

interface ImportRow {
  name: string;
  sku?: string;
  category?: string;
  image_url?: string;
  pricing_type?: string;
  price?: number;
  sale_price?: number;
  is_on_sale?: boolean;
  requires_cleaning?: boolean;
  unit_weight?: number;
  package_description?: string;
  package_estimated_weight_min?: number;
  package_estimated_weight_max?: number;
  package_fixed_price?: boolean;
  description?: string;
  notes?: string;
}

export async function POST(request: Request) {
  const body = await request.json();
  const rows: ImportRow[] = Array.isArray(body.rows) ? body.rows : [];
  if (rows.length === 0) {
    return NextResponse.json({ error: "אין שורות לייבוא" }, { status: 400 });
  }

  // מק"טים שכבר קיימים בקטלוג — כדי לא ליצור כפילויות בשקט
  const existingSkuRows = await sql`SELECT sku FROM products WHERE sku IS NOT NULL`;
  const existingSkus = new Set(existingSkuRows.map((row) => String(row.sku)));
  const seenInBatch = new Set<string>();
  const duplicates: { sku: string; name: string }[] = [];

  let inserted = 0;
  for (const r of rows) {
    const name = String(r.name || "").trim();
    if (!name) continue;
    const sku = r.sku ? String(r.sku).trim() : null;

    if (sku && (existingSkus.has(sku) || seenInBatch.has(sku))) {
      duplicates.push({ sku, name });
      continue;
    }
    if (sku) seenInBatch.add(sku);

    const category = r.category ? String(r.category).trim() : null;
    const image_url = r.image_url ? String(r.image_url).trim() : null;
    const pricingType = ["weight", "package"].includes(String(r.pricing_type || "")) ? String(r.pricing_type) : "unit";
    const price = Number(r.price) || 0;
    const salePrice = r.sale_price ? Number(r.sale_price) : null;
    const isOnSale = !!r.is_on_sale;
    const requiresCleaning = !!r.requires_cleaning;
    const unitWeight = pricingType === "unit" ? (r.unit_weight ? Number(r.unit_weight) : null) : null;
    const packageDescription = pricingType === "package" ? (r.package_description ? String(r.package_description).trim() : null) : null;
    const packageWeightMin = pricingType === "package" ? (r.package_estimated_weight_min ? Number(r.package_estimated_weight_min) : null) : null;
    const packageWeightMax = pricingType === "package" ? (r.package_estimated_weight_max ? Number(r.package_estimated_weight_max) : null) : null;
    const packageFixedPrice = pricingType === "package" ? !!r.package_fixed_price : false;
    const description = r.description ? String(r.description).trim() : null;
    const notes = r.notes ? String(r.notes).trim() : null;

    await sql`
      INSERT INTO products (
        name, sku, category, image_url, unit, price, pricing_type, sale_price, is_on_sale,
        sold_by_weight, requires_cleaning, unit_weight, package_description,
        package_estimated_weight_min, package_estimated_weight_max, package_fixed_price, description, notes
      )
      VALUES (
        ${name}, ${sku}, ${category}, ${image_url}, 'unit', ${price}, ${pricingType}, ${salePrice}, ${isOnSale},
        FALSE, ${requiresCleaning}, ${unitWeight}, ${packageDescription},
        ${packageWeightMin}, ${packageWeightMax}, ${packageFixedPrice}, ${description}, ${notes}
      )
    `;
    inserted++;
  }

  return NextResponse.json({ ok: true, inserted, duplicates });
}
