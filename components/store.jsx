/* store.jsx — app state: visits per member, cloud + local persistence */
const CT_KEY = "countrytrack.v2";
const API = "/api/visits";

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

function loadLocal() {
  try {
    const raw = localStorage.getItem(CT_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.visits) return { visits: parsed.visits, savedAt: parsed.savedAt || 0, memberSavedAt: parsed.memberSavedAt || {} };
    }
  } catch (e) { console.warn("[store] load failed", e); }
  return { visits: buildSeedVisits(), savedAt: 0 };
}

function useStore() {
  const members = window.CT_DATA.MEMBERS;
  const [visits, setVisits] = useState(null);
  const [ready, setReady] = useState(false);
  const [syncState, setSyncState] = useState("loading"); // loading | synced | saving | offline
  const serverAt = useRef(0);
  const memberSavedAt = useRef({});  // per-member timestamp so server can merge correctly
  const saveTimer = useRef(null);
  const skipSave = useRef(true);

  const applyRemote = useCallback((data) => {
    if (!data?.visits) return false;
    const at = data.savedAt || 0;
    if (at <= serverAt.current) return false;
    serverAt.current = at;
    if (data.memberSavedAt) memberSavedAt.current = { ...memberSavedAt.current, ...data.memberSavedAt };
    skipSave.current = true;
    setVisits(data.visits);
    try { localStorage.setItem(CT_KEY, JSON.stringify({ version: 1, savedAt: at, memberSavedAt: memberSavedAt.current, visits: data.visits })); } catch (e) {}
    return true;
  }, []);

  const pull = useCallback(() => {
    return fetch(API, { cache: "no-store" })
      .then(r => (r.ok ? r.json() : null))
      .then(data => {
        if (data?.visits) {
          applyRemote(data);
          setSyncState("synced");
          return true;
        }
        return false;
      })
      .catch(() => { setSyncState("offline"); return false; });
  }, [applyRemote]);

  useEffect(() => {
    fetch(API, { cache: "no-store" })
      .then(r => (r.ok ? r.json() : null))
      .then(data => {
        const local = loadLocal();
        if (data?.visits && (data.savedAt || 0) >= local.savedAt) {
          serverAt.current = data.savedAt || 0;
          skipSave.current = true;
          setVisits(data.visits);
          setSyncState("synced");
        } else {
          serverAt.current = local.savedAt;
          if (local.memberSavedAt) memberSavedAt.current = local.memberSavedAt;
          skipSave.current = false;
          setVisits(local.visits);
          setSyncState(data?.visits ? "synced" : "offline");
        }
      })
      .catch(() => {
        const local = loadLocal();
        serverAt.current = local.savedAt;
        setVisits(local.visits);
        setSyncState("offline");
      })
      .finally(() => {
        skipSave.current = false;
        setReady(true);
      });
  }, []);

  useEffect(() => {
    if (!ready) return;
    const iv = setInterval(pull, 20000);
    const onVis = () => { if (document.visibilityState === "visible") pull(); };
    document.addEventListener("visibilitychange", onVis);
    return () => { clearInterval(iv); document.removeEventListener("visibilitychange", onVis); };
  }, [ready, pull]);

  useEffect(() => {
    if (!visits || !ready) return;
    try {
      localStorage.setItem(CT_KEY, JSON.stringify({ version: 1, savedAt: Date.now(), memberSavedAt: memberSavedAt.current, visits }));
    } catch (e) { console.warn("[store] local save failed", e); }

    if (skipSave.current) {
      skipSave.current = false;
      return;
    }

    clearTimeout(saveTimer.current);
    setSyncState("saving");
    saveTimer.current = setTimeout(() => {
      const payload = { version: 1, savedAt: Date.now(), memberSavedAt: memberSavedAt.current, visits };
      fetch(API, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
        .then(r => r.json().then(j => ({ ok: r.ok, j })))
        .then(({ ok, j }) => {
          if (ok && j?.savedAt) {
            serverAt.current = j.savedAt;
            setSyncState("synced");
          } else {
            setSyncState("offline");
            if (j?.error) console.warn("[sync]", j.error);
          }
        })
        .catch(() => setSyncState("offline"));
    }, 700);
  }, [visits, ready]);

  const isVisited = useCallback((mid, country) => (visits?.[mid] || []).includes(country), [visits]);

  const visitorsOf = useCallback((country) =>
    members.filter(m => (visits?.[m.id] || []).includes(country)).map(m => m.id), [visits, members]);

  const setMemberCountry = useCallback((mid, country, on) => {
    memberSavedAt.current = { ...memberSavedAt.current, [mid]: Date.now() };
    setVisits(prev => {
      const cur = new Set(prev?.[mid] || []);
      if (on) cur.add(country); else cur.delete(country);
      return { ...prev, [mid]: [...cur] };
    });
  }, []);

  const toggle = useCallback((mid, country) => {
    memberSavedAt.current = { ...memberSavedAt.current, [mid]: Date.now() };
    setVisits(prev => {
      const cur = new Set(prev?.[mid] || []);
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
    members: members.map(m => ({ id: m.id, name: m.name, color: m.color })), visits: visits || {} }), [visits, members]);

  return {
    members, visits: visits || {}, ready, syncState, pull,
    isVisited, visitorsOf, setMemberCountry, toggle,
    resetToSeed, clearAll, importVisits, exportObj,
  };
}

window.useStore = useStore;
