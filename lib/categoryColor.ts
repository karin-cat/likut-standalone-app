// פלטת צבעים קבועה (בהשראת Loyverse) — כל קטגוריה מקבלת צבע אוטומטי לפי שם,
// כדי שאפשר יהיה להבדיל ביניהן ויזואלית בלי הגדרה ידנית לכל קטגוריה.
const PALETTE = [
  "#f97316", // כתום
  "#ec4899", // ורוד
  "#ef4444", // אדום
  "#8b5cf6", // סגול
  "#3b82f6", // כחול
  "#22c55e", // ירוק
  "#a3e635", // ירוק-צהוב
  "#06b6d4", // תכלת
];

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h << 5) - h + s.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

export function categoryColor(category: string | null | undefined): string {
  if (!category) return "#9ca3af"; // אפור — ללא קטגוריה
  return PALETTE[hashString(category) % PALETTE.length];
}
