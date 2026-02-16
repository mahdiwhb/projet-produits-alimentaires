CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  raw_id TEXT NOT NULL UNIQUE,
  product_name TEXT NOT NULL,
  brand TEXT NOT NULL,
  category TEXT NOT NULL,
  nutriscore TEXT,
  energy_kcal_100g REAL NOT NULL,
  sugars_100g REAL NOT NULL,
  salt_100g REAL NOT NULL,
  healthy_score INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_brand ON products(brand);
CREATE INDEX IF NOT EXISTS idx_products_nutriscore ON products(nutriscore);
CREATE INDEX IF NOT EXISTS idx_products_score ON products(healthy_score);