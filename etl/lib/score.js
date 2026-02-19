// projet-data/etl/lib/score.js

/**
 * Compute an internal "healthy score" (0-100, higher = healthier)
 * Based on nutritional quality indicators
 */
function computeHealthyScore({ sugars_100g, salt_100g, energy_kcal_100g, protein_100g, nutriscore }) {
  const sugars = Number.isFinite(Number(sugars_100g)) ? Number(sugars_100g) : 0;
  const salt = Number.isFinite(Number(salt_100g)) ? Number(salt_100g) : 0;
  const kcal = Number.isFinite(Number(energy_kcal_100g)) ? Number(energy_kcal_100g) : 0;
  const protein = Number.isFinite(Number(protein_100g)) ? Number(protein_100g) : 0;

  let score = 50; // Base score

  // Nutriscore bonus (if available)
  if (nutriscore) {
    const nscore = String(nutriscore).toUpperCase();
    if (nscore === 'A') score += 30;
    else if (nscore === 'B') score += 20;
    else if (nscore === 'C') score += 10;
    else if (nscore === 'D') score -= 10;
    else if (nscore === 'E') score -= 30;
  }

  // Sugar penalty (lower is better)
  if (sugars < 5) score += 10;
  else if (sugars < 10) score += 5;
  else if (sugars > 20) score -= 15;
  else if (sugars > 30) score -= 25;

  // Salt penalty (lower is better, in g/100g)
  if (salt < 0.5) score += 10;
  else if (salt > 2) score -= 15;

  // Calorie moderate (not always bad)
  if (kcal < 150) score += 10;
  else if (kcal > 400) score -= 10;

  // Protein bonus (higher is better for satiety)
  if (protein > 15) score += 15;
  else if (protein > 8) score += 8;
  else if (protein > 3) score += 3;

  // Clamp to 0-100 range
  return Math.max(0, Math.min(100, Math.round(score)));
}

module.exports = { computeHealthyScore };