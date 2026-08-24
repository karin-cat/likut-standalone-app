-- Migration 007: unit_count — for "package" products priced by weight where the customer
-- orders in whole units (e.g. a whole chicken) but the picker weighs it. Lets the picking
-- slip show both the unit count and the actual weight, while price stays weight × price/kg.

ALTER TABLE slip_items
ADD COLUMN IF NOT EXISTS unit_count INTEGER;
