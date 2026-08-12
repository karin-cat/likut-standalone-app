-- סכימת מסד הנתונים — אפליקציית ליקוט עצמאית
-- הרצה חד-פעמית מול Neon (דרך scripts/setup-db.mjs)

CREATE TABLE IF NOT EXISTS products (
  id                           SERIAL PRIMARY KEY,
  name                         TEXT NOT NULL,
  sku                          TEXT,
  category                     TEXT,
  image_url                    TEXT,
  unit                         TEXT NOT NULL DEFAULT 'unit', -- legacy: 'unit' | 'kg' (for migration)
  price                        NUMERIC(10,2) NOT NULL DEFAULT 0, -- מחיר רגיל
  pricing_type                 TEXT NOT NULL DEFAULT 'unit', -- 'unit' | 'weight' | 'package'
  sale_price                   NUMERIC(10,2), -- מחיר מבצע (NULL = אין)
  is_on_sale                   BOOLEAN NOT NULL DEFAULT FALSE,
  sold_by_weight               BOOLEAN NOT NULL DEFAULT FALSE, -- legacy (for migration)
  requires_cleaning            BOOLEAN NOT NULL DEFAULT FALSE, -- רלוונטי רק ל-pricing_type='weight'
  unit_weight                  NUMERIC(10,3), -- משקל ליחידה (עבור pricing_type='unit')
  package_description          TEXT, -- תיאור המארז (עבור pricing_type='package')
  package_estimated_weight_min NUMERIC(10,3), -- משקל משוער מינימום (עבור pricing_type='package')
  package_estimated_weight_max NUMERIC(10,3), -- משקל משוער מקסימום (עבור pricing_type='package')
  created_at                   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_products_name ON products (name);
CREATE INDEX IF NOT EXISTS idx_products_category ON products (category);

CREATE TABLE IF NOT EXISTS slips (
  id                 SERIAL PRIMARY KEY,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  mode               TEXT NOT NULL DEFAULT 'standalone', -- 'linked' (הזמנה קיימת) | 'standalone' (ליקוט עצמאי)
  order_number       TEXT,   -- מספר ההזמנה בוורדפרס (רק במצב linked)
  customer_name      TEXT,
  customer_address   TEXT,
  shipping_method    TEXT,
  delivery_date      TEXT,
  shipping_cost      NUMERIC(10,2),
  note               TEXT,   -- הערות כלליות
  original_total     NUMERIC(10,2), -- סכום ההזמנה המקורי, מוזן ידנית (רק במצב linked) — הבסיס להשוואה
  total              NUMERIC(10,2) NOT NULL DEFAULT 0 -- סה"כ בפועל (סכום הפריטים שנגבו בפועל, ללא פריטים חסרים)
);

CREATE TABLE IF NOT EXISTS slip_items (
  id                        SERIAL PRIMARY KEY,
  slip_id                   INTEGER NOT NULL REFERENCES slips(id) ON DELETE CASCADE,
  product_id                INTEGER REFERENCES products(id) ON DELETE SET NULL,
  name                      TEXT NOT NULL,      -- שם המוצר בזמן המכירה (מוקפא, גם אם המוצר ישונה/יימחק אח"כ)
  unit                      TEXT NOT NULL,      -- 'kg' | 'gram' | 'unit'
  qty                       NUMERIC(10,3) NOT NULL DEFAULT 0,
  unit_price                NUMERIC(10,2) NOT NULL DEFAULT 0,
  line_total                NUMERIC(10,2),      -- דריסת מחיר סופי לשורה (NULL = מחושב אוטומטית)
  note                      TEXT,
  requires_cleaning         BOOLEAN NOT NULL DEFAULT FALSE,
  ordered_weight            NUMERIC(10,3),      -- משקל שהוזמן (עבור ניקוי ומארז)
  actual_weight_for_billing NUMERIC(10,3),      -- משקל בפועל ולחיוב (זה משמש לחישוב מחיר בניקוי ומארז)
  clean_weight              NUMERIC(10,3),      -- משקל אחרי ניקוי (תיעוד בלבד)
  status                    TEXT NOT NULL DEFAULT 'picked', -- 'picked' | 'missing'
  missing_reason            TEXT                -- הערה חופשית כשה-status הוא missing
);

CREATE INDEX IF NOT EXISTS idx_slip_items_slip_id ON slip_items (slip_id);

-- אימות — שורה יחידה (id=1). הביטוי נשמר כ-hash בלבד, לעולם לא כטקסט גלוי.
CREATE TABLE IF NOT EXISTS app_auth (
  id                SMALLINT PRIMARY KEY DEFAULT 1,
  passphrase_hash   TEXT NOT NULL,
  failed_attempts   INTEGER NOT NULL DEFAULT 0,
  locked_until      TIMESTAMPTZ,
  CONSTRAINT single_row CHECK (id = 1)
);
