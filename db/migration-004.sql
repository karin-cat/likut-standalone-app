-- Migration 004: Add customer contact and split address fields to slips

ALTER TABLE slips
ADD COLUMN IF NOT EXISTS customer_phone TEXT,
ADD COLUMN IF NOT EXISTS customer_email TEXT,
ADD COLUMN IF NOT EXISTS customer_address_street TEXT,
ADD COLUMN IF NOT EXISTS customer_address_city TEXT;
