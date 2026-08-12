"use client";

import Link from "next/link";

export default function PrintButton({ backHref }: { backHref: string }) {
  return (
    <div className="no-print sticky top-0 bg-white border-b border-[var(--color-border)] p-3 flex gap-2 z-10">
      <Link href={backHref} className="flex-1 text-center rounded-xl border border-[var(--color-border)] py-3 font-bold">
        → לתפריט
      </Link>
      <button
        type="button"
        onClick={() => window.print()}
        className="flex-1 rounded-xl bg-[var(--color-brand)] text-white font-bold py-3"
      >
        🖨️ הדפסה
      </button>
    </div>
  );
}
