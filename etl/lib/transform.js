// etl/lib/transform.js

function normalizeCategory(cat) {
  if (!cat) return "unknown";
  return String(cat).trim();
}

function normalizeNutri(n) {
  if (!n) return "NA";
  const v = String(n).trim().toUpperCase();
  // A,B,C,D,E ou UNKNOWN / NOT-APPLICABLE => on garde propre
  if (["A", "B", "C", "D", "E"].includes(v)) return v;
  if (v === "UNKNOWN") return "UNKNOWN";
  if (v === "NOT-APPLICABLE" || v === "NOT_APPLICABLE") return "NOT-APPLICABLE";
  return "NA";
}

/**
 * Transforme un document enriched_products (Mongo) => ligne SQL products
 * attendu par ton schéma: raw_id, product_name, brand, category, nutriscore, energy_kcal_100g, sugars_100g, salt_100g, healthy_score
 */
function mapEnrichedToProductRow(enrichedDoc) {
  if (!enrichedDoc) throw new Error("enrichedDoc is required");

  const rawId = String(enrichedDoc.raw_id || enrichedDoc.rawId || "");
  const data = enrichedDoc.data || {};

  if (!rawId) throw new Error("raw_id missing");

  const product_name = String(data.product_name || data.productName || "Unknown").trim();
  const brand = String(data.brand || data.brands || "Unknown").trim();
  const category = normalizeCategory(data.category);
  const nutriscore = normalizeNutri(data.nutriscore);

  const energy_kcal_100g = Number(data.energy_kcal_100g ?? data.energyKcal100g ?? 0);
  const sugars_100g = Number(data.sugars_100g ?? data.sugars100g ?? 0);
  const salt_100g = Number(data.salt_100g ?? data.salt100g ?? 0);

  const healthy_score = Number(data.healthy_score ?? data.healthyScore ?? 0);

  return {
    raw_id: rawId,
    product_name,
    brand,
    category,
    nutriscore,
    energy_kcal_100g: Number.isFinite(energy_kcal_100g) ? energy_kcal_100g : 0,
    sugars_100g: Number.isFinite(sugars_100g) ? sugars_100g : 0,
    salt_100g: Number.isFinite(salt_100g) ? salt_100g : 0,
    healthy_score: Number.isFinite(healthy_score) ? healthy_score : 0,
  };
}

module.exports = { mapEnrichedToProductRow };