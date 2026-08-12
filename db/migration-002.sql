-- Migration 002: Create categories table and update products foreign key

-- Step 1: Create categories table
CREATE TABLE IF NOT EXISTS categories (
  id       SERIAL PRIMARY KEY,
  name     TEXT NOT NULL UNIQUE,
  icon_url TEXT,
  color    TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Step 2: Add category_id column to products (nullable first for migration)
ALTER TABLE products
ADD COLUMN IF NOT EXISTS category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL;

-- Step 3: Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_categories_name ON categories (name);
CREATE INDEX IF NOT EXISTS idx_products_category_id ON products (category_id);
