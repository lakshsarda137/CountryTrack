/* Shell.jsx — app root: geo loading, nav, member filter, modal, toast */
function App() {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    window.GEO.load().then(() => setReady(true)).catch(e => { console.error(e); setError(e.message); });
  }, []);

  if (error) return (
    <div className="loading"><div style={{ textAlign: "center", maxWidth: 360 }}>
      <div style={{ fontSize: 30 }}>🌐</div>
      <div className="load-note">Couldn't load the world map.<br/><span className="faint" style={{ fontSize: 12 }}>{error}</span><br/>Check your connection and refresh.</div>
    </div></div>
  );
  if (!ready) return (
    <div className="loading"><div style={{ textAlign: "center" }}>
      <div className="spinner"></div>
      <div className="load-note">Charting the planet…</div>
    </div></div>
  );
  return <Main/>;
}

function Main() {
  const store = window.useStore();
  const [view, setView] = useState("globe");
  const [active, setActive] = useState(() => new Set(store.members.map(m => m.id)));
  const [editing, setEditing] = useState(null);
  const [toast, setToast] = useState(null);
  const [refreshTick, setRefreshTick] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const toastTimer = useRef(null);

  const showToast = useCallback((msg) => {
    setToast(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2600);
  }, []);

  const refreshData = useCallback(async () => {
    setRefreshing(true);
    let popMsg = "";
    try {
      const info = await window.POP.refresh();
      popMsg = info ? ` · population ${info.year} (${info.source})` : "";
    } catch (e) {
      console.warn("[refresh] population failed", e);
      popMsg = " · population update unavailable";
    }
    setRefreshTick(t => t + 1);
    setRefreshing(false);
    showToast("Ages refreshed" + popMsg);
  }, [showToast]);

  const toggleActive = (id) => setActive(prev => {
    const n = new Set(prev);
    if (n.has(id)) n.delete(id); else n.add(id);
    if (n.size === 0) return prev; // keep at least one on
    return n;
  });

  const counts = useMemo(() => {
    const o = {}; store.members.forEach(m => o[m.id] = (store.visits[m.id] || []).filter(c => window.GEO.isOfficialName(c)).length); return o;
  }, [store.visits, store.members]);

  const NAV = [
    ["globe", "Globe", "Globe", window.Icons.globe],
    ["map", "Flat map", "Map", window.Icons.map],
    ["stats", "Stats", "Stats", window.Icons.stats],
    ["leaderboard", "Leaderboard", "Board", window.Icons.trophy],
    ["manage", "Manage", "Manage", window.Icons.list],
  ];

  useEffect(() => {
    document.body.classList.toggle("map-active", view === "map");
    return () => document.body.classList.remove("map-active");
  }, [view]);

  return (
    <div className="app">
      <div className="topbar">
        <div className="brand">
          <div className="brand-mark"></div>
          <div>
            <h1>CountryTrack</h1>
            <div className="sub">The family atlas</div>
          </div>
        </div>
        <nav className="nav">
          {NAV.map(([id, label, short, Ico]) => (
            <button key={id} className={view === id ? "active" : ""} onClick={() => setView(id)}>
              <Ico className="nav-ico" size={16}/>
              <span className="nav-label">{label}</span>
              <span className="nav-label-short">{short}</span>
            </button>
          ))}
        </nav>
        <div className="member-bar">
          <button className="ghost-btn refresh-btn" onClick={refreshData} disabled={refreshing} title="Fetch latest population data & refresh everyone's age">
            <span className={refreshing ? "spin-ico" : ""}><window.Icons.reset size={15}/></span>
            {refreshing ? "…" : "Refresh"}
          </button>
          <div className="legend">
            {store.members.map(m => (
              <button key={m.id} className={"legend-chip" + (active.has(m.id) ? "" : " off")} onClick={() => toggleActive(m.id)} title="Show / hide on maps">
                <span className="dot" style={{ background: m.color, color: m.color }}></span>
                {m.name}
                <span className="count">{counts[m.id]}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="view">
        {view === "globe" && <window.GlobeView store={store} active={active} onSelectCountry={setEditing} />}
        {view === "map" && <window.FlatMap store={store} active={active} onSelectCountry={setEditing} />}
        {view === "stats" && <window.Stats store={store} active={active} refreshTick={refreshTick} />}
        {view === "leaderboard" && <window.Leaderboard store={store} refreshTick={refreshTick} />}
        {view === "manage" && <window.Manage store={store} active={active} onToast={showToast} />}
      </div>

      {editing && <window.CountryEditor countryName={editing} store={store} onClose={() => setEditing(null)} />}
      {toast && <div className="toast"><window.Icons.check size={16}/> {toast}</div>}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App/>);
