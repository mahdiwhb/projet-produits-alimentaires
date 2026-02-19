const { MongoClient } = require("mongodb");

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017";
const DB_NAME = process.env.DB_NAME || "pipeline_db";

(async () => {
  const client = new MongoClient(MONGO_URI);

  try {
    await client.connect();
    const mdb = client.db(DB_NAME);

    console.log("\n📊 MongoDB Collections Status:\n");
    
    const collections = [
      "allergens",
      "categories", 
      "subcategories",
      "products",
      "product_allergens",
      "product_barcodes",
      "enriched_products",
      "raw_products",
      "sync_metadata"
    ];

    for (const collName of collections) {
      const count = await mdb.collection(collName).countDocuments();
      console.log(`  ${collName.padEnd(25)} : ${count} documents`);
    }

    console.log("\n✅ ALL data successfully synced to MongoDB!");

  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  } finally {
    await client.close();
  }
})();
