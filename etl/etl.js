const fs = require("fs");
const path = require("path");
const Database = require("better-sqlite3");
const { MongoClient } = require("mongodb");
const { computeHealthyScore } = require("./lib/score");

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017";
const DB_NAME = process.env.DB_NAME || "pipeline_db";
const RAW_COLLECTION = "raw_products";
const ENRICHED_COLLECTION = "enriched_products";

const SQLITE_PATH = process.env.SQLITE_PATH || path.join(__dirname, "data.sqlite");

// Load category data
const categoriesData = JSON.parse(fs.readFileSync(path.join(__dirname, "categories.json"), "utf8"));

// Function to classify product into subcategory (returns {categoryName, subcategoryName})
function classifyProduct(productName, brand, originalCategory) {
  const text = `${productName} ${brand} ${originalCategory}`.toLowerCase();
  
  let bestCat = null;
  let bestSubcat = null;
  let bestScore = 0;
  
  // Check each category and its subcategories
  for (const cat of categoriesData.categories) {
    const keywords = categoriesData.categoryKeywords[cat.name] || [];
    let catScore = 0;
    
    for (const keyword of keywords) {
      if (text.includes(keyword.toLowerCase())) {
        catScore++;
      }
    }
    
    // If this category matches, pick a subcategory
    if (catScore > 0 && catScore >= bestScore) {
      bestScore = catScore;
      bestCat = cat;
      // Pick first subcategory of this category as default
      if (cat.subcategories && cat.subcategories.length > 0) {
        bestSubcat = cat.subcategories[0];
      }
    }
  }
  
  // Fallback
  if (!bestCat) {
    bestCat = categoriesData.categories[0];
    bestSubcat = bestCat.subcategories?.[0] || "Autre";
  }
  
  return { categoryName: bestCat.name, subcategoryName: bestSubcat };
}

// Function to estimate missing protein values based on product type
function estimateProtein(productName, brand, subcategoryName, currentProtein) {
  // If protein already exists, return it
  if (currentProtein && currentProtein > 0) {
    return currentProtein;
  }

  const text = `${productName} ${subcategoryName}`.toLowerCase();
  
  // Protein estimation based on subcategory patterns
  const proteinEstimates = {
    cheese: 25,
    meat: 26,
    poultry: 25,
    fish: 20,
    egg: 13,
    legume: 8,
    nuts: 14,
    yogurt: 5,
    milk: 3.2,
    tofu: 15,
    bean: 9,
    lentil: 9,
    chickpea: 8,
    chocolate: 8,
    cereal: 8,
    bread: 9,
    pasta: 13,
    rice: 2.7,
    biscuit: 5,
    snack: 6,
    cracker: 7,
    chips: 4
  };

  // Try to match keywords
  for (const [keyword, value] of Object.entries(proteinEstimates)) {
    if (text.includes(keyword)) {
      return value;
    }
  }

  // Default estimate based on category
  const categoryEstimates = {
    "Produits Laitiers": 6,
    "Viandes & Poissons": 22,
    "Œufs & Légumineuses": 12,
    "Fruits & Légumes": 2,
    "Féculents": 3,
    "Petit-Déjeuner": 8,
    "Snacks & Grignotages": 5,
    "Boissons": 1,
    "Condiments & Sauces": 2,
    "Conserves & Bocaux": 4
  };

  return categoryEstimates[subcategoryName] || 4; // Default 4g
}

(async () => {
  // SQLite init
  const db = new Database(SQLITE_PATH);
  const schema = fs.readFileSync(path.join(__dirname, "schema.sql"), "utf8");
  db.exec(schema);
  
  // Insert categories
  const insertCat = db.prepare(`
    INSERT OR IGNORE INTO categories (name, icon, description)
    VALUES (?, ?, ?)
  `);
  
  const getCatId = db.prepare(`SELECT id FROM categories WHERE name = ?`);
  const insertSubcat = db.prepare(`
    INSERT OR IGNORE INTO subcategories (category_id, name)
    VALUES (?, ?)
  `);
  
  const getSubcatId = db.prepare(`
    SELECT id FROM subcategories WHERE category_id = ? AND name = ?
  `);
  
  // Insert allergens
  const insertAllergen = db.prepare(`
    INSERT OR IGNORE INTO allergens (name) VALUES (?)
  `);
  
  for (const allergen of categoriesData.allergens) {
    insertAllergen.run(allergen);
  }
  
  // Insert categories and subcategories
  const categoryMapping = {}; // Map: categoryName → [subcategoryIds]
  
  for (const cat of categoriesData.categories) {
    insertCat.run(cat.name, cat.icon, "");
    const catRow = getCatId.get(cat.name);
    const catId = catRow.id;
    
    categoryMapping[cat.name] = [];
    for (const subcat of cat.subcategories) {
      insertSubcat.run(catId, subcat);
      const subcatRow = getSubcatId.get(catId, subcat);
      categoryMapping[cat.name].push(subcatRow.id);
    }
  }

  
  const upsert = db.prepare(`
    INSERT INTO products (
      raw_id, barcode, subcategory_id, product_name, brand, nutriscore,
      energy_kcal_100g, sugars_100g, salt_100g, protein_100g, price, healthy_score, image_url
    ) VALUES (
      @raw_id, @barcode, @subcategory_id, @product_name, @brand, @nutriscore,
      @energy_kcal_100g, @sugars_100g, @salt_100g, @protein_100g, @price, @healthy_score, @image_url
    )
    ON CONFLICT(raw_id) DO UPDATE SET
      barcode=excluded.barcode,
      subcategory_id=excluded.subcategory_id,
      product_name=excluded.product_name,
      brand=excluded.brand,
      nutriscore=excluded.nutriscore,
      energy_kcal_100g=excluded.energy_kcal_100g,
      sugars_100g=excluded.sugars_100g,
      salt_100g=excluded.salt_100g,
      protein_100g=excluded.protein_100g,
      price=excluded.price,
      healthy_score=excluded.healthy_score,
      image_url=excluded.image_url
  `);

  const upsertRaw = db.prepare(`
    INSERT INTO raw_products (
      raw_id, raw_hash, source, fetched_at, payload_json
    ) VALUES (
      @raw_id, @raw_hash, @source, @fetched_at, @payload_json
    )
    ON CONFLICT(raw_id) DO UPDATE SET
      raw_hash=excluded.raw_hash,
      source=excluded.source,
      fetched_at=excluded.fetched_at,
      payload_json=excluded.payload_json
  `);

  const upsertEnriched = db.prepare(`
    INSERT INTO enriched_products (
      raw_id, status, enriched_at, product_name, brand, nutriscore,
      energy_kcal_100g, sugars_100g, salt_100g, healthy_score, image_url
    ) VALUES (
      @raw_id, @status, @enriched_at, @product_name, @brand, @nutriscore,
      @energy_kcal_100g, @sugars_100g, @salt_100g, @healthy_score, @image_url
    ) 
    ON CONFLICT(raw_id) DO UPDATE SET
      status=excluded.status,
      enriched_at=excluded.enriched_at,
      product_name=excluded.product_name,
      brand=excluded.brand,
      nutriscore=excluded.nutriscore,
      energy_kcal_100g=excluded.energy_kcal_100g,
      sugars_100g=excluded.sugars_100g,
      salt_100g=excluded.salt_100g,
      healthy_score=excluded.healthy_score,
      image_url=excluded.image_url
  `);

  
  // Mongo connection
  const client = new MongoClient(MONGO_URI);
  await client.connect();
  const mdb = client.db(DB_NAME);
  const rawCol = mdb.collection(RAW_COLLECTION);
  const enrCol = mdb.collection(ENRICHED_COLLECTION);

  // Process raw products
  const rawCursor = rawCol.find({}, { projection: { raw_hash: 1, source: 1, fetched_at: 1, payload: 1 } });
  let rawCount = 0;
  while (await rawCursor.hasNext()) {
    const doc = await rawCursor.next();
    upsertRaw.run({
      raw_id: String(doc._id),
      raw_hash: doc.raw_hash || null,
      source: doc.source || null,
      fetched_at: doc.fetched_at || null,
      payload_json: JSON.stringify(doc.payload || {}),
    });
    rawCount++;
  }

  // Process enriched products and classify
  const cursor = enrCol.find({});
  let count = 0;
  let enrichedCount = 0;
  
  while (await cursor.hasNext()) {
    const doc = await cursor.next();
    const d = doc.data;

    upsertEnriched.run({
      raw_id: String(doc.raw_id),
      status: doc.status || "unknown",
      enriched_at: doc.enriched_at || null,
      product_name: d?.product_name || null,
      brand: d?.brand || null,
      nutriscore: d?.nutriscore || null,
      energy_kcal_100g: d?.energy_kcal_100g ?? null,
      sugars_100g: d?.sugars_100g ?? null,
      salt_100g: d?.salt_100g ?? null,
      healthy_score: d?.healthy_score ?? null,
      image_url: d?.image_url || null,
    });
    enrichedCount++;
    
    if (doc.status === "success") {
      // Get barcode from raw_products payload if available
      const rawProduct = db.prepare(`SELECT payload_json FROM raw_products WHERE raw_id = ?`).get(String(doc.raw_id));
      let barcode = null;
      if (rawProduct && rawProduct.payload_json) {
        try {
          const payload = JSON.parse(rawProduct.payload_json);
          barcode = payload.code || null;
        } catch (e) {
          // Ignore JSON parse errors
        }
      }

      // Classify product into subcategory
      const classified = classifyProduct(d.product_name || "", d.brand || "", d.category || "");
      const categoryId = Array.from(Object.entries(categoryMapping)).find(
        ([catName]) => catName === classified.categoryName
      );
      
      let subcategoryId = null;
      if (categoryId) {
        const subcategoryIds = categoryMapping[classified.categoryName] || [];
        // Find the matching subcategory ID by name
        const subcat = db.prepare(`
          SELECT id FROM subcategories 
          WHERE category_id = (SELECT id FROM categories WHERE name = ?) 
          AND name = ?
        `).get(classified.categoryName, classified.subcategoryName);
        subcategoryId = subcat?.id || subcategoryIds[0] || null;
      }
      
      // Estimate missing protein values
      const estimatedProtein = estimateProtein(
        d.product_name || "",
        d.brand || "",
        classified.subcategoryName,
        d.protein_100g
      );

      // Recalculate health score with new function
      const newHealthScore = computeHealthyScore({
        sugars_100g: d.sugars_100g || 0,
        salt_100g: d.salt_100g || 0,
        energy_kcal_100g: d.energy_kcal_100g || 0,
        protein_100g: estimatedProtein,
        nutriscore: d.nutriscore || null
      });
      
      upsert.run({
        raw_id: String(doc.raw_id),
        barcode: barcode,
        subcategory_id: subcategoryId,
        product_name: d.product_name || "Unknown",
        brand: d.brand || "Unknown",
        nutriscore: d.nutriscore || null,
        energy_kcal_100g: d.energy_kcal_100g ?? 0,
        sugars_100g: d.sugars_100g ?? 0,
        salt_100g: d.salt_100g ?? 0,
        protein_100g: estimatedProtein,
        price: d.price ?? null,
        healthy_score: newHealthScore,
        image_url: d.image_url || null,
      });
      
      count++;
    }
  }

  console.log("ETL DONE:", { raw: rawCount, enriched: enrichedCount, products: count });

  // ============= SYNC ALL DATA TO MONGODB =============
  console.log("\n🔄 Syncing ALL data to MongoDB...");
  
  try {
    // 1. Sync allergens
    const allergens = db.prepare("SELECT id, name FROM allergens").all();
    if (allergens.length > 0) {
      await mdb.collection("allergens").deleteMany({});
      await mdb.collection("allergens").insertMany(
        allergens.map(a => ({ _id: a.id, name: a.name }))
      );
      console.log(`  ✅ Synced ${allergens.length} allergens`);
    }

    // 2. Sync categories
    const categories = db
      .prepare("SELECT id, name, icon, description FROM categories")
      .all();
    if (categories.length > 0) {
      await mdb.collection("categories").deleteMany({});
      await mdb.collection("categories").insertMany(
        categories.map(c => ({
          _id: c.id,
          name: c.name,
          icon: c.icon || null,
          description: c.description || null
        }))
      );
      console.log(`  ✅ Synced ${categories.length} categories`);
    }

    // 3. Sync subcategories
    const subcategories = db
      .prepare(
        "SELECT id, category_id, name, description FROM subcategories"
      )
      .all();
    if (subcategories.length > 0) {
      await mdb.collection("subcategories").deleteMany({});
      await mdb.collection("subcategories").insertMany(
        subcategories.map(s => ({
          _id: s.id,
          category_id: s.category_id,
          name: s.name,
          description: s.description || null
        }))
      );
      console.log(`  ✅ Synced ${subcategories.length} subcategories`);
    }

    // 4. Sync products (main table)
    const products = db
      .prepare(`
        SELECT 
          id, raw_id, barcode, subcategory_id, product_name, brand,
          nutriscore, energy_kcal_100g, sugars_100g, salt_100g,
          protein_100g, price, healthy_score, image_url
        FROM products
      `)
      .all();
    if (products.length > 0) {
      await mdb.collection("products").deleteMany({});
      await mdb.collection("products").insertMany(
        products.map(p => ({
          _id: p.id,
          raw_id: p.raw_id,
          product_name: p.product_name,
          brand: p.brand,
          barcode: p.barcode || null,
          nutriscore: p.nutriscore || null,
          subcategory_id: p.subcategory_id,
          nutrients: {
            energy_kcal_100g: p.energy_kcal_100g || 0,
            sugars_100g: p.sugars_100g || 0,
            salt_100g: p.salt_100g || 0,
            protein_100g: p.protein_100g || null
          },
          price: p.price || null,
          healthy_score: p.healthy_score || 0,
          image_url: p.image_url || null
        }))
      );
      console.log(`  ✅ Synced ${products.length} products with barcodes`);
    }

    // 5. Sync product_allergens
    const productAllergens = db
      .prepare(
        "SELECT product_id, allergen_id FROM product_allergens"
      )
      .all();
    if (productAllergens.length > 0) {
      await mdb.collection("product_allergens").deleteMany({});
      await mdb.collection("product_allergens").insertMany(
        productAllergens.map((pa, idx) => ({
          _id: idx + 1,
          product_id: pa.product_id,
          allergen_id: pa.allergen_id
        }))
      );
      console.log(`  ✅ Synced ${productAllergens.length} product-allergen links`);
    }

    // 6. Update sync metadata
    const metadataCollection = mdb.collection("sync_metadata");
    await metadataCollection.updateOne(
      { _id: "latest_sync" },
      {
        $set: {
          total_allergens: allergens.length,
          total_categories: categories.length,
          total_subcategories: subcategories.length,
          total_products: products.length,
          total_product_allergens: productAllergens.length,
          last_synced: new Date(),
          collections: [
            "allergens",
            "categories",
            "subcategories",
            "products",
            "product_allergens",
            "enriched_products",
            "raw_products"
          ]
        }
      },
      { upsert: true }
    );
    console.log(`  ✅ Metadata updated`);
    console.log("✨ MongoDB sync completed!\n");
  } catch (mongoErr) {
    console.warn("⚠️  MongoDB sync warning:", mongoErr.message);
    console.log("(Continuing without MongoDB sync)\n");
  }
  // =========================================

  await client.close();
  db.close();
})();