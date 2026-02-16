// etl/lib/upsert.js
function upsertProduct(db, row) {
  // si tu veux IGNORE (ne rien faire si existe) :
  // INSERT OR IGNORE ...
  // si tu veux UPDATE si existe : ON CONFLICT(raw_id) DO UPDATE

  const stmt = db.prepare(`
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

  stmt.run(row);
}

module.exports = { upsertProduct };