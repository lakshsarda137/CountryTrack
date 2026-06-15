/* CountryEditor.jsx — popover to toggle which members have visited a country */
function CountryEditor({ countryName, store, onClose }) {
  const idx = window.GEO.index;
  const rec = idx && idx.byName.get(window.GEO.norm(countryName));
  const visitors = store.visitorsOf(countryName);

  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const blended = window.GEO.blendColors(
    store.members.filter(m => visitors.includes(m.id)).map(m => m.color)
  );

  return (
    <div className="modal-scrim" onClick={onClose}>
      <div className="editor" onClick={(e) => e.stopPropagation()}>
        <div className="editor-head">
          <div className="flag" style={{ background: blended ? window.GEO.withAlpha(blended, 0.22) : "var(--bg)", color: blended || "var(--muted)", borderColor: blended ? blended : "var(--border)" }}>
            {rec ? (rec.iso || window.initials(countryName)) : "??"}
          </div>
          <div style={{ flex: 1 }}>
            <h3>{countryName}</h3>
            <div className="meta">
              {rec ? <>{rec.continent} · {rec.hemisphereNS}/{rec.hemisphereEW} · {window.fmt(Math.round(rec.distanceFromHome))} km from Jaipur{!rec.isOfficial && " · territory"}</> : "Tap a member to record this trip"}
            </div>
          </div>
          <button className="ghost-btn" style={{ padding: "6px 8px" }} onClick={onClose} aria-label="Close"><window.Icons.x size={16}/></button>
        </div>
        <div className="editor-body">
          {store.members.map(m => {
            const on = store.isVisited(m.id, countryName);
            return (
              <div key={m.id} className={"mem-row" + (on ? " on" : "")} onClick={() => store.toggle(m.id, countryName)}>
                <window.Avatar member={m} />
                <span className="nm">{m.name}</span>
                <span className="muted" style={{ fontSize: 12.5 }}>{on ? "Visited" : "Not yet"}</span>
                <div className="toggle" style={on ? { background: m.color } : null}></div>
              </div>
            );
          })}
        </div>
        <div className="editor-foot">
          <span className="faint" style={{ fontSize: 12.5 }}>{visitors.length} of {store.members.length} have been here</span>
          <button className="ghost-btn gold" onClick={onClose}>Done</button>
        </div>
      </div>
    </div>
  );
}
window.CountryEditor = CountryEditor;
