"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

const MENU_LINKS = [
  { href: "/pos", label: "🧺 קטלוג / ליקוט" },
  { href: "/products", label: "📦 ניהול מוצרים" },
  { href: "/pricelist", label: "🏷️ מחירון" },
  { href: "/slips", label: "📜 היסטוריית תעודות" },
];

export default function AppHeader({
  title,
  backHref,
  onBack,
}: {
  title: string;
  backHref?: string;
  onBack?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }

  return (
    <div className="sticky top-0 z-20">
      <div className="bg-[var(--color-brand)] text-white flex items-center justify-between px-3 h-14 shadow-sm">
        {onBack ? (
          <button type="button" onClick={onBack} className="text-2xl px-1" aria-label="חזרה">
            →
          </button>
        ) : backHref ? (
          <Link href={backHref} className="text-2xl px-1" aria-label="חזרה">
            →
          </Link>
        ) : (
          <span className="w-8" />
        )}
        <h1 className="text-lg font-bold truncate">{title}</h1>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="text-2xl px-1"
          aria-label="תפריט"
        >
          ☰
        </button>
      </div>

      {open && (
        <>
          <div className="fixed inset-0 bg-black/20 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-14 z-20 bg-white shadow-lg rounded-bl-xl overflow-hidden w-64">
            {MENU_LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="block px-4 py-3 border-b border-[var(--color-border)] hover:bg-[var(--color-bg-soft)]"
              >
                {l.label}
              </Link>
            ))}
            <button
              type="button"
              onClick={handleLogout}
              className="block w-full text-right px-4 py-3 text-[var(--color-danger)]"
            >
              🚪 התנתקות
            </button>
          </div>
        </>
      )}
    </div>
  );
}
