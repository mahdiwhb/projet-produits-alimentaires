const { MongoClient } = require("mongodb");

async function cleanupMongo() {
  const client = new MongoClient("mongodb://localhost:27017");
  try {
    await client.connect();
    const db = client.db("pipeline_db");
    
    console.log("\n🧹 Cleaning up MongoDB...\n");
    
    // Drop product_barcodes collection
    await db.collection("product_barcodes").drop().catch(() => {
      console.log("  ℹ️  product_barcodes collection doesn't exist or already deleted");
    });
    
    console.log("  ✅ Removed product_barcodes collection");
    
    // Update metadata
    await db.collection("sync_metadata").updateOne(
      { _id: "latest_sync" },
      {
        $set: {
          collections: [
            "allergens",
            "categories",
            "subcategories",
            "products",
            "product_allergens",
            "enriched_products",
            "raw_products",
            "sync_metadata"
          ]
        }
      }
    );
    
    console.log("  ✅ Updated metadata");
    
    // Verify
    const remaining = await db.collection("product_barcodes").countDocuments().catch(() => 0);
    if (remaining === 0) {
      console.log("\n✨ Cleanup completed successfully!");
    }
    
  } finally {
    await client.close();
  }
}

cleanupMongo().catch(console.error);
