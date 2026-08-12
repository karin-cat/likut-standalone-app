import AppHeader from "@/components/AppHeader";
import ProductForm from "@/components/ProductForm";

export default function NewProductPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <AppHeader title="מוצר חדש" backHref="/products" />
      <ProductForm />
    </div>
  );
}
