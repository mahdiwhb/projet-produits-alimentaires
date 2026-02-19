const { buildEnrichedDoc, computeHealthyScore } = require("../enrich");

test("computeHealthyScore favors lower sugar/salt and better nutriscore", () => {
  const good = computeHealthyScore("A", 4, 0.2);
  const bad = computeHealthyScore("D", 30, 2);
  expect(good).toBeGreaterThan(bad);
});

test("buildEnrichedDoc maps payload to enriched doc", () => {
  const rawDoc = {
    _id: "raw123",
    payload: {
      product_name: "Granola",
      brands: "BrandX,BrandY",
      categories_tags: ["en:snacks"],
      nutriscore_grade: "b",
      nutriments: {
        "energy-kcal_100g": 410,
        sugars_100g: 12,
        salt_100g: 0.8,
      },
    },
  };

  const doc = buildEnrichedDoc(rawDoc);
  expect(doc.raw_id).toBe("raw123");
  expect(doc.status).toBe("success");
  expect(doc.data.product_name).toBe("Granola");
  expect(doc.data.brand).toBe("BrandX");
  expect(doc.data.category).toBe("en:snacks");
  expect(doc.data.nutriscore).toBe("B");
  expect(doc.data.energy_kcal_100g).toBe(410);
  expect(doc.data.sugars_100g).toBe(12);
  expect(doc.data.salt_100g).toBe(0.8);
});
