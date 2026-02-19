const { buildUrl, makeRawDoc, PAGE_SIZE } = require("../collect");

test("buildUrl includes expected query params", () => {
  const url = new URL(buildUrl(3));
  expect(url.hostname).toBe("world.openfoodfacts.org");
  expect(url.searchParams.get("page")).toBe("3");
  expect(url.searchParams.get("page_size")).toBe(String(PAGE_SIZE));
  expect(url.searchParams.get("tag_0")).toBe("snacks");
  expect(url.searchParams.get("tagtype_0")).toBe("categories");
});

test("makeRawDoc is deterministic for same payload", () => {
  const payload = { _id: "abc", code: "123", product_name: "Test" };
  const a = makeRawDoc(payload);
  const b = makeRawDoc(payload);

  expect(a.raw_hash).toHaveLength(64);
  expect(a.raw_hash).toBe(b.raw_hash);
  expect(a.payload).toBe(payload);
  expect(a.source).toBe("openfoodfacts");
});
