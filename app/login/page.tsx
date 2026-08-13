"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/pos";

  const [passphrase, setPassphrase] = useState("");
  const [showPassphrase, setShowPassphrase] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passphrase }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "שגיאה בהתחברות");
        setLoading(false);
        return;
      }
      router.replace(next);
      router.refresh();
    } catch {
      setError("בעיית תקשורת — יש לבדוק חיבור לאינטרנט ולנסות שוב");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[var(--color-bg-soft)] px-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Image
            src="/logo4app.png"
            alt="ליקוט by DC"
            width={64}
            height={64}
            className="mx-auto mb-4 w-16 h-auto"
            priority
          />
          <h1 className="text-xl font-bold">כניסה לאפליקציית ליקוט</h1>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm p-6 flex flex-col gap-4">
          <label className="flex flex-col gap-1">
            <span className="text-sm text-[var(--color-text-muted)]">ביטוי כניסה</span>
            <div className="relative flex items-center">
              <input
                type={showPassphrase ? "text" : "password"}
                inputMode="text"
                autoComplete="off"
                data-lpignore="true"
                data-1p-ignore="true"
                autoFocus
                className="field-underline text-lg pl-10"
                value={passphrase}
                onChange={(e) => setPassphrase(e.target.value)}
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowPassphrase((v) => !v)}
                className="absolute left-2 text-sm text-[var(--color-text-muted)] px-2 py-1"
                aria-label={showPassphrase ? "הסתרת הביטוי" : "הצגת הביטוי"}
              >
                {showPassphrase ? "🙈" : "👁️"}
              </button>
            </div>
          </label>

          {error && (
            <div className="text-sm text-[var(--color-danger)] bg-red-50 rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !passphrase}
            className="mt-2 rounded-xl bg-[var(--color-brand)] text-white font-bold py-3 text-lg disabled:opacity-50 active:bg-[var(--color-brand-dark)]"
          >
            {loading ? "מתחבר/ת..." : "כניסה"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
