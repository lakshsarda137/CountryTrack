/* Manage.jsx — searchable country list with per-member checkboxes + data tools */
function Manage({ store, active, onToast }) {
  const idx = window.GEO.index;
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("all"); // all | visited | unvisited
  const [continent, setContinent] = useState("All");
  const fileRef = useRef(null);

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
    <div className="view-pad">
      <div className="view-head">
        <div className="eyebrow">Edit · everything lives here</div>
        <h2>Manage trips</h2>
      </div>

      <div className="manage-toolbar">
        <label className="search">
          <window.Icons.search size={18}/>
          <input placeholder="Search countries…" value={q} onChange={(e) => setQ(e.target.value)} />
          {q && <button className="ghost-btn" style={{ padding: "4px 7px" }} onClick={() => setQ("")}><window.Icons.x size={14}/></button>}
        </label>
        <div className="seg">
          {["all", "visited", "unvisited"].map(f => (
            <button key={f} className={filter === f ? "active" : ""} onClick={() => setFilter(f)}>{f[0].toUpperCase() + f.slice(1)}</button>
          ))}
        </div>
        <select className="ghost-btn" value={continent} onChange={(e) => setContinent(e.target.value)} style={{ appearance: "auto" }}>
          {continents.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      <div className="manage-toolbar" style={{ marginTop: -4 }}>
        <button className="ghost-btn" onClick={doExport}><window.Icons.download size={15}/> Export data.json</button>
        <button className="ghost-btn" onClick={() => fileRef.current.click()}><window.Icons.upload size={15}/> Import</button>
        <input ref={fileRef} type="file" accept="application/json" hidden onChange={doImport} />
        <div style={{ flex: 1 }}></div>
        <button className="ghost-btn" onClick={() => { if (confirm("Reset to the sample family data?")) { store.resetToSeed(); onToast("Reset to sample data"); } }}><window.Icons.reset size={15}/> Reset sample</button>
        <button className="ghost-btn" onClick={() => { if (confirm("Clear ALL trips for everyone?")) { store.clearAll(); onToast("Cleared all trips"); } }}>Clear all</button>
      </div>

      <div className="ctable">
        <div className="row head">
          <div className="cname">Country · {rows.length}</div>
          {store.members.map(m => <div key={m.id} className="cmem" title={m.name}>{window.initials(m.name)}</div>)}
        </div>
        <div style={{ maxHeight: "calc(100vh - 360px)", overflowY: "auto" }}>
          {rows.length === 0 && <div className="empty">No countries match.</div>}
          {rows.map(c => {
            const fill = window.GEO.blendColors(store.members.filter(m => store.isVisited(m.id, c.name)).map(m => m.color));
            return (
              <div key={c.name} className="row">
                <div className="cname">
                  <span className="swatch" style={{ background: fill || "var(--surface)" }}></span>
                  <span>{c.name}</span>
                  <span className="cont">{c.continent}{!c.isOfficial && " · terr."}</span>
                </div>
                {store.members.map(m => {
                  const on = store.isVisited(m.id, c.name);
                  return (
                    <div key={m.id} className="cmem">
                      <button className={"cbox" + (on ? " on" : "")} style={on ? { background: m.color } : null}
                        onClick={() => store.setMemberCountry(m.id, c.name, !on)} aria-label={`${m.name} visited ${c.name}`}>
                        <window.Icons.check size={14} sw={3}/>
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
