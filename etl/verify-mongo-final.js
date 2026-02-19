const { MongoClient } = require("mongodb");

async function verifyMongo() {
  const client = new MongoClient("mongodb://localhost:27017");
  try {
    await client.connect();
    const db = client.db("pipeline_db");
    
    console.log("\n🔍 MongoDB Collections Status:\n");
    
    const collections = [
      "allergens",
      "categories",
      "subcategories",
      "products",
      "product_allergens",
      "enriched_products",
      "raw_products",
      "sync_metadata"
    ];
    
    let totalDocs = 0;
    for (const collName of collections) {
      const coll = db.collection(collName);
      const count = await coll.countDocuments();
      console.log(`  📦 ${collName}: ${count} documents`);
      totalDocs += count;
    }
    
    console.log(`\n✅ Total documents: ${totalDocs}`);
    
    // Check a sample product with barcode
    const sample = await db.collection("products").findOne({ barcode: { $ne: null } });
    if (sample) {
      console.log(`\n📦 Sample product with barcode:`);
      console.log(`  Name: ${sample.product_name}`);
      console.log(`  Brand: ${sample.brand}`);
      console.log(`  Barcode: ${sample.barcode}`);
    }
    
    // Check if product_barcodes exists
    const pbCount = await db.collection("product_barcodes").countDocuments().catch(() => 0);
    if (pbCount > 0) {
      console.log(`\n⚠️  WARNING: product_barcodes collection still exists with ${pbCount} documents!`);
    } else {
      console.log(`\n✅ product_barcodes collection properly removed`);
    }
    
  } finally {
    await client.close();
  }
}

verifyMongo().catch(console.error);
