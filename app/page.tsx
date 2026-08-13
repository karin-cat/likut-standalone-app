import Link from "next/link";
import Image from "next/image";

const LINKS = [
  { href: "/pos", label: "🧺 תעודה חדשה", desc: "ליקוט הזמנה קיימת / ליקוט עצמאי" },
  { href: "/categories", label: "🏷️ ניהול קטגוריות", desc: "הוספה, עריכה, מחיקה" },
  { href: "/products", label: "📦 ניהול מוצרים", desc: "הוספה, עריכה, ייבוא מקובץ" },
  { href: "/pricelist", label: "💰 מחירון", desc: "תצוגה, הדפסה וייצוא" },
  { href: "/slips", label: "📜 היסטוריית תעודות", desc: "צפייה והדפסה חוזרת" },
];

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col">
      <div className="bg-[var(--color-brand)] text-white text-center py-8">
        <div className="mx-auto mb-4 flex justify-center">
          <Image
            src="/logo4app.png"
            alt="ליקוט by DC"
            width={64}
            height={64}
            className="w-16 h-auto"
            priority
          />
        </div>
      </div>

      <div className="flex-1 p-4 flex flex-col gap-3 max-w-sm w-full mx-auto">
        {LINKS.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className="rounded-2xl bg-white shadow-sm border border-[var(--color-border)] p-4 flex flex-col active:bg-[var(--color-bg-soft)]"
          >
            <span className="font-bold text-lg">{l.label}</span>
            <span className="text-sm text-[var(--color-text-muted)]">{l.desc}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
