/* store.jsx — app state: visits per member, persistence, import/export */
const CT_KEY = "countrytrack.v2";

function buildSeedVisits() {
  const { SEED_VISITS } = window.CT_DATA;
  const out = {};
  let dropped = [];
  for (const m of window.CT_DATA.MEMBERS) {
    out[m.id] = [];
    for (const raw of (SEED_VISITS[m.id] || [])) {
      const resolved = window.GEO.resolveName(raw);
      if (resolved) { if (!out[m.id].includes(resolved)) out[m.id].push(resolved); }
      else dropped.push(raw);
    }
  }
  if (dropped.length) console.warn("[seed] unmatched country names dropped:", [...new Set(dropped)]);
  return out;
}

function loadVisits() {
  try {
    const raw = localStorage.getItem(CT_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.visits) return parsed.visits;
    }
  } catch (e) { console.warn("[store] load failed", e); }
  return buildSeedVisits();
}

function useStore() {
  const members = window.CT_DATA.MEMBERS;
  const [visits, setVisits] = useState(loadVisits);

  // persist
  useEffect(() => {
    try { localStorage.setItem(CT_KEY, JSON.stringify({ version: 1, savedAt: Date.now(), visits })); }
    catch (e) { console.warn("[store] save failed", e); }
  }, [visits]);

  const isVisited = useCallback((mid, country) => (visits[mid] || []).includes(country), [visits]);

  const visitorsOf = useCallback((country) =>
    members.filter(m => (visits[m.id] || []).includes(country)).map(m => m.id), [visits, members]);

  const setMemberCountry = useCallback((mid, country, on) => {
    setVisits(prev => {
      const cur = new Set(prev[mid] || []);
      if (on) cur.add(country); else cur.delete(country);
      return { ...prev, [mid]: [...cur] };
    });
  }, []);

  const toggle = useCallback((mid, country) => {
    setVisits(prev => {
      const cur = new Set(prev[mid] || []);
      if (cur.has(country)) cur.delete(country); else cur.add(country);
      return { ...prev, [mid]: [...cur] };
    });
  }, []);

  const resetToSeed = useCallback(() => setVisits(buildSeedVisits()), []);
  const clearAll = useCallback(() => {
    const empty = {}; members.forEach(m => empty[m.id] = []); setVisits(empty);
  }, [members]);

  const importVisits = useCallback((obj) => {
    if (!obj || typeof obj !== "object") return false;
    const incoming = obj.visits || obj;
    const next = {};
    for (const m of members) {
      const arr = Array.isArray(incoming[m.id]) ? incoming[m.id] : [];
      next[m.id] = [...new Set(arr.map(n => window.GEO.resolveName(n) || n).filter(Boolean))];
    }
    setVisits(next);
    return true;
  }, [members]);

  const exportObj = useCallback(() => ({ version: 1, savedAt: Date.now(),
    members: members.map(m => ({ id: m.id, name: m.name, color: m.color })), visits }), [visits, members]);

  return { members, visits, isVisited, visitorsOf, setMemberCountry, toggle,
    resetToSeed, clearAll, importVisits, exportObj };
}

window.useStore = useStore;
