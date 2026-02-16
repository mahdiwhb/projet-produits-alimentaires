const fs = require("fs");
const path = require("path");
const Database = require("better-sqlite3");
const { MongoClient } = require("mongodb");

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017";
const DB_NAME = process.env.DB_NAME || "pipeline_db";
const ENRICHED_COLLECTION = "enriched_products";

const SQLITE_PATH = process.env.SQLITE_PATH || path.join(__dirname, "data.sqlite");

(async () => {
  // SQLite init
  const db = new Database(SQLITE_PATH);
  const schema = fs.readFileSync(path.join(__dirname, "schema.sql"), "utf8");
  db.exec(schema);

  const upsert = db.prepare(`
    INSERT INTO products (
      raw_id, product_name, brand, category, nutriscore,
      energy_kcal_100g, sugars_100g, salt_100g, healthy_score
    ) VALUES (
      @raw_id, @product_name, @brand, @category, @nutriscore,
      @energy_kcal_100g, @sugars_100g, @salt_100g, @healthy_score
    )
    ON CONFLICT(raw_id) DO UPDATE SET
      product_name=excluded.product_name,
      brand=excluded.brand,
      category=excluded.category,
      nutriscore=excluded.nutriscore,
      energy_kcal_100g=excluded.energy_kcal_100g,
      sugars_100g=excluded.sugars_100g,
      salt_100g=excluded.salt_100g,
      healthy_score=excluded.healthy_score
  `);

  // Mongo read enriched success
  const client = new MongoClient(MONGO_URI);
  await client.connect();
  const mdb = client.db(DB_NAME);
  const enrCol = mdb.collection(ENRICHED_COLLECTION);

  const cursor = enrCol.find({ status: "success" });

  let count = 0;
  while (await cursor.hasNext()) {
    const doc = await cursor.next();
    const d = doc.data;

    upsert.run({
      raw_id: String(doc.raw_id),
      product_name: d.product_name || "Unknown",
      brand: d.brand || "Unknown",
      category: d.category || "Unknown",
      nutriscore: d.nutriscore || null,
      energy_kcal_100g: d.energy_kcal_100g ?? 0,
      sugars_100g: d.sugars_100g ?? 0,
      salt_100g: d.salt_100g ?? 0,
      healthy_score: d.healthy_score ?? 0,
    });

    count++;
  }

  console.log("ETL DONE. Rows upserted:", count);

  await client.close();
  db.close();
})();