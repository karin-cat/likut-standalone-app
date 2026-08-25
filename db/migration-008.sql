-- Migration 008: catalog_price on slip_items — the product's catalog price at pick time
-- (before any sale discount), kept so the printed slip can show when a sale price applied.

ALTER TABLE slip_items
ADD COLUMN IF NOT EXISTS catalog_price NUMERIC(10,2);
