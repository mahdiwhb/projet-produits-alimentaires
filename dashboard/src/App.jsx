import { useEffect, useState, useMemo } from "react";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";
import { ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, LineChart, Line } from "recharts";

const API = import.meta.env.VITE_API_URL || "http://localhost:4000";
const BG = "#080A08";
const TEXT = "#F5EAD4";
const ACCENT = "#C8873A";
const BORDER = "rgba(200,135,58,0.25)";
const COLORS = ["#6BAF7E", "#E8A050", "#C8873A", "#B85C38", "#8B3A1E"];

export default function App() {
  const [categories, setCategories] = useState([]);
  const [selectedCat, setSelectedCat] = useState(null);
  const [selectedSubcat, setSelectedSubcat] = useState(null);
  const [subcategories, setSubcategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [darkMode, setDarkMode] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [totalProducts, setTotalProducts] = useState(0);
  const [stats, setStats] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [navActive, setNavActive] = useState("overview");

  // Load categories on mount
  useEffect(() => {
    async function loadCats() {
      try {
        const res = await axios.get(`${API}/categories`);
        setCategories(res.data);
        if (res.data.length > 0) {
          setSelectedCat(res.data[0]);
        }
        const statsRes = await axios.get(`${API}/stats`);
        setStats(statsRes.data);
      } catch (e) {
        console.error("Failed to load categories:", e);
      } finally {
        setLoading(false);
      }
    }
    loadCats();
  }, []);

  // Load subcategories when category changes
  useEffect(() => {
    if (!selectedCat) return;
    async function loadSubcats() {
      try {
        const res = await axios.get(`${API}/categories/${selectedCat.id}/subcategories`);
        setSubcategories(res.data);
        if (res.data.length > 0) {
          // Select the first subcategory with products, or first if none have products
          const withProducts = res.data.find(sub => sub.product_count > 0);
          setSelectedSubcat(withProducts || res.data[0]);
          setPage(1);
        }
      } catch (e) {
        console.error("Failed to load subcategories:", e);
      }
    }
    loadSubcats();
  }, [selectedCat]);

  // Load products when subcategory changes
  useEffect(() => {
    if (!selectedSubcat) return;
    async function loadProds() {
      try {
        const res = await axios.get(`${API}/subcategories/${selectedSubcat.id}/products`, {
          params: { page, pageSize },
        });
        setProducts(res.data.items || []);
        setTotalProducts(res.data.total || 0);
      } catch (e) {
        console.error("Failed to load products:", e);
      }
    }
    loadProds();
  }, [selectedSubcat, page, pageSize]);

  const totalPages = Math.ceil(totalProducts / pageSize);
  const bgColor = darkMode ? BG : "#F5E6D3";
  const textColor = darkMode ? TEXT : "#3D2817";
  const cardBg = darkMode ? "#0D110D" : "#E8DCC8";

  const nutriData = useMemo(() => {
    const raw = stats?.nutriscoreBreakdown ?? [];
    return raw.length > 0 ? raw.map((x) => ({ name: x.nutriscore, value: x.count })) : [
      { name: "A", value: 0 },
      { name: "B", value: 0 },
      { name: "C", value: 0 },
      { name: "D", value: 0 },
      { name: "E", value: 0 },
    ];
  }, [stats]);

  const topSubcats = useMemo(() => {
    const raw = stats?.topSubcategories ?? [];
    return raw.length > 0 ? raw.slice(0, 8).map((x) => ({
      name: (x.subcategory || "Other").slice(0, 15),
      value: x.count,
    })) : Array(8).fill(0).map((_, i) => ({ name: `Categ ${i+1}`, value: 0 }));
  }, [stats]);

  const sugarData = useMemo(() => {
    return products
      .filter(it => it.sugars_100g && it.sugars_100g > 0)
      .sort((a, b) => b.sugars_100g - a.sugars_100g)
      .slice(0, 12)
      .map(it => ({ 
        name: (it.product_name || "").substring(0, 15), 
        value: parseFloat(it.sugars_100g.toFixed(1))
      }));
  }, [products]);

  const kcalData = useMemo(() => {
    return products
      .filter(it => it.energy_kcal_100g && it.energy_kcal_100g > 0)
      .sort((a, b) => b.energy_kcal_100g - a.energy_kcal_100g)
      .slice(0, 12)
      .map(it => ({ 
        name: (it.product_name || "").substring(0, 15), 
        value: parseFloat(it.energy_kcal_100g.toFixed(1))
      }));
  }, [products]);

  if (loading) {
    return (
      <div style={{ width: "100vw", height: "100vh", background: bgColor, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ color: textColor }}>Chargement...</div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", width: "100vw", minHeight: "100vh", background: bgColor, color: textColor, fontFamily: "'Space Grotesk', sans-serif" }}>
      {/* Sidebar */}
      <aside style={{ width: 240, background: darkMode ? "#0A0D0A" : "#F0E6D2", borderRight: `1px solid ${BORDER}`, padding: "24px 16px", display: "flex", flexDirection: "column", gap: 16, position: "sticky", top: 0, height: "100vh", overflowY: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <h1 style={{ fontSize: 16, fontWeight: 800, margin: 0 }}>🍎 Food Analytics</h1>
          <button onClick={() => setDarkMode(!darkMode)} style={{ background: ACCENT, color: BG, border: "none", borderRadius: 6, padding: "4px 8px", cursor: "pointer", fontWeight: 600, fontSize: 12 }}>
            {darkMode ? "☀️" : "🌙"}
          </button>
        </div>

        <div style={{ fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase", color: darkMode ? "rgba(200,135,58,0.45)" : "rgba(200,135,58,0.55)", marginBottom: 12, paddingLeft: 4 }}>Pages</div>

        {[
          { icon: "📊", label: "Vue Globale", key: "overview" },
          { icon: "📈", label: "Nutrition", key: "nutrition" },
          { icon: "🔥", label: "Calories", key: "calories" },
          { icon: "⚙️", label: "Paramètres", key: "settings" },
        ].map((item) => (
          <div
            key={item.key}
            onClick={() => setNavActive(item.key)}
            style={{
              padding: "10px 12px",
              borderRadius: 8,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 10,
              fontSize: 13,
              fontWeight: 600,
              color: navActive === item.key ? "#F2BC78" : (darkMode ? "#7A6F60" : "#8B7355"),
              border: `1px solid ${navActive === item.key ? "rgba(200,135,58,0.35)" : "transparent"}`,
              background: navActive === item.key ? "rgba(200,135,58,0.10)" : "transparent",
              transition: "all 0.2s",
            }}
          >
            <span>{item.icon}</span>
            {item.label}
          </div>
        ))}

        <div style={{ borderTop: `1px solid ${BORDER}`, paddingTop: 16, marginTop: 16 }}>
          <div style={{ fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase", color: darkMode ? "rgba(200,135,58,0.45)" : "rgba(200,135,58,0.55)", marginBottom: 12, paddingLeft: 4 }}>Catégories</div>
          {categories.map((cat) => (
            <motion.div
              key={cat.id}
              whileHover={{ x: 4 }}
              onClick={() => { setSelectedCat(cat); setNavActive("categories"); }}
              style={{
                padding: "10px 12px",
                margin: "0 0 6px",
                borderRadius: 6,
                cursor: "pointer",
                background: selectedCat?.id === cat.id ? ACCENT : "transparent",
                color: selectedCat?.id === cat.id ? BG : textColor,
                transition: "all 0.2s",
                fontWeight: 600,
                fontSize: 13,
              }}
            >
              <span style={{ marginRight: 8 }}>{cat.icon}</span>
              {cat.name}
            </motion.div>
          ))}
        </div>
      </aside>

      {/* Main Content */}
      <main style={{ flex: 1, padding: 32, overflowY: "auto", maxHeight: "100vh" }}>
        {navActive === "overview" && <PageOverview stats={stats} nutriData={nutriData} topSubcats={topSubcats} darkMode={darkMode} ACCENT={ACCENT} TEXT={TEXT} BORDER={BORDER} COLORS={COLORS} cardBg={cardBg} />}

        {navActive === "categories" && (
          <PageCategories
            selectedCat={selectedCat}
            selectedSubcat={selectedSubcat}
            setSelectedSubcat={setSelectedSubcat}
            subcategories={subcategories}
            products={products}
            totalPages={totalPages}
            page={setPage}
            pageSize={pageSize}
            setPageSize={setPageSize}
            totalProducts={totalProducts}
            setSelectedProduct={setSelectedProduct}
            darkMode={darkMode}
            cardBg={cardBg}
            BORDER={BORDER}
            ACCENT={ACCENT}
          />
        )}

        {navActive === "nutrition" && <PageNutrition sugarData={sugarData} products={products} darkMode={darkMode} cardBg={cardBg} BORDER={BORDER} />}

        {navActive === "calories" && <PageCalories kcalData={kcalData} products={products} darkMode={darkMode} cardBg={cardBg} BORDER={BORDER} />}

        {navActive === "settings" && <PageSettings darkMode={darkMode} setDarkMode={setDarkMode} stats={stats} />}

        <AnimatePresence>
          {selectedProduct && (
            <ProductModal product={selectedProduct} onClose={() => setSelectedProduct(null)} darkMode={darkMode} BORDER={BORDER} />
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

function PageOverview({ stats, nutriData, topSubcats, darkMode, ACCENT, TEXT, BORDER, COLORS, cardBg }) {
  const avgNutrients = useMemo(() => [
    { label: "Calories", value: Math.round(stats?.averages?.avg_kcal || 0), max: 500 },
    { label: "Sucres", value: (stats?.averages?.avg_sugars || 0).toFixed(1), max: 25 },
    { label: "Sel", value: (stats?.averages?.avg_salt || 0).toFixed(2), max: 2 },
    { label: "Protéines", value: (stats?.averages?.avg_protein || 0).toFixed(1), max: 20 },
  ], [stats]);

  return (
    <>
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 32, color: darkMode ? TEXT : "#3D2817", marginBottom: 4 }}>
          🍎 Food Analytics Dashboard
        </div>
        <div style={{ fontSize: 12, letterSpacing: "0.12em", textTransform: "uppercase", color: darkMode ? "#7A6F60" : "#8B7355" }}>
          Analyse complète • Statistiques globales • Tendances
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 16, marginBottom: 24 }}>
        <KPICard label="Total Produits" value={stats?.total} darkMode={darkMode} />
        <KPICard label="Avg Calories" value={Math.round(stats?.averages?.avg_kcal || 0)} darkMode={darkMode} />
        <KPICard label="Avg Sucres" value={(stats?.averages?.avg_sugars || 0).toFixed(1)} unit="g" darkMode={darkMode} />
        <KPICard label="Avg Sel" value={(stats?.averages?.avg_salt || 0).toFixed(2)} unit="g" darkMode={darkMode} />
        <KPICard label="Avg Score" value={Math.round(stats?.averages?.avg_score || 0)} darkMode={darkMode} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }} style={{ background: cardBg, border: `1px solid ${BORDER}`, borderRadius: 14, padding: 24 }}>
          <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 17, color: darkMode ? TEXT : "#3D2817", marginBottom: 20 }}>Distribution Nutriscore</div>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={nutriData} dataKey="value" outerRadius={90} innerRadius={60} paddingAngle={2} label={{ fill: darkMode ? TEXT : "#3D2817", fontSize: 12 }}>
                {nutriData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={{ background: darkMode ? "#0D110D" : "#E8DCC8", border: `1px solid ${BORDER}` }} />
            </PieChart>
          </ResponsiveContainer>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.05 }} style={{ background: cardBg, border: `1px solid ${BORDER}`, borderRadius: 14, padding: 24 }}>
          <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 17, color: darkMode ? TEXT : "#3D2817", marginBottom: 20 }}>Top 8 Sous-Catégories</div>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={topSubcats} layout="vertical">
              <CartesianGrid stroke={darkMode ? "rgba(200,135,58,0.1)" : "rgba(0,0,0,0.1)"} />
              <XAxis type="number" tick={{ fill: darkMode ? "#B8A890" : "#8B7355", fontSize: 10 }} />
              <YAxis dataKey="name" type="category" tick={{ fill: darkMode ? "#B8A890" : "#8B7355", fontSize: 10 }} width={100} />
              <Tooltip contentStyle={{ background: darkMode ? "#0D110D" : "#E8DCC8", border: `1px solid ${BORDER}` }} />
              <Bar dataKey="value" fill="#6BAF7E" radius={[0, 8, 8, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 24 }}>
        {avgNutrients.map((nutrient, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: i * 0.05 }} style={{ background: cardBg, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 20 }}>
            <div style={{ fontSize: 11, opacity: 0.7, marginBottom: 12, textTransform: "uppercase", fontWeight: 600 }}>{nutrient.label}</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: ACCENT, marginBottom: 12 }}>{nutrient.value}</div>
            <div style={{ height: 6, background: darkMode ? "rgba(200,135,58,0.15)" : "rgba(200,135,58,0.1)", borderRadius: 3, overflow: "hidden" }}>
              <div style={{ height: "100%", background: ACCENT, width: `${Math.min(100, (nutrient.value / nutrient.max) * 100)}%`, transition: "width 0.5s" }} />
            </div>
            <div style={{ fontSize: 10, opacity: 0.5, marginTop: 8 }}>Max: {nutrient.max}</div>
          </motion.div>
        ))}
      </div>

      <div style={{ background: cardBg, border: `1px solid ${BORDER}`, borderRadius: 14, padding: 24 }}>
        <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 17, color: darkMode ? TEXT : "#3D2817", marginBottom: 20 }}>📊 Santé Globale des Produits</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
          <HealthStat label="Score 80+" value={stats?.total ? Math.round((stats?.healthDistribution?.["80+"] || 0) / stats?.total * 100) : 0} icon="🟢" />
          <HealthStat label="Score 60-79" value={stats?.total ? Math.round((stats?.healthDistribution?.["60-79"] || 0) / stats?.total * 100) : 0} icon="🟡" />
          <HealthStat label="Score <60" value={stats?.total ? Math.round((stats?.healthDistribution?.["<60"] || 0) / stats?.total * 100) : 0} icon="🔴" />
        </div>
      </div>
    </>
  );
}

function PageCategories({ selectedCat, selectedSubcat, setSelectedSubcat, subcategories, products, totalPages, page, pageSize, setPageSize, totalProducts, setSelectedProduct, darkMode, cardBg, BORDER, ACCENT }) {
  return (
    <>
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 32, color: darkMode ? "#F5EAD4" : "#3D2817", marginBottom: 4 }}>
          {selectedCat?.icon} {selectedCat?.name}
        </div>
        <div style={{ fontSize: 12, letterSpacing: "0.12em", textTransform: "uppercase", color: darkMode ? "#7A6F60" : "#8B7355" }}>
          {totalProducts} produits détectés
        </div>
      </div>

      {subcategories.length > 0 && (
        <div style={{ padding: "16px 20px", borderBottom: `1px solid ${BORDER}`, overflowX: "auto", marginBottom: 24, background: cardBg, borderRadius: 12 }}>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {subcategories.map((sub) => (
              <motion.button
                key={sub.id}
                whileHover={{ scale: 1.05 }}
                onClick={() => { setSelectedSubcat(sub); page(1); }}
                style={{
                  padding: "10px 16px",
                  borderRadius: 8,
                  border: selectedSubcat?.id === sub.id ? `2px solid ${ACCENT}` : `1px solid ${BORDER}`,
                  background: selectedSubcat?.id === sub.id ? ACCENT : "transparent",
                  color: selectedSubcat?.id === sub.id ? "#080A08" : (darkMode ? "#F5EAD4" : "#3D2817"),
                  cursor: "pointer",
                  fontWeight: 600,
                  fontSize: 13,
                  transition: "all 0.2s",
                }}
              >
                {sub.name} ({sub.product_count})
              </motion.button>
            ))}
          </div>
        </div>
      )}

      {products.length > 0 ? (
        <>
          <div style={{ background: cardBg, border: `1px solid ${BORDER}`, borderRadius: 12, overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ background: ACCENT, color: "#080A08" }}>
                  <th style={{ padding: "12px", textAlign: "left", fontWeight: 600 }}>Produit</th>
                  <th style={{ padding: "12px", textAlign: "center" }}>Marque</th>
                  <th style={{ padding: "12px", textAlign: "center" }}>Code-Barre</th>
                  <th style={{ padding: "12px", textAlign: "center" }}>Nutri</th>
                  <th style={{ padding: "12px", textAlign: "center" }}>Kcal</th>
                  <th style={{ padding: "12px", textAlign: "center" }}>Sucres</th>
                  <th style={{ padding: "12px", textAlign: "center" }}>Sel</th>
                </tr>
              </thead>
              <tbody>
                {products.map((prod) => (
                  <tr
                    key={prod.id}
                    style={{ borderBottom: `1px solid ${BORDER}`, cursor: "pointer" }}
                    onClick={() => setSelectedProduct(prod)}
                    onMouseEnter={(e) => (e.currentTarget.style.background = darkMode ? "rgba(200,135,58,0.08)" : "rgba(200,135,58,0.1)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    <td style={{ padding: "12px" }}>{prod.product_name}</td>
                    <td style={{ padding: "12px", textAlign: "center", fontSize: 12, opacity: 0.8 }}>{prod.brand}</td>
                    <td style={{ padding: "12px", textAlign: "center", fontSize: 12, opacity: 0.8, fontFamily: "monospace" }}>{prod.barcode || "—"}</td>
                    <td style={{ padding: "12px", textAlign: "center", fontWeight: 600, color: prod.nutriscore === "A" ? "#6BAF7E" : "#E8A050" }}>
                      {prod.nutriscore}
                    </td>
                    <td style={{ padding: "12px", textAlign: "center" }}>{prod.energy_kcal_100g}</td>
                    <td style={{ padding: "12px", textAlign: "center" }}>{prod.sugars_100g?.toFixed(1)}</td>
                    <td style={{ padding: "12px", textAlign: "center" }}>{prod.salt_100g?.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ marginTop: 20, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ fontSize: 12, opacity: 0.7 }}>
              Page 1 / {totalPages}
            </div>
            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              style={{
                padding: "8px 12px",
                borderRadius: 6,
                border: `1px solid ${BORDER}`,
                background: cardBg,
                color: darkMode ? "#F5EAD4" : "#3D2817",
                cursor: "pointer",
              }}
            >
              <option>10</option>
              <option>20</option>
              <option>50</option>
            </select>
          </div>
        </>
      ) : (
        <div style={{ height: 300, display: "flex", alignItems: "center", justifyContent: "center", opacity: 0.6 }}>
          Aucun produit dans cette sous-catégorie
        </div>
      )}
    </>
  );
}

function PageNutrition({ sugarData, products, darkMode, cardBg, BORDER }) {
  const saltData = useMemo(() => {
    return products
      .filter(it => it.salt_100g && it.salt_100g > 0)
      .sort((a, b) => b.salt_100g - a.salt_100g)
      .slice(0, 12)
      .map(it => ({ 
        name: (it.product_name || "").substring(0, 15), 
        value: parseFloat(it.salt_100g.toFixed(2))
      }));
  }, [products]);

  const proteinData = useMemo(() => {
    return products
      .filter(it => it.protein_100g && it.protein_100g > 0)
      .sort((a, b) => b.protein_100g - a.protein_100g)
      .slice(0, 12)
      .map(it => ({ 
        name: (it.product_name || "").substring(0, 15), 
        value: parseFloat(it.protein_100g.toFixed(1))
      }));
  }, [products]);

  return (
    <>
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 32, color: darkMode ? "#F5EAD4" : "#3D2817", marginBottom: 4 }}>
          📊 Analyse Nutritionnelle Détaillée
        </div>
        <div style={{ fontSize: 12, letterSpacing: "0.12em", textTransform: "uppercase", color: darkMode ? "#7A6F60" : "#8B7355" }}>
          Sucres, sels, protéines et valeurs nutritionnelles complètes
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }} style={{ background: cardBg, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 24 }}>
          <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 17, color: darkMode ? "#F5EAD4" : "#3D2817", marginBottom: 20 }}>
            🍬 Top 12 Sucres (g/100g)
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={sugarData}>
              <CartesianGrid stroke={darkMode ? "rgba(200,135,58,0.1)" : "rgba(0,0,0,0.1)"} />
              <XAxis dataKey="name" tick={{ fill: darkMode ? "#B8A890" : "#8B7355", fontSize: 10 }} angle={-45} textAnchor="end" height={80} />
              <YAxis tick={{ fill: darkMode ? "#B8A890" : "#8B7355" }} />
              <Tooltip contentStyle={{ background: darkMode ? "#0D110D" : "#E8DCC8", border: `1px solid ${BORDER}` }} />
              <Bar dataKey="value" fill="#E8A050" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.05 }} style={{ background: cardBg, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 24 }}>
          <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 17, color: darkMode ? "#F5EAD4" : "#3D2817", marginBottom: 20 }}>
            🧂 Top 12 Sel (mg/100g)
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={saltData}>
              <CartesianGrid stroke={darkMode ? "rgba(200,135,58,0.1)" : "rgba(0,0,0,0.1)"} />
              <XAxis dataKey="name" tick={{ fill: darkMode ? "#B8A890" : "#8B7355", fontSize: 10 }} angle={-45} textAnchor="end" height={80} />
              <YAxis tick={{ fill: darkMode ? "#B8A890" : "#8B7355" }} />
              <Tooltip contentStyle={{ background: darkMode ? "#0D110D" : "#E8DCC8", border: `1px solid ${BORDER}` }} />
              <Bar dataKey="value" fill="#F19157" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>
      </div>

      <div style={{ background: cardBg, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 24 }}>
        <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 17, color: darkMode ? "#F5EAD4" : "#3D2817", marginBottom: 20 }}>
          💪 Top 12 Protéines (g/100g)
        </div>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={proteinData}>
            <CartesianGrid stroke={darkMode ? "rgba(200,135,58,0.1)" : "rgba(0,0,0,0.1)"} />
            <XAxis dataKey="name" tick={{ fill: darkMode ? "#B8A890" : "#8B7355", fontSize: 10 }} angle={-45} textAnchor="end" height={80} />
            <YAxis tick={{ fill: darkMode ? "#B8A890" : "#8B7355" }} />
            <Tooltip contentStyle={{ background: darkMode ? "#0D110D" : "#E8DCC8", border: `1px solid ${BORDER}` }} />
            <Line type="monotone" dataKey="value" stroke="#6BAF7E" strokeWidth={3} dot={{ fill: "#6BAF7E", r: 4 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </>
  );
}

function PageCalories({ kcalData, products, darkMode, cardBg, BORDER }) {
  const calorieDistribution = useMemo(() => {
    const ranges = [
      { name: "0-50 kcal", min: 0, max: 50, count: 0 },
      { name: "50-100 kcal", min: 50, max: 100, count: 0 },
      { name: "100-200 kcal", min: 100, max: 200, count: 0 },
      { name: "200-300 kcal", min: 200, max: 300, count: 0 },
      { name: "300+ kcal", min: 300, max: Infinity, count: 0 },
    ];
    
    products.forEach(p => {
      const val = p.energy_kcal_100g || 0;
      const range = ranges.find(r => val >= r.min && val < r.max);
      if (range) range.count++;
    });
    
    return ranges;
  }, [products]);

  const topCalorieIntensive = useMemo(() => {
    return products
      .filter(it => it.energy_kcal_100g && it.energy_kcal_100g > 0)
      .sort((a, b) => b.energy_kcal_100g - a.energy_kcal_100g)
      .slice(0, 8)
      .map(it => ({ 
        name: (it.product_name || "").substring(0, 18), 
        value: parseFloat(it.energy_kcal_100g.toFixed(1))
      }));
  }, [products]);

  return (
    <>
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 32, color: darkMode ? "#F5EAD4" : "#3D2817", marginBottom: 4 }}>
          🔥 Analyse Énergétique Complète
        </div>
        <div style={{ fontSize: 12, letterSpacing: "0.12em", textTransform: "uppercase", color: darkMode ? "#7A6F60" : "#8B7355" }}>
          Calories, énergie et densité calorique
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }} style={{ background: cardBg, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 24 }}>
          <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 17, color: darkMode ? "#F5EAD4" : "#3D2817", marginBottom: 20 }}>
            Courbe Énergétique (12 plus caloriques)
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={kcalData}>
              <CartesianGrid stroke={darkMode ? "rgba(200,135,58,0.1)" : "rgba(0,0,0,0.1)"} />
              <XAxis dataKey="name" tick={{ fill: darkMode ? "#B8A890" : "#8B7355", fontSize: 10 }} angle={-45} textAnchor="end" height={80} />
              <YAxis tick={{ fill: darkMode ? "#B8A890" : "#8B7355" }} />
              <Tooltip contentStyle={{ background: darkMode ? "#0D110D" : "#E8DCC8", border: `1px solid ${BORDER}` }} />
              <Line type="monotone" dataKey="value" stroke="#C8873A" strokeWidth={3} dot={{ fill: "#C8873A", r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.05 }} style={{ background: cardBg, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 24 }}>
          <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 17, color: darkMode ? "#F5EAD4" : "#3D2817", marginBottom: 20 }}>
            Distribution Calorique
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={calorieDistribution}>
              <CartesianGrid stroke={darkMode ? "rgba(200,135,58,0.1)" : "rgba(0,0,0,0.1)"} />
              <XAxis dataKey="name" tick={{ fill: darkMode ? "#B8A890" : "#8B7355", fontSize: 10 }} angle={-45} textAnchor="end" height={80} />
              <YAxis tick={{ fill: darkMode ? "#B8A890" : "#8B7355" }} />
              <Tooltip contentStyle={{ background: darkMode ? "#0D110D" : "#E8DCC8", border: `1px solid ${BORDER}` }} />
              <Bar dataKey="count" fill="#D94444" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>
      </div>

      <div style={{ background: cardBg, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 24 }}>
        <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 17, color: darkMode ? "#F5EAD4" : "#3D2817", marginBottom: 20 }}>
          🥇 Top 8 Produits Caloriques
        </div>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={topCalorieIntensive} layout="vertical">
            <CartesianGrid stroke={darkMode ? "rgba(200,135,58,0.1)" : "rgba(0,0,0,0.1)"} />
            <XAxis type="number" tick={{ fill: darkMode ? "#B8A890" : "#8B7355", fontSize: 10 }} />
            <YAxis dataKey="name" type="category" tick={{ fill: darkMode ? "#B8A890" : "#8B7355", fontSize: 10 }} width={120} />
            <Tooltip contentStyle={{ background: darkMode ? "#0D110D" : "#E8DCC8", border: `1px solid ${BORDER}` }} />
            <Bar dataKey="value" fill="#F19157" radius={[0, 8, 8, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </>
  );
}

function PageSettings({ darkMode, setDarkMode, stats }) {
  const nutrientsAvg = useMemo(() => [
    { label: "Calories (kcal)", value: Math.round(stats?.averages?.avg_kcal || 0), icon: "🔥" },
    { label: "Sucres (g)", value: (stats?.averages?.avg_sugars || 0).toFixed(1), icon: "🍬" },
    { label: "Sel (g)", value: (stats?.averages?.avg_salt || 0).toFixed(2), icon: "🧂" },
    { label: "Protéines (g)", value: (stats?.averages?.avg_protein || 0).toFixed(1), icon: "💪" },
  ], [stats]);

  const scoreBreakdown = useMemo(() => [
    { label: "A (Excellent)", value: stats?.nutriscoreBreakdown?.[0]?.count || 0, color: "#6BAF7E" },
    { label: "B (Bon)", value: stats?.nutriscoreBreakdown?.[1]?.count || 0, color: "#A8C66F" },
    { label: "C (Moyen)", value: stats?.nutriscoreBreakdown?.[2]?.count || 0, color: "#F0B233" },
    { label: "D (Mauvais)", value: stats?.nutriscoreBreakdown?.[3]?.count || 0, color: "#F19157" },
    { label: "E (Très mauvais)", value: stats?.nutriscoreBreakdown?.[4]?.count || 0, color: "#D94444" },
  ], [stats]);

  return (
    <>
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 32, color: darkMode ? "#F5EAD4" : "#3D2817", marginBottom: 4 }}>
          ⚙️ Paramètres & Configuration
        </div>
        <div style={{ fontSize: 12, letterSpacing: "0.12em", textTransform: "uppercase", color: darkMode ? "#7A6F60" : "#8B7355" }}>
          Apparence, statistiques et données détaillées
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }} style={{ background: darkMode ? "#0D110D" : "#E8DCC8", border: `1px solid rgba(200,135,58,0.25)`, borderRadius: 12, padding: 24 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: 16, borderBottom: `1px solid rgba(200,135,58,0.25)`, marginBottom: 16 }}>
            <div>
              <div style={{ fontWeight: 600, marginBottom: 4, fontSize: 14 }}>Mode Sombre</div>
              <div style={{ fontSize: 13, opacity: 0.7 }}>Basculer l'apparence de l'interface</div>
            </div>
            <button
              onClick={() => setDarkMode(!darkMode)}
              style={{
                width: 56,
                height: 32,
                borderRadius: 999,
                border: "none",
                background: darkMode ? "#C8873A" : "#B8A890",
                cursor: "pointer",
                padding: "3px",
              }}
            >
              <div style={{
                width: 26,
                height: 26,
                borderRadius: "50%",
                background: darkMode ? "#161A14" : "#F0E6D2",
                transform: darkMode ? "translateX(0)" : "translateX(24px)",
                transition: "transform 0.3s",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 13,
              }}>
                {darkMode ? "🌙" : "☀️"}
              </div>
            </button>
          </div>

          <div style={{ fontSize: 12, fontWeight: 600, textTransform: "uppercase", marginBottom: 16 }}>Moyennes Nutritionnelles</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {nutrientsAvg.map((nutrient, i) => (
              <div key={i} style={{ background: darkMode ? "rgba(200,135,58,0.08)" : "rgba(200,135,58,0.1)", padding: 12, borderRadius: 8 }}>
                <div style={{ fontSize: 11, opacity: 0.7, marginBottom: 4 }}>{nutrient.icon} {nutrient.label}</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: "#C8873A" }}>{nutrient.value}</div>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.05 }} style={{ background: darkMode ? "#0D110D" : "#E8DCC8", border: `1px solid rgba(200,135,58,0.25)`, borderRadius: 12, padding: 24 }}>
          <div style={{ fontSize: 12, fontWeight: 600, textTransform: "uppercase", marginBottom: 16 }}>Distribution Nutriscore</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {scoreBreakdown.map((score, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 30, height: 30, borderRadius: 6, background: score.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: "#fff" }}>
                  {score.label.charAt(0)}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 4 }}>{score.label}</div>
                  <div style={{ height: 6, background: darkMode ? "rgba(200,135,58,0.15)" : "rgba(200,135,58,0.1)", borderRadius: 3, overflow: "hidden" }}>
                    <div style={{ height: "100%", background: score.color, width: `${Math.min(100, (score.value / (stats?.total || 1)) * 100)}%` }} />
                  </div>
                </div>
                <div style={{ fontSize: 11, fontWeight: 700, minWidth: 30, textAlign: "right" }}>{score.value}</div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      <div style={{ background: darkMode ? "#0D110D" : "#E8DCC8", border: `1px solid rgba(200,135,58,0.25)`, borderRadius: 12, padding: 24 }}>
        <div style={{ fontSize: 12, fontWeight: 600, textTransform: "uppercase", marginBottom: 16 }}>📊 Données Globales</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 12 }}>
          <DataStat label="Total Produits" value={stats?.total} icon="📦" />
          <DataStat label="Catégories" value={stats?.categoryCount || 12} icon="📁" />
          <DataStat label="Sous-cat." value={stats?.subcategoryCount || 61} icon="📂" />
          <DataStat label="Score Moy." value={Math.round(stats?.averages?.avg_score || 0)} icon="⭐" />
          <DataStat label="Kcal Moy." value={Math.round(stats?.averages?.avg_kcal || 0)} icon="🔥" />
          <DataStat label="Sucres Moy." value={(stats?.averages?.avg_sugars || 0).toFixed(1)} icon="🍬" />
        </div>
      </div>
    </>
  );
}

function KPICard({ label, value, unit, darkMode }) {
  return (
    <motion.div
      whileHover={{ scale: 1.02, y: -4 }}
      style={{
        background: darkMode ? "#161A14" : "#F0E6D2",
        border: `1px solid rgba(200,135,58,0.28)`,
        borderRadius: 12,
        padding: 20,
        cursor: "pointer",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div style={{ position: "absolute", top: 0, right: 0, width: 60, height: 60, background: "radial-gradient(circle, rgba(200,135,58,0.08), transparent 70%)", borderRadius: "50%" }} />
      <div style={{ position: "relative" }}>
        <div style={{ fontSize: 10, letterSpacing: "0.15em", textTransform: "uppercase", color: darkMode ? "#7A6F60" : "#8B7355", marginBottom: 8 }}>
          {label}
        </div>
        <div style={{ fontSize: 28, fontWeight: 600, color: darkMode ? "#F5EAD4" : "#3D2817" }}>
          {value} {unit && <span style={{ fontSize: 14 }}>{unit}</span>}
        </div>
      </div>
    </motion.div>
  );
}

function StatBox({ label, value }) {
  return (
    <div style={{ textAlign: "center", padding: 12, background: "rgba(200,135,58,0.08)", borderRadius: 8 }}>
      <div style={{ fontSize: 11, opacity: 0.7, marginBottom: 6, textTransform: "uppercase" }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace" }}>{value}</div>
    </div>
  );
}

function HealthStat({ label, value, icon }) {
  return (
    <div style={{ textAlign: "center", padding: 16, background: "rgba(200,135,58,0.08)", borderRadius: 8 }}>
      <div style={{ fontSize: 24, marginBottom: 8 }}>{icon}</div>
      <div style={{ fontSize: 11, opacity: 0.7, marginBottom: 6, textTransform: "uppercase" }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 700, color: "#C8873A" }}>{value}%</div>
    </div>
  );
}

function DataStat({ label, value, icon }) {
  return (
    <div style={{ textAlign: "center", padding: 12, background: "rgba(200,135,58,0.08)", borderRadius: 8 }}>
      <div style={{ fontSize: 18, marginBottom: 6 }}>{icon}</div>
      <div style={{ fontSize: 10, opacity: 0.7, marginBottom: 6, textTransform: "uppercase" }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 700, color: "#C8873A" }}>{value}</div>
    </div>
  );
}

function ProductModal({ product, onClose, darkMode, BORDER }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 999,
      }}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        style={{
          background: darkMode ? "#0D110D" : "#E8DCC8",
          border: `1px solid ${BORDER}`,
          borderRadius: 16,
          padding: 32,
          maxWidth: 500,
          color: darkMode ? "#F5EAD4" : "#3D2817",
        }}
      >
        <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 16, marginTop: 0 }}>{product.product_name}</h2>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 11, opacity: 0.7, marginBottom: 4, textTransform: "uppercase" }}>Marque</div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>{product.brand}</div>
          </div>
          <div>
            <div style={{ fontSize: 11, opacity: 0.7, marginBottom: 4, textTransform: "uppercase" }}>Nutriscore</div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>{product.nutriscore}</div>
          </div>
          <div>
            <div style={{ fontSize: 11, opacity: 0.7, marginBottom: 4, textTransform: "uppercase" }}>Code-Barre</div>
            <div style={{ fontSize: 14, fontWeight: 600, fontFamily: "monospace" }}>{product.barcode || "—"}</div>
          </div>
          <div>
            <div style={{ fontSize: 11, opacity: 0.7, marginBottom: 4, textTransform: "uppercase" }}>Calories</div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>{product.energy_kcal_100g}</div>
          </div>
          <div>
            <div style={{ fontSize: 11, opacity: 0.7, marginBottom: 4, textTransform: "uppercase" }}>Sucres</div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>{product.sugars_100g?.toFixed(1)}</div>
          </div>
        </div>

        <button
          onClick={onClose}
          style={{
            width: "100%",
            padding: "12px",
            borderRadius: 8,
            border: "none",
            background: "#C8873A",
            color: "#080A08",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Fermer
        </button>
      </motion.div>
    </motion.div>
  );
}

function Stat({ label, value }) {
  return (
    <div>
      <div style={{ fontSize: 11, opacity: 0.7, marginBottom: 4, textTransform: "uppercase" }}>{label}</div>
      <div style={{ fontSize: 14, fontWeight: 600 }}>{value}</div>
    </div>
  );
}
