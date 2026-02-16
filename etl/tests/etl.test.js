// etl/tests/etl.test.js
const Database = require("better-sqlite3");
const fs = require("fs");
const path = require("path");

const { computeHealthyScore } = require("../lib/score");
const { mapEnrichedToProductRow } = require("../lib/transform");
const { upsertProduct } = require("../lib/upsert");

test("computeHealthyScore: plus sucre/sel/kcal => score plus bas", () => {
  const good = computeHealthyScore({ sugars_100g: 2, salt_100g: 0.1, energy_kcal_100g: 80 });
  const bad = computeHealthyScore({ sugars_100g: 30, salt_100g: 1.5, energy_kcal_100g: 500 });

  expect(good).toBeGreaterThan(bad);
});

test("ETL: upsert est idempotent (pas de doublon raw_id)", () => {
  // DB en mémoire
  const db = new Database(":memory:");

  // charge ton schema SQL existant (database.sql)
  const schemaPath = path.join(__dirname, "..", "schema.sql");
  const schema = fs.readFileSync(schemaPath, "utf-8");
  db.exec(schema);

  const enriched = {
    raw_id: "abc123",
    status: "success",
    enriched_at: new Date().toISOString(),
    data: {
      product_name: "Test Product",
      brand: "BrandX",
      category: "en:snacks",
      nutriscore: "B",
      energy_kcal_100g: 120,
      sugars_100g: 8,
      salt_100g: 0.3,
      healthy_score: 5,
    },
  };

  const row = mapEnrichedToProductRow(enriched);

  // insert 1
  upsertProduct(db, row);
  // insert 2 (même raw_id mais modifié)
  upsertProduct(db, { ...row, product_name: "Test Product V2", healthy_score: 9 });

  const count = db.prepare(`SELECT COUNT(*) as c FROM products`).get().c;
  expect(count).toBe(1);

  const stored = db.prepare(`SELECT * FROM products WHERE raw_id = ?`).get("abc123");
  expect(stored.product_name).toBe("Test Product V2");
  expect(stored.healthy_score).toBe(9);
});