import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import Papa from "papaparse";
import { motion, AnimatePresence } from "framer-motion";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

const API = "http://localhost:4000";
const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#22c55e", "#06b6d4"];

function getNutri(it) {
  const v = it?.nutriscore ?? it?.nutriscore_grade ?? "";
  return String(v).trim().toUpperCase();
}

function normCategory(cat) {
  return String(cat || "")
    .replace(/^en:/i, "")
    .trim();
}

function downloadText(filename, text) {
  const blob = new Blob([text], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function AnimatedNumber({ value, decimals = 0, suffix = "" }) {
  const [n, setN] = useState(0);

  useEffect(() => {
    const from = n;
    const to = Number(value || 0);
    const duration = 500;
    const start = performance.now();

    let raf = 0;
    const tick = (t) => {
      const p = Math.min(1, (t - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      const cur = from + (to - from) * eased;
      setN(cur);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <span>
      {Number.isFinite(n) ? n.toFixed(decimals) : (0).toFixed(decimals)}
      {suffix}
    </span>
  );
}

export default function App() {
  const [items, setItems] = useState([]);
  const [stats, setStats] = useState(null);
  const [selected, setSelected] = useState(null);

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  // Pagination
  const [page, setPage] = useState(1);
  const pageSize = 10;

  // Filters (4+)
  const [q, setQ] = useState("");
  const [nutriFilter, setNutriFilter] = useState("ALL"); // ALL | A | B | C | D | E
  const [categoryFilter, setCategoryFilter] = useState("ALL"); // ALL | category
  const [minScore, setMinScore] = useState(""); // number input (string)

  // Sort
  const [sort, setSort] = useState("score_desc"); // score_desc | score_asc | name_asc | name_desc | sugar_asc | sugar_desc
  const [theme, setTheme] = useState("dark"); // dark | light

  // Fetch (items paginés + stats globales)
  useEffect(() => {
    let cancelled = false;

    async function run() {
      try {
        setLoading(true);
        setErr("");

        const [itemsRes, statsRes] = await Promise.all([
          axios.get(`${API}/items`, { params: { page, pageSize } }),
          axios.get(`${API}/stats`),
        ]);

        if (cancelled) return;

        setItems(itemsRes.data.items || []);
        setStats(statsRes.data);
      } catch (e) {
        if (cancelled) return;
        setErr(e?.message || "Erreur de chargement");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [page]);

  // Theme tokens
  const t = useMemo(() => {
    const dark = {
      bg: "linear-gradient(135deg,#0b1220,#0f172a,#111c33)",
      panel: "rgba(255,255,255,0.06)",
      panel2: "rgba(255,255,255,0.04)",
      border: "rgba(255,255,255,0.12)",
      text: "#e2e8f0",
      muted: "rgba(226,232,240,0.70)",
      grid: "rgba(255,255,255,0.06)",
      tooltipBg: "rgba(15,23,42,0.95)",
    };
    const light = {
      bg: "linear-gradient(135deg,#f5f7fb,#eef2ff,#f8fafc)",
      panel: "rgba(255,255,255,0.85)",
      panel2: "rgba(255,255,255,0.72)",
      border: "rgba(15,23,42,0.10)",
      text: "#0f172a",
      muted: "rgba(15,23,42,0.60)",
      grid: "rgba(15,23,42,0.08)",
      tooltipBg: "rgba(255,255,255,0.95)",
    };
    return theme === "dark" ? dark : light;
  }, [theme]);

  const glassCard = useMemo(
    () => ({
      background: t.panel,
      border: `1px solid ${t.border}`,
      backdropFilter: "blur(12px)",
      WebkitBackdropFilter: "blur(12px)",
      borderRadius: 16,
      boxShadow: theme === "dark" ? "0 20px 60px rgba(0,0,0,0.35)" : "0 14px 40px rgba(15,23,42,0.10)",
    }),
    [t, theme]
  );

  const total = stats?.total ?? 0;
  const averages = stats?.averages ?? {};
  const avgScore = Number(averages.avg_score ?? 0);
  const avgSugars = Number(averages.avg_sugars ?? 0);
  const avgKcal = Number(averages.avg_kcal ?? 0);

  const nutriData = useMemo(() => {
    const raw = stats?.nutriscoreBreakdown ?? [];
    return raw.map((x) => ({ name: x.nutriscore, value: x.count }));
  }, [stats]);

  const topCategories = useMemo(() => {
    const raw = stats?.topCategories ?? [];
    return raw.slice(0, 6).map((x) => ({
      name: normCategory(x.category).slice(0, 20),
      value: x.count,
    }));
  }, [stats]);

  // ✅ Options catégorie (mix items page + topCategories stats)
  const categoryOptions = useMemo(() => {
    const set = new Set();
    for (const it of items) {
      const c = normCategory(it.category);
      if (c) set.add(c);
    }
    for (const c of stats?.topCategories ?? []) {
      const cc = normCategory(c.category);
      if (cc) set.add(cc);
    }
    return ["ALL", ...Array.from(set).sort((a, b) => a.localeCompare(b))];
  }, [items, stats]);

  // Filtering + sorting (client-side)
  const viewItems = useMemo(() => {
    let out = items;

    const s = q.trim().toLowerCase();
    if (s) {
      out = out.filter((it) => {
        const name = (it.product_name || "").toLowerCase();
        const brand = (it.brand || "").toLowerCase();
        const cat = normCategory(it.category).toLowerCase();
        return name.includes(s) || brand.includes(s) || cat.includes(s);
      });
    }

    if (nutriFilter !== "ALL") {
      out = out.filter((it) => getNutri(it) === nutriFilter);
    }

    if (categoryFilter !== "ALL") {
      out = out.filter((it) => normCategory(it.category) === categoryFilter);
    }

    const ms = minScore === "" ? null : Number(minScore);
    if (ms !== null && !Number.isNaN(ms)) {
      out = out.filter((it) => {
        const v = Number(it.healthy_score);
        return Number.isFinite(v) ? v >= ms : false;
      });
    }

    const safeScore = (x) => {
      const v = Number(x?.healthy_score);
      return Number.isFinite(v) ? v : -999999;
    };
    const safeSugar = (x) => {
      const v = Number(x?.sugars_100g);
      return Number.isFinite(v) ? v : 999999; // sucre manquant -> très haut pour sugar_asc
    };
    const safeName = (x) => (x?.product_name || "").toLowerCase();

    out = [...out].sort((a, b) => {
      if (sort === "score_desc") return safeScore(b) - safeScore(a);
      if (sort === "score_asc") return safeScore(a) - safeScore(b);
      if (sort === "name_asc") return safeName(a).localeCompare(safeName(b));
      if (sort === "name_desc") return safeName(b).localeCompare(safeName(a));
      if (sort === "sugar_asc") return safeSugar(a) - safeSugar(b);
      if (sort === "sugar_desc") return safeSugar(b) - safeSugar(a);
      return 0;
    });

    return out;
  }, [items, q, nutriFilter, categoryFilter, minScore, sort]);

  const chipStyle = (nutri) => {
    const n = (nutri || "").toUpperCase();
    const mapDark = {
      A: "rgba(34,197,94,0.20)",
      B: "rgba(16,185,129,0.20)",
      C: "rgba(245,158,11,0.20)",
      D: "rgba(249,115,22,0.20)",
      E: "rgba(239,68,68,0.20)",
    };
    const mapLight = {
      A: "rgba(34,197,94,0.18)",
      B: "rgba(16,185,129,0.18)",
      C: "rgba(245,158,11,0.18)",
      D: "rgba(249,115,22,0.18)",
      E: "rgba(239,68,68,0.18)",
    };
    const map = theme === "dark" ? mapDark : mapLight;
    return {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      minWidth: 36,
      height: 28,
      padding: "0 10px",
      borderRadius: 999,
      background: map[n] || (theme === "dark" ? "rgba(148,163,184,0.18)" : "rgba(15,23,42,0.08)"),
      border: `1px solid ${t.border}`,
      fontWeight: 800,
      letterSpacing: 0.5,
      color: t.text,
    };
  };

  function exportCSV() {
    // export des items visibles (filtrés/triés) de la page courante
    const rows = viewItems.map((it) => ({
      id: it.id,
      product_name: it.product_name,
      brand: it.brand,
      category: it.category,
      nutriscore: it.nutriscore ?? it.nutriscore_grade,
      healthy_score: it.healthy_score,
      energy_kcal_100g: it.energy_kcal_100g,
      sugars_100g: it.sugars_100g,
      salt_100g: it.salt_100g,
    }));

    const csv = Papa.unparse(rows);
    downloadText(`items_page_${page}.csv`, csv);
  }

  if (err) {
    return (
      <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24, color: t.text, background: t.bg }}>
        <div style={{ ...glassCard, padding: 22, maxWidth: 720, width: "100%" }}>
          <h2 style={{ marginTop: 0 }}>Erreur</h2>
          <p style={{ opacity: 0.9 }}>{err}</p>
          <p style={{ opacity: 0.7, fontSize: 13 }}>
            Vérifie que l’API tourne sur <b>http://localhost:4000</b> et que <b>/stats</b> répond.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: t.bg, color: t.text }}>
      {/* Loader overlay */}
      <AnimatePresence>
        {loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: "fixed",
              inset: 0,
              display: "grid",
              placeItems: "center",
              background: theme === "dark" ? "rgba(0,0,0,0.35)" : "rgba(255,255,255,0.55)",
              zIndex: 99,
            }}
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              style={{ ...glassCard, padding: 18, display: "flex", alignItems: "center", gap: 12 }}
            >
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 0.9, ease: "linear" }}
                style={{
                  width: 18,
                  height: 18,
                  borderRadius: 999,
                  border: `3px solid ${t.border}`,
                  borderTopColor: "#3b82f6",
                }}
              />
              <div style={{ fontWeight: 800 }}>Chargement…</div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div style={{ display: "flex" }}>
        {/* Sidebar */}
        <aside
          style={{
            width: 270,
            padding: 22,
            position: "sticky",
            top: 0,
            height: "100vh",
            borderRight: `1px solid ${theme === "dark" ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.08)"}`,
            background: t.panel2,
            backdropFilter: "blur(10px)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 12,
                background: theme === "dark" ? "rgba(59,130,246,0.18)" : "rgba(59,130,246,0.12)",
                border: `1px solid ${t.border}`,
                display: "grid",
                placeItems: "center",
                fontWeight: 900,
              }}
            >
              🍎
            </div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 900 }}>Food Analytics</div>
              <div style={{ fontSize: 12, opacity: 0.7 }}>Dashboard</div>
            </div>
          </div>

          <div style={{ marginTop: 18, ...glassCard, padding: 16 }}>
            <div style={{ fontSize: 12, opacity: 0.7 }}>Total produits</div>
            <div style={{ fontSize: 28, fontWeight: 900, marginTop: 6 }}>
              <AnimatedNumber value={total} decimals={0} />
            </div>
          </div>

          <div style={{ marginTop: 12, ...glassCard, padding: 14 }}>
            <div style={{ fontSize: 12, opacity: 0.7 }}>Thème</div>
            <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
              <button onClick={() => setTheme("dark")} style={btnStyle(t, theme === "dark")}>
                🌙 Dark
              </button>
              <button onClick={() => setTheme("light")} style={btnStyle(t, theme === "light")}>
                ☀️ Light
              </button>
            </div>
          </div>

          <div style={{ marginTop: 14, fontSize: 12, opacity: 0.7 }}>
            Tri/filtre = <b>sur la page</b> (10 items).
            <div style={{ marginTop: 8, opacity: 0.85 }}>
            </div>
          </div>

          <div style={{ marginTop: 14, fontSize: 12, opacity: 0.7 }}>
            API: <span style={{ opacity: 0.95 }}>{API}</span>
          </div>
        </aside>

        {/* Main */}
        <main style={{ flex: 1, padding: 26, maxWidth: 1200, margin: "0 auto" }}>
          {/* Topbar */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 16, marginBottom: 14 }}>
            <div>
              <div style={{ fontSize: 28, fontWeight: 1000, letterSpacing: -0.6 }}>Food Dashboard</div>
              <div style={{ opacity: 0.7, marginTop: 6, fontSize: 13 }}>Vue globale des produits • Recharts • API Express</div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher produit, marque, catégorie…" style={inputStyle(t)} />
              <button onClick={() => { setQ(""); setNutriFilter("ALL"); setCategoryFilter("ALL"); setMinScore(""); }} style={buttonBase(t)}>
                Reset
              </button>
              <button onClick={exportCSV} style={{ ...buttonBase(t), borderColor: "rgba(59,130,246,0.35)" }}>
                Export CSV
              </button>
            </div>
          </div>

          {/* Filters row */}
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 14 }}>
            <div style={{ ...glassCard, padding: 12, display: "flex", gap: 10, alignItems: "center" }}>
              <span style={{ fontSize: 12, opacity: 0.75 }}>Nutriscore</span>
              <select value={nutriFilter} onChange={(e) => setNutriFilter(e.target.value)} style={selectStyle(t)}>
                <option value="ALL">Tous</option>
                <option value="A">A</option>
                <option value="B">B</option>
                <option value="C">C</option>
                <option value="D">D</option>
                <option value="E">E</option>
              </select>
            </div>

            {/* ✅ Filtre catégorie */}
            <div style={{ ...glassCard, padding: 12, display: "flex", gap: 10, alignItems: "center" }}>
              <span style={{ fontSize: 12, opacity: 0.75 }}>Catégorie</span>
              <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} style={selectStyle(t)}>
                {categoryOptions.map((c) => (
                  <option key={c} value={c}>
                    {c === "ALL" ? "Toutes" : c}
                  </option>
                ))}
              </select>
            </div>

            {/* ✅ Filtre score min */}
            <div style={{ ...glassCard, padding: 12, display: "flex", gap: 10, alignItems: "center" }}>
              <span style={{ fontSize: 12, opacity: 0.75 }}>Score min</span>
              <input
                value={minScore}
                onChange={(e) => setMinScore(e.target.value)}
                placeholder="ex: 0"
                inputMode="numeric"
                style={{ ...inputStyle(t), width: 140 }}
              />
            </div>

            {/* Tri */}
            <div style={{ ...glassCard, padding: 12, display: "flex", gap: 10, alignItems: "center" }}>
              <span style={{ fontSize: 12, opacity: 0.75 }}>Tri</span>
              <select value={sort} onChange={(e) => setSort(e.target.value)} style={selectStyle(t)}>
                <option value="score_desc">Score (desc)</option>
                <option value="score_asc">Score (asc)</option>
                <option value="name_asc">Nom (A→Z)</option>
                <option value="name_desc">Nom (Z→A)</option>
                <option value="sugar_asc">Sucre (asc)</option>
                <option value="sugar_desc">Sucre (desc)</option>
              </select>
            </div>
          </div>

          {/* KPI cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0,1fr))", gap: 12, marginBottom: 14 }}>
            <KPI t={t} theme={theme} title="Produits" value={<AnimatedNumber value={total} />} accent="rgba(59,130,246,0.22)" />
            <KPI t={t} theme={theme} title="Score moyen" value={<AnimatedNumber value={avgScore} decimals={2} />} accent="rgba(16,185,129,0.22)" />
            <KPI t={t} theme={theme} title="Sucre moyen" value={<AnimatedNumber value={avgSugars} decimals={2} suffix=" g" />} accent="rgba(245,158,11,0.22)" />
            <KPI t={t} theme={theme} title="Kcal moyen" value={<AnimatedNumber value={avgKcal} decimals={0} />} accent="rgba(139,92,246,0.22)" />
          </div>

          {/* Charts */}
          <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 12, marginBottom: 14 }}>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35 }}
              style={{ ...glassCard, padding: 16 }}
            >
              <div style={{ fontWeight: 900, marginBottom: 10 }}>Répartition Nutriscore</div>
              <div style={{ height: 300 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={nutriData}
                      dataKey="value"
                      outerRadius={120}
                      innerRadius={75}
                      paddingAngle={3}
                      isAnimationActive={true}
                      animationDuration={900}
                    >
                      {nutriData.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle(t)} labelStyle={{ color: t.text }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 0.05 }}
              style={{ ...glassCard, padding: 16 }}
            >
              <div style={{ fontWeight: 900, marginBottom: 10 }}>Top Catégories</div>
              <div style={{ height: 300 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topCategories}>
                    <CartesianGrid stroke={t.grid} vertical={false} />
                    <XAxis dataKey="name" tick={{ fill: t.muted, fontSize: 12 }} />
                    <YAxis tick={{ fill: t.muted, fontSize: 12 }} />
                    <Tooltip contentStyle={tooltipStyle(t)} labelStyle={{ color: t.text }} />
                    <Bar dataKey="value" fill="#10b981" radius={[10, 10, 0, 0]} isAnimationActive animationDuration={900} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </motion.div>
          </div>

          {/* Table */}
          <div style={{ ...glassCard, overflow: "hidden" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: 14 }}>
              <div>
                <div style={{ fontWeight: 1000 }}>Produits</div>
                <div style={{ fontSize: 12, opacity: 0.7 }}>
                  Page {page} • {viewItems.length} résultats (sur {pageSize} items chargés)
                </div>
              </div>

              <div style={{ display: "flex", gap: 10 }}>
                <button disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} style={buttonBase(t, page <= 1)}>
                  ← Prev
                </button>
                <button onClick={() => setPage((p) => p + 1)} style={buttonBase(t)}>
                  Next →
                </button>
              </div>
            </div>

            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead style={{ background: t.panel2 }}>
                <tr>
                  <Th t={t}>Produit</Th>
                  <Th t={t}>Marque</Th>
                  <Th t={t}>Nutri</Th>
                  <Th t={t}>Score</Th>
                </tr>
              </thead>

              <tbody>
                {viewItems.map((item) => (
                  <tr
                    key={item.id}
                    onClick={() => setSelected(item)}
                    style={{
                      borderTop: `1px solid ${theme === "dark" ? "rgba(255,255,255,0.06)" : "rgba(15,23,42,0.06)"}`,
                      cursor: "pointer",
                      transition: "background 0.15s ease",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = theme === "dark" ? "rgba(255,255,255,0.03)" : "rgba(15,23,42,0.03)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    <Td>
                      <div style={{ fontWeight: 900 }}>{item.product_name || "—"}</div>
                      <div style={{ fontSize: 12, opacity: 0.65 }}>{normCategory(item.category)}</div>
                    </Td>
                    <Td>{item.brand || "—"}</Td>

                    {/* ✅ FIX: le chip doit être dans un TD */}
                    <Td>
                      <span style={chipStyle(getNutri(item))}>{getNutri(item) || "—"}</span>
                    </Td>

                    <Td style={{ fontWeight: 900 }}>{item.healthy_score ?? "—"}</Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Modal */}
          <AnimatePresence>
            {selected && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setSelected(null)}
                style={{
                  position: "fixed",
                  inset: 0,
                  background: "rgba(0,0,0,0.55)",
                  display: "grid",
                  placeItems: "center",
                  padding: 18,
                  zIndex: 90,
                }}
              >
                <motion.div
                  initial={{ scale: 0.98, y: 10 }}
                  animate={{ scale: 1, y: 0 }}
                  exit={{ scale: 0.98, y: 10 }}
                  transition={{ duration: 0.2 }}
                  onClick={(e) => e.stopPropagation()}
                  style={{ ...glassCard, width: "min(760px, 96vw)", padding: 18 }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                    <div>
                      <div style={{ fontSize: 18, fontWeight: 1000 }}>{selected.product_name}</div>
                      <div style={{ opacity: 0.7, marginTop: 4 }}>
                        {selected.brand || "—"} • {normCategory(selected.category)}
                      </div>
                    </div>
                    <button onClick={() => setSelected(null)} style={buttonBase(t)}>
                      Fermer ✕
                    </button>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 12, marginTop: 14 }}>
                    <MiniStat t={t} label="Nutriscore" value={(selected.nutriscore || selected.nutriscore_grade || "—").toUpperCase()} />
                    <MiniStat t={t} label="Healthy score" value={selected.healthy_score ?? "—"} />
                    <MiniStat t={t} label="Kcal / 100g" value={selected.energy_kcal_100g ?? "—"} />
                    <MiniStat t={t} label="Sucres / 100g" value={selected.sugars_100g ?? "—"} />
                    <MiniStat t={t} label="Sel / 100g" value={selected.salt_100g ?? "—"} />
                    <MiniStat t={t} label="ID" value={selected.id ?? "—"} />
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}

function KPI({ t, theme, title, value, accent }) {
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      transition={{ duration: 0.15 }}
      style={{
        padding: 14,
        borderRadius: 16,
        background: t.panel,
        border: `1px solid ${t.border}`,
        boxShadow: theme === "dark" ? "0 16px 45px rgba(0,0,0,0.30)" : "0 12px 34px rgba(15,23,42,0.10)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: -80,
          background: `radial-gradient(circle at 20% 20%, ${accent}, transparent 55%)`,
          pointerEvents: "none",
        }}
      />
      <div style={{ position: "relative" }}>
        <div style={{ fontSize: 12, opacity: 0.7 }}>{title}</div>
        <div style={{ marginTop: 8, fontSize: 26, fontWeight: 1000 }}>{value}</div>
      </div>
    </motion.div>
  );
}

function MiniStat({ t, label, value }) {
  return (
    <div style={{ padding: 12, borderRadius: 14, background: t.panel2, border: `1px solid ${t.border}` }}>
      <div style={{ fontSize: 12, opacity: 0.7 }}>{label}</div>
      <div style={{ marginTop: 6, fontSize: 16, fontWeight: 1000 }}>{value}</div>
    </div>
  );
}

function Th({ t, children }) {
  return (
    <th style={{ textAlign: "left", padding: "12px 14px", fontSize: 12, textTransform: "uppercase", letterSpacing: 0.6, opacity: 0.75, color: t.text }}>
      {children}
    </th>
  );
}

function Td({ children }) {
  return <td style={{ padding: "12px 14px", verticalAlign: "top" }}>{children}</td>;
}

function tooltipStyle(t) {
  return {
    background: t.tooltipBg,
    border: `1px solid ${t.border}`,
    borderRadius: 12,
    color: t.text,
  };
}

function inputStyle(t) {
  return {
    width: 320,
    padding: "10px 12px",
    borderRadius: 12,
    outline: "none",
    border: `1px solid ${t.border}`,
    background: t.panel2,
    color: t.text,
  };
}

function selectStyle(t) {
  return {
    padding: "8px 10px",
    borderRadius: 12,
    border: `1px solid ${t.border}`,
    background: t.panel2,
    color: t.text,
    outline: "none",
  };
}

function buttonBase(t, disabled = false) {
  return {
    padding: "10px 12px",
    borderRadius: 12,
    border: `1px solid ${t.border}`,
    background: disabled ? t.panel2 : t.panel,
    color: t.text,
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.55 : 1,
  };
}

function btnStyle(t, active) {
  return {
    padding: "10px 12px",
    borderRadius: 12,
    border: `1px solid ${active ? "rgba(59,130,246,0.45)" : t.border}`,
    background: active ? "rgba(59,130,246,0.14)" : t.panel,
    color: t.text,
    cursor: "pointer",
    fontWeight: 900,
  };
}