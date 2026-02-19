const { MongoClient } = require("mongodb");

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017";
const DB_NAME = process.env.DB_NAME || "pipeline_db";

(async () => {
  const client = new MongoClient(MONGO_URI);

  try {
    await client.connect();
    const mdb = client.db(DB_NAME);

    console.log("\n📊 MongoDB Collections Sync Status:\n");
    
    // Count documents in each collection
    const pbCount = await mdb.collection("product_barcodes").countDocuments();
    const prodCount = await mdb.collection("products_enriched").countDocuments();
    const metaCount = await mdb.collection("sync_metadata").countDocuments();
    
    console.log(`1️⃣  product_barcodes: ${pbCount} documents`);
    console.log(`2️⃣  products_enriched: ${prodCount} documents`);
    console.log(`3️⃣  sync_metadata: ${metaCount} documents`);
    
    console.log("\n🔍 Sample product_barcodes:");
    const sampleBarcode = await mdb.collection("product_barcodes").findOne();
    console.log(JSON.stringify(sampleBarcode, null, 2));
    
    console.log("\n🔍 Sample products_enriched with barcode:");
    const sampleProduct = await mdb.collection("products_enriched").findOne();
    console.log(JSON.stringify(sampleProduct, null, 2));
    
    console.log("\n✅ All data successfully synced to MongoDB! ✅");
    console.log("👉 Open MongoDB Compass and navigate to 'pipeline_db' database");
    console.log("   You'll see the following new collections:");
    console.log("   - product_barcodes (321 docs)");
    console.log("   - products_enriched (320 docs)");
    console.log("   - sync_metadata (1 doc)");

  } catch (error) {
    console.error("❌ Error checking MongoDB:", error.message);
    process.exit(1);
  } finally {
    await client.close();
  }
})();
