const { MongoClient, ObjectId } = require("mongodb");

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017";
const DB_NAME = process.env.DB_NAME || "pipeline_db";
const RAW_COLLECTION = "raw_products";
const ENRICHED_COLLECTION = "enriched_products";

function toNumber(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function computeHealthyScore(nutri, sugars, salt) {
  // simple + explicable (Bac+3 friendly)
  let score = 0;
  const ns = (nutri || "").toUpperCase();

  if (ns === "A") score += 2;
  else if (ns === "B") score += 1;
  else if (ns === "C") score += 0;
  else if (ns === "D") score -= 1;
  else if (ns === "E") score -= 2;

  if (sugars > 15) score -= 1;
  if (salt > 1.5) score -= 1;

  return score;
}

(async () => {
  const client = new MongoClient(MONGO_URI);
  await client.connect();
  const db = client.db(DB_NAME);

  const rawCol = db.collection(RAW_COLLECTION);
  const enrCol = db.collection(ENRICHED_COLLECTION);

  // Idempotence: 1 doc enriched par raw_id
  await enrCol.createIndex({ raw_id: 1 }, { unique: true });

  const cursor = rawCol.find({}, { projection: { payload: 1 } });

  let success = 0;
  let failed = 0;

  while (await cursor.hasNext()) {
    const rawDoc = await cursor.next();
    const rawId = rawDoc._id;

    // si déjà enrichi -> skip
    const exists = await enrCol.findOne({ raw_id: rawId });
    if (exists) continue;

    try {
      const p = rawDoc.payload || {};

      const product_name = p.product_name || p.generic_name || "Unknown";
      const brand = (p.brands || "").split(",")[0]?.trim() || "Unknown";
      const category = (p.categories_tags && p.categories_tags[0]) || (p.categories || "Unknown");
      const nutriscore = p.nutriscore_grade ? String(p.nutriscore_grade).toUpperCase() : null;

      const nutriments = p.nutriments || {};
      const energy_kcal_100g =
        toNumber(nutriments["energy-kcal_100g"] ?? nutriments["energy-kcal_value"]);
      const sugars_100g = toNumber(nutriments["sugars_100g"]);
      const salt_100g = toNumber(nutriments["salt_100g"]);

      const healthy_score = computeHealthyScore(nutriscore, sugars_100g, salt_100g);

      const enrichedDoc = {
        raw_id: rawId,
        status: "success",
        enriched_at: new Date().toISOString(),
        data: {
          product_name,
          brand,
          category,
          nutriscore,
          energy_kcal_100g,
          sugars_100g,
          salt_100g,
          healthy_score,
        },
      };

      await enrCol.insertOne(enrichedDoc);
      success++;
    } catch (err) {
      await enrCol.insertOne({
        raw_id: rawId,
        status: "failed",
        enriched_at: new Date().toISOString(),
        error: { message: err.message },
      });
      failed++;
    }
  }

  console.log("ENRICH DONE:", { success, failed });
  await client.close();
})();