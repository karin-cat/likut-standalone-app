-- Migration: Add pricing_type, sale_price, is_on_sale and related fields to products
-- This migration adds support for the new pricing model (unit/weight/package) with sale prices

-- Step 1: Add new columns to products table
ALTER TABLE products
ADD COLUMN IF NOT EXISTS pricing_type TEXT DEFAULT 'unit',
ADD COLUMN IF NOT EXISTS sale_price NUMERIC(10,2),
ADD COLUMN IF NOT EXISTS is_on_sale BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS unit_weight NUMERIC(10,3),
ADD COLUMN IF NOT EXISTS package_description TEXT,
ADD COLUMN IF NOT EXISTS package_estimated_weight_min NUMERIC(10,3),
ADD COLUMN IF NOT EXISTS package_estimated_weight_max NUMERIC(10,3);

-- Step 2: Migrate existing data — set pricing_type based on sold_by_weight
UPDATE products
SET pricing_type = CASE WHEN sold_by_weight THEN 'weight' ELSE 'unit' END
WHERE pricing_type = 'unit' AND (sold_by_weight IS NOT NULL AND sold_by_weight = TRUE);

-- Step 3: Add new columns to slip_items table for cleaning products support
ALTER TABLE slip_items
ADD COLUMN IF NOT EXISTS ordered_weight NUMERIC(10,3),
ADD COLUMN IF NOT EXISTS actual_weight_for_billing NUMERIC(10,3);
