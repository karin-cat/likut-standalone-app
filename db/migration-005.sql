-- Migration 005: Support server-side draft slips (resumable from any device),
-- picker name, and unique order numbers.

ALTER TABLE slips
ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'completed', -- 'draft' | 'completed'
ADD COLUMN IF NOT EXISTS picker_name TEXT; -- שם המלקט: 'אליהו' | 'בילי'

CREATE INDEX IF NOT EXISTS idx_slips_status ON slips (status);

-- מספר הזמנה ייחודי (מאפשר NULL מרובים — לא כל תעודה חייבת מספר הזמנה)
CREATE UNIQUE INDEX IF NOT EXISTS idx_slips_order_number_unique ON slips (order_number) WHERE order_number IS NOT NULL;
