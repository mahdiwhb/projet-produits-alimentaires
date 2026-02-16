// projet-data/etl/lib/score.js

/**
 * Compute an internal "healthy score" (higher = healthier)
 * Heuristic: penalize sugar, salt, and calories.
 * Returns an integer (can be negative).
 */
function computeHealthyScore({ sugars_100g, salt_100g, energy_kcal_100g }) {
  const sugars = Number.isFinite(Number(sugars_100g)) ? Number(sugars_100g) : 0;
  const salt = Number.isFinite(Number(salt_100g)) ? Number(salt_100g) : 0;
  const kcal = Number.isFinite(Number(energy_kcal_100g)) ? Number(energy_kcal_100g) : 0;

  // Base score
  let score = 100;

  // Penalities (tuned so "bad" examples drop lower than "good" examples)
  score -= sugars * 2;      // sugar hurts a lot
  score -= salt * 50;       // salt in g is usually small, so stronger weight
  score -= kcal * 0.1;      // calories moderate weight

  // Return integer
  return Math.round(score);
}

module.exports = { computeHealthyScore };