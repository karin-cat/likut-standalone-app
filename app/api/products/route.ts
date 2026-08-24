import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { normalizeProduct } from "@/lib/types";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") || "").trim();
  const category = searchParams.get("category");

  let rows: Record<string, unknown>[];
  if (q) {
    const like = `%${q}%`;
    rows = await sql`
      SELECT * FROM products
      WHERE name ILIKE ${like} OR sku ILIKE ${like}
      ORDER BY name ASC
      LIMIT 200
    `;
  } else if (category) {
    rows = await sql`
      SELECT * FROM products WHERE category = ${category} ORDER BY name ASC LIMIT 500
    `;
  } else {
    rows = await sql`SELECT * FROM products ORDER BY name ASC LIMIT 1000`;
  }

  return NextResponse.json(rows.map(normalizeProduct));
}

export async function POST(request: Request) {
  const body = await request.json();
  const name = String(body.name || "").trim();
  if (!name) {
    return NextResponse.json({ error: "יש להזין שם מוצר" }, { status: 400 });
  }

  const sku = body.sku ? String(body.sku).trim() : null;
  const category = body.category ? String(body.category).trim() : null;
  const categoryId = body.category_id ? Number(body.category_id) : null;
  const image_url = body.image_url ? String(body.image_url).trim() : null;
  const unit = "unit"; // legacy
  const price = Number(body.price) || 0;
  const pricingType = ["weight", "package"].includes(body.pricing_type) ? body.pricing_type : "unit";
  const salePrice = body.sale_price ? Number(body.sale_price) : null;
  const isOnSale = !!body.is_on_sale;
  const soldByWeight = !!body.sold_by_weight;
  const requiresCleaning = !!body.requires_cleaning;
  const unitWeight = pricingType === "unit" ? (body.unit_weight ? Number(body.unit_weight) : null) : null;
  const packageDescription = pricingType === "package" ? (body.package_description ? String(body.package_description).trim() : null) : null;
  const packageWeightMin = pricingType === "package" ? (body.package_estimated_weight_min ? Number(body.package_estimated_weight_min) : null) : null;
  const packageWeightMax = pricingType === "package" ? (body.package_estimated_weight_max ? Number(body.package_estimated_weight_max) : null) : null;
  const packageFixedPrice = pricingType === "package" ? !!body.package_fixed_price : false;
  const description = body.description ? String(body.description).trim() : null;
  const notes = body.notes ? String(body.notes).trim() : null;

  const rows = await sql`
    INSERT INTO products (
      name, sku, category, category_id, image_url, unit, price, pricing_type, sale_price, is_on_sale,
      sold_by_weight, requires_cleaning, unit_weight, package_description,
      package_estimated_weight_min, package_estimated_weight_max, package_fixed_price, description, notes
    )
    VALUES (
      ${name}, ${sku}, ${category}, ${categoryId}, ${image_url}, ${unit}, ${price}, ${pricingType}, ${salePrice}, ${isOnSale},
      ${soldByWeight}, ${requiresCleaning}, ${unitWeight}, ${packageDescription},
      ${packageWeightMin}, ${packageWeightMax}, ${packageFixedPrice}, ${description}, ${notes}
    )
    RETURNING *
  `;

  return NextResponse.json(normalizeProduct(rows[0]), { status: 201 });
}
