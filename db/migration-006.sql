-- Migration 006: support two package pricing modes — priced by weight (price/kg × actual
-- weighed package) or a fixed price per package (like a unit price, regardless of weight).

ALTER TABLE products
ADD COLUMN IF NOT EXISTS package_fixed_price BOOLEAN NOT NULL DEFAULT FALSE;
