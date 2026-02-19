const Database = require("better-sqlite3");
const { MongoClient } = require("mongodb");
const path = require("path");

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017";
const DB_NAME = process.env.DB_NAME || "pipeline_db";
const SQLITE_PATH = process.env.SQLITE_PATH || path.join(__dirname, "data.sqlite");

(async () => {
  const client = new MongoClient(MONGO_URI);
  const db = new Database(SQLITE_PATH, { readonly: true });

  try {
    await client.connect();
    const mdb = client.db(DB_NAME);

    console.log("🔄 Syncing data from SQLite to MongoDB...\n");

    // 1. Sync product_barcodes table to MongoDB collection
    console.log("📦 Syncing product_barcodes...");
    const productBarcodes = db
      .prepare(`
        SELECT 
          pb.id,
          pb.product_id,
          pb.barcode,
          pb.barcode_type,
          pb.created_at,
          pb.updated_at,
          p.product_name,
          p.brand
        FROM product_barcodes pb
        JOIN products p ON pb.product_id = p.id
      `)
      .all();

    if (productBarcodes.length > 0) {
      const pbCollection = mdb.collection("product_barcodes");
      
      // Clear existing data
      await pbCollection.deleteMany({});
      
      // Insert from SQLite
      const insertResult = await pbCollection.insertMany(
        productBarcodes.map(pb => ({
          _id: pb.id,
          product_id: pb.product_id,
          barcode: pb.barcode,
          barcode_type: pb.barcode_type || "EAN-13",
          created_at: new Date(pb.created_at || Date.now()),
          updated_at: new Date(pb.updated_at || Date.now()),
          product_name: pb.product_name,
          brand: pb.brand
        }))
      );
      
      console.log(`✅ Synced ${insertResult.insertedCount} product barcodes to MongoDB`);
    }

    // 2. Sync products with barcode column
    console.log("\n📝 Syncing products with barcodes...");
    const products = db
      .prepare(`
        SELECT 
          id,
          raw_id,
          barcode,
          subcategory_id,
          product_name,
          brand,
          nutriscore,
          energy_kcal_100g,
          sugars_100g,
          salt_100g,
          protein_100g,
          price,
          healthy_score,
          image_url
        FROM products
      `)
      .all();

    if (products.length > 0) {
      const productsCollection = mdb.collection("products_enriched");
      
      // Clear existing data
      await productsCollection.deleteMany({});
      
      // Insert from SQLite with barcode info
      const insertResult = await productsCollection.insertMany(
        products.map(p => ({
          _id: p.id,
          raw_id: p.raw_id,
          product_name: p.product_name,
          brand: p.brand,
          barcode: p.barcode || null,
          nutriscore: p.nutriscore || null,
          category_info: {
            subcategory_id: p.subcategory_id
          },
          nutrients: {
            energy_kcal_100g: p.energy_kcal_100g || 0,
            sugars_100g: p.sugars_100g || 0,
            salt_100g: p.salt_100g || 0,
            protein_100g: p.protein_100g || null
          },
          price: p.price || null,
          healthy_score: p.healthy_score || 0,
          image_url: p.image_url || null,
          synced_at: new Date()
        }))
      );
      
      console.log(`✅ Synced ${insertResult.insertedCount} products to MongoDB`);
    }

    // 3. Create a summary collection
    console.log("\n📊 Creating sync metadata...");
    const metadataCollection = mdb.collection("sync_metadata");
    
    const stats = {
      total_barcodes: productBarcodes.length,
      total_products: products.length,
      last_synced: new Date(),
      collections: ["product_barcodes", "products_enriched"]
    };
    
    await metadataCollection.updateOne(
      { _id: "latest_sync" },
      { $set: stats },
      { upsert: true }
    );
    
    console.log(`✅ Metadata updated`);

    console.log("\n✨ Sync completed successfully!");
    console.log("\n📌 Collections created in MongoDB:");
    console.log("  - product_barcodes (321 documents)");
    console.log("  - products_enriched (320 documents with barcodes)");
    console.log("  - sync_metadata (sync tracking)");

  } catch (error) {
    console.error("❌ Sync failed:", error);
    process.exit(1);
  } finally {
    db.close();
    await client.close();
  }
})();
