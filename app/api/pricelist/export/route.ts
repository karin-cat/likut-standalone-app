import { sql } from "@/lib/db";
import type { Product } from "@/lib/types";

export const dynamic = "force-dynamic";

function csvEscape(v: string): string {
  if (/[",\n]/.test(v)) return '"' + v.replace(/"/g, '""') + '"';
  return v;
}

function formatPricingType(type: string): string {
  if (type === "weight") return 'לק"ג';
  if (type === "package") return "למארז (ק״ג)";
  return "ליח'";
}

export async function GET() {
  const products = (await sql`SELECT * FROM products ORDER BY category NULLS LAST, name ASC`) as Product[];

  const lines = [
    ["שם", "מק\"ט", "קטגוריה", "סוג תמחור", "מחיר רגיל", "מחיר מבצע", "במבצע?"]
      .map(csvEscape)
      .join(","),
  ];
  for (const p of products) {
    lines.push(
      [
        p.name,
        p.sku || "",
        p.category || "",
        formatPricingType(p.pricing_type),
        String(p.price),
        p.sale_price ? String(p.sale_price) : "",
        p.is_on_sale ? "כן" : "",
      ]
        .map(csvEscape)
        .join(",")
    );
  }
  const csv = "﻿" + lines.join("\r\n"); // BOM כדי ש-Excel יציג עברית נכון

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="mechiron.csv"`,
    },
  });
}
