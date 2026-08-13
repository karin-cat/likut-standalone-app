import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { normalizeProduct } from "@/lib/types";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const rows = await sql`SELECT * FROM products WHERE id = ${id}`;
  if (!rows[0]) return NextResponse.json({ error: "מוצר לא נמצא" }, { status: 404 });
  return NextResponse.json(normalizeProduct(rows[0]));
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
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
  const requiresCleaning = pricingType === "weight" ? !!body.requires_cleaning : false;
  const unitWeight = pricingType === "unit" ? (body.unit_weight ? Number(body.unit_weight) : null) : null;
  const packageDescription = pricingType === "package" ? (body.package_description ? String(body.package_description).trim() : null) : null;
  const packageWeightMin = pricingType === "package" ? (body.package_estimated_weight_min ? Number(body.package_estimated_weight_min) : null) : null;
  const packageWeightMax = pricingType === "package" ? (body.package_estimated_weight_max ? Number(body.package_estimated_weight_max) : null) : null;
  const description = body.description ? String(body.description).trim() : null;
  const notes = body.notes ? String(body.notes).trim() : null;

  const rows = await sql`
    UPDATE products
    SET name = ${name}, sku = ${sku}, category = ${category}, category_id = ${categoryId}, image_url = ${image_url},
        unit = ${unit}, price = ${price}, pricing_type = ${pricingType}, sale_price = ${salePrice},
        is_on_sale = ${isOnSale}, sold_by_weight = ${soldByWeight}, requires_cleaning = ${requiresCleaning},
        unit_weight = ${unitWeight}, package_description = ${packageDescription},
        package_estimated_weight_min = ${packageWeightMin}, package_estimated_weight_max = ${packageWeightMax},
        description = ${description}, notes = ${notes},
        updated_at = now()
    WHERE id = ${id}
    RETURNING *
  `;

  if (!rows[0]) return NextResponse.json({ error: "מוצר לא נמצא" }, { status: 404 });
  return NextResponse.json(normalizeProduct(rows[0]));
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await sql`DELETE FROM products WHERE id = ${id}`;
  return NextResponse.json({ ok: true });
}
