-- Categories principales
CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  icon TEXT,
  description TEXT
);

-- Sous-catégories
CREATE TABLE IF NOT EXISTS subcategories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  category_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  FOREIGN KEY (category_id) REFERENCES categories(id)
);

-- Allergènes
CREATE TABLE IF NOT EXISTS allergens (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE
);

-- Produits avec lien aux sous-catégories
CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  raw_id TEXT NOT NULL UNIQUE,
  barcode TEXT,
  subcategory_id INTEGER,
  product_name TEXT NOT NULL,
  brand TEXT NOT NULL,
  nutriscore TEXT,
  energy_kcal_100g REAL NOT NULL,
  sugars_100g REAL NOT NULL,
  salt_100g REAL NOT NULL,
  protein_100g REAL,
  price REAL,
  healthy_score INTEGER NOT NULL,
  image_url TEXT,
  FOREIGN KEY (subcategory_id) REFERENCES subcategories(id)
);

-- Relation produits-allergènes
CREATE TABLE IF NOT EXISTS product_allergens (
  product_id INTEGER NOT NULL,
  allergen_id INTEGER NOT NULL,
  PRIMARY KEY (product_id, allergen_id),
  FOREIGN KEY (product_id) REFERENCES products(id),
  FOREIGN KEY (allergen_id) REFERENCES allergens(id)
);

-- Produits bruts (archivage)
CREATE TABLE IF NOT EXISTS raw_products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  raw_id TEXT NOT NULL UNIQUE,
  raw_hash TEXT,
  source TEXT,
  fetched_at TEXT,
  payload_json TEXT
);

-- Produits enrichis (archivage)
CREATE TABLE IF NOT EXISTS enriched_products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  raw_id TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL,
  enriched_at TEXT,
  product_name TEXT,
  brand TEXT,
  nutriscore TEXT,
  energy_kcal_100g REAL,
  sugars_100g REAL,
  salt_100g REAL,
  healthy_score INTEGER,
  image_url TEXT
);

-- Indices de performance
CREATE INDEX IF NOT EXISTS idx_products_subcategory ON products(subcategory_id);
CREATE INDEX IF NOT EXISTS idx_products_brand ON products(brand);
CREATE INDEX IF NOT EXISTS idx_products_nutriscore ON products(nutriscore);
CREATE INDEX IF NOT EXISTS idx_products_score ON products(healthy_score);
CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode);
CREATE INDEX IF NOT EXISTS idx_subcategories_category ON subcategories(category_id);
CREATE INDEX IF NOT EXISTS idx_product_allergens_allergen ON product_allergens(allergen_id);
CREATE INDEX IF NOT EXISTS idx_raw_products_hash ON raw_products(raw_hash);
CREATE INDEX IF NOT EXISTS idx_enriched_products_status ON enriched_products(status);