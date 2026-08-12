import { notFound } from "next/navigation";
import AppHeader from "@/components/AppHeader";
import ProductForm from "@/components/ProductForm";
import { sql } from "@/lib/db";
import { normalizeProduct } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const rows = await sql`SELECT * FROM products WHERE id = ${id}`;
  if (!rows[0]) notFound();
  const product = normalizeProduct(rows[0]);

  return (
    <div className="min-h-screen flex flex-col">
      <AppHeader title={product.name} backHref="/products" />
      <ProductForm product={product} id={product.id} />
    </div>
  );
}
