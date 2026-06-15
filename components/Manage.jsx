/* Manage.jsx — searchable country list with per-member checkboxes + data tools */
function Manage({ store, active, onToast }) {
  const idx = window.GEO.index;
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("all");
  const [continent, setContinent] = useState("All");
  const fileRef = useRef(null);
  const isHome = (name) => window.GEO.norm(name) === window.GEO.norm(window.CT_DATA.HOME_COUNTRY);

  const continents = useMemo(() => {
    const s = new Set(idx.countries.filter(c => c.isCountry).map(c => c.continent));
    return ["All", ...[...s].sort()];
  }, [idx]);

  const rows = useMemo(() => {
    const nq = window.GEO.norm(q);
    return idx.countries.filter(c => {
      if (!c.isCountry) return false;
      if (continent !== "All" && c.continent !== continent) return false;
      if (nq && !window.GEO.norm(c.name).includes(nq)) return false;
      const vis = store.visitorsOf(c.name);
      if (filter === "visited" && vis.length === 0) return false;
      if (filter === "unvisited" && vis.length > 0) return false;
      return true;
    });
  }, [q, filter, continent, idx, store.visits]);

  const doExport = () => {
    const blob = new Blob([JSON.stringify(store.exportObj(), null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "data.json"; a.click();
    URL.revokeObjectURL(url);
    onToast("Exported data.json");
  };
  const doImport = (e) => {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try { const obj = JSON.parse(reader.result); store.importVisits(obj) ? onToast("Imported travel data") : onToast("Could not read that file"); }
      catch (err) { onToast("Invalid JSON file"); }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  return (
    <div className="view-pad view-pad-manage">
      <div className="view-head">
        <div className="eyebrow">Edit · everything lives here</div>
        <h2>Manage trips</h2>
      </div>

      <div className="manage-controls">
        <label className="search manage-search">
          <window.Icons.search size={18}/>
          <input placeholder="Search…" value={q} onChange={(e) => setQ(e.target.value)} />
          {q && <button type="button" className="search-clear" onClick={() => setQ("")} aria-label="Clear search"><window.Icons.x size={14}/></button>}
        </label>

        <div className="manage-bar">
          <div className="seg manage-seg">
            {["all", "visited", "unvisited"].map(f => (
              <button key={f} type="button" className={filter === f ? "active" : ""} onClick={() => setFilter(f)}>
                {f === "all" ? "All" : f === "visited" ? "Visited" : "New"}
              </button>
            ))}
          </div>
          <select className="manage-select" value={continent} onChange={(e) => setContinent(e.target.value)}>
            {continents.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        <div className="manage-actions">
          <button type="button" className="ghost-btn" onClick={doExport} title="Export data.json">
            <window.Icons.download size={15}/><span className="act-label">Export</span>
          </button>
          <button type="button" className="ghost-btn" onClick={() => fileRef.current.click()} title="Import data.json">
            <window.Icons.upload size={15}/><span className="act-label">Import</span>
          </button>
          <input ref={fileRef} type="file" accept="application/json" hidden onChange={doImport} />
          <button type="button" className="ghost-btn" onClick={() => { if (confirm("Reset to the sample family data?")) { store.resetToSeed(); onToast("Reset to sample data"); } }} title="Reset sample data">
            <window.Icons.reset size={15}/><span className="act-label">Reset</span>
          </button>
          <button type="button" className="ghost-btn" onClick={() => { if (confirm("Clear ALL trips for everyone?")) { store.clearAll(); onToast("Cleared all trips"); } }} title="Clear all trips">
            <span className="act-label">Clear</span>
          </button>
        </div>
      </div>

      <div className="ctable">
        <div className="row head">
          <div className="cname">Country · {rows.length}</div>
          {store.members.map(m => <div key={m.id} className="cmem" title={m.name}>{window.initials(m.name)}</div>)}
        </div>
        <div className="ctable-body">
          {rows.length === 0 && <div className="empty">No countries match.</div>}
          {rows.map(c => {
            const home = isHome(c.name);
            const visCount = store.members.filter(m => store.isVisited(m.id, c.name)).length;
            const fill = home
              ? window.GEO.HOME_COLORS.fill
              : (visCount ? window.GEO.visitFill(visCount, c.name) : null);
            return (
              <div key={c.name} className={"row" + (home ? " row-home" : "")}>
                <div className="cname">
                  <span className={"swatch" + (home ? " swatch-home" : "")} style={{ background: fill || "var(--surface)" }}></span>
                  <span className="cname-text">
                    <span className="cname-main">{c.name}</span>
                    {home
                      ? <span className="cont cont-home">Home · {window.CT_DATA.HOME.name}</span>
                      : <span className="cont">{c.continent}{!c.isOfficial && " · terr."}</span>}
                  </span>
                </div>
                {store.members.map(m => {
                  const on = store.isVisited(m.id, c.name);
                  return (
                    <div key={m.id} className="cmem">
                      <button type="button" className={"cbox" + (on ? " on" : "")} style={on ? { background: m.color } : null}
                        onClick={() => store.setMemberCountry(m.id, c.name, !on)} aria-label={`${m.name} visited ${c.name}`}>
                        <span className="cbox-tick">✓</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
window.Manage = Manage;
