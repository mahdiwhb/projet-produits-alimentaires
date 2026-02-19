const axios = require("axios");
const crypto = require("crypto");
const { MongoClient } = require("mongodb");

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017";
const DB_NAME = process.env.DB_NAME || "pipeline_db";
const RAW_COLLECTION = "raw_products";

// On vise 300+ items
const PAGE_SIZE = 50;
const TARGET = 320;
const FETCH_TIMEOUT_MS = 30000;
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1500;

// OpenFoodFacts search endpoint
// On prend une categorie simple : "snacks"
function buildUrl(page) {
  const base = "https://world.openfoodfacts.org/cgi/search.pl";
  const params = new URLSearchParams({
    search_simple: "1",
    action: "process",
    json: "1",
    page_size: String(PAGE_SIZE),
    page: String(page),
    tagtype_0: "categories",
    tag_contains_0: "contains",
    tag_0: "snacks",
  });
  return `${base}?${params.toString()}`;
}

function sha256(str) {
  return crypto.createHash("sha256").update(str).digest("hex");
}

function makeRawDoc(payload) {
  const baseStr =
    JSON.stringify({
      code: payload.code || null,
      _id: payload._id || null,
      product_name: payload.product_name || null,
    }) + JSON.stringify(payload);

  return {
    source: "openfoodfacts",
    fetched_at: new Date().toISOString(),
    raw_hash: sha256(baseStr),
    payload,
  };
}

async function runCollector() {
  const client = new MongoClient(MONGO_URI);
  await client.connect();
  const db = client.db(DB_NAME);
  const col = db.collection(RAW_COLLECTION);

  // index anti doublons sur raw_hash
  await col.createIndex({ raw_hash: 1 }, { unique: true });

  let inserted = 0;
  let page = 1;

  while (inserted < TARGET) {
    const url = buildUrl(page);
    console.log("Fetch:", url);

    let data;
    let ok = false;
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        const res = await axios.get(url, { timeout: FETCH_TIMEOUT_MS });
        data = res.data;
        ok = true;
        break;
      } catch (err) {
        console.error(`Fetch error (attempt ${attempt}/${MAX_RETRIES}):`, err.message);
        if (attempt < MAX_RETRIES) {
          await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
        }
      }
    }

    if (!ok) {
      page++;
      continue;
    }

    const products = Array.isArray(data.products) ? data.products : [];
    if (products.length === 0) {
      console.log("No more products, stopping.");
      break;
    }

    for (const p of products) {
      // payload = 100% brut
      const payload = p;

      // raw_hash stable : id produit si dispo + JSON
      const baseStr = JSON.stringify({
        code: payload.code || null,
        _id: payload._id || null,
        product_name: payload.product_name || null,
      }) + JSON.stringify(payload);

      const doc = makeRawDoc(payload);

      try {
        await col.insertOne(doc);
        inserted++;
      } catch (e) {
        // doublon -> ignore
        if (e.code !== 11000) console.error("Insert error:", e.message);
      }

      if (inserted >= TARGET) break;
    }

    console.log("Inserted so far:", inserted);
    page++;
  }

  console.log("DONE. RAW inserted:", inserted);
  await client.close();
}

if (require.main === module) {
  runCollector();
}

module.exports = {
  buildUrl,
  sha256,
  makeRawDoc,
  PAGE_SIZE,
  TARGET,
};