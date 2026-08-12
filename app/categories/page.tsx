"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AppHeader from "@/components/AppHeader";
import type { Category } from "@/lib/types";

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [newIcon, setNewIcon] = useState("");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchCategories();
  }, []);

  async function fetchCategories() {
    setLoading(true);
    try {
      const res = await fetch("/api/categories");
      const data = await res.json();
      setCategories(Array.isArray(data) ? data : []);
    } catch {
      setError("שגיאה בטעינת קטגוריות");
    } finally {
      setLoading(false);
    }
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;

    setAdding(true);
    setError(null);

    try {
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName,
          icon_url: newIcon || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "שגיאה בהוספת קטגוריה");
        return;
      }

      setCategories([...categories, data]);
      setNewName("");
      setNewIcon("");
    } catch {
      setError("בעיית תקשורת");
    } finally {
      setAdding(false);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("למחוק את הקטגוריה?")) return;

    try {
      const res = await fetch(`/api/categories/${id}`, { method: "DELETE" });
      if (!res.ok) {
        setError("שגיאה במחיקה");
        return;
      }
      setCategories(categories.filter((c) => c.id !== id));
    } catch {
      setError("בעיית תקשורת");
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      <AppHeader title="ניהול קטגוריות" backHref="/" />

      <div className="flex-1 p-4 overflow-y-auto pb-28">
        {/* Form להוסף קטגוריה חדשה */}
        <div className="bg-white rounded-lg p-4 mb-4 border border-[var(--color-border)]">
          <div className="font-bold text-sm mb-3">➕ קטגוריה חדשה</div>
          <form onSubmit={handleAdd} className="flex flex-col gap-2">
            <input
              type="text"
              placeholder="שם קטגוריה"
              className="field-underline"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              required
            />
            <input
              type="text"
              placeholder="אייקון/תמונה URL (אופציונלי)"
              className="field-underline"
              value={newIcon}
              onChange={(e) => setNewIcon(e.target.value)}
            />
            {newIcon && (
              <div className="text-2xl">
                {newIcon}
              </div>
            )}
            <button
              type="submit"
              disabled={adding || !newName.trim()}
              className="rounded-lg bg-[var(--color-brand)] text-white font-bold py-2 disabled:opacity-50"
            >
              {adding ? "מוסיף..." : "הוסף קטגוריה"}
            </button>
          </form>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-800 px-3 py-2 rounded-lg mb-3 text-sm">
            {error}
          </div>
        )}

        {/* רשימת קטגוריות */}
        {loading ? (
          <div className="text-center text-[var(--color-text-muted)] py-10">טוען...</div>
        ) : categories.length === 0 ? (
          <div className="text-center text-[var(--color-text-muted)] py-10">אין קטגוריות עדיין.</div>
        ) : (
          <div className="space-y-2">
            {categories.map((cat) => (
              <div
                key={cat.id}
                className="bg-white p-3 rounded-lg border border-[var(--color-border)] flex items-center justify-between"
              >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  {cat.icon_url && <span className="text-2xl shrink-0">{cat.icon_url}</span>}
                  <div className="min-w-0">
                    <div className="font-semibold truncate">{cat.name}</div>
                    <div className="text-xs text-[var(--color-text-muted)]">
                      יצרה: {new Date(cat.created_at).toLocaleDateString("he-IL")}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(cat.id)}
                  className="ml-2 px-3 py-1 text-sm rounded bg-red-50 text-red-600 hover:bg-red-100 font-bold shrink-0"
                >
                  🗑
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
