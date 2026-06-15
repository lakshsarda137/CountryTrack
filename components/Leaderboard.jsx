/* Leaderboard.jsx — friendly family competition */
function Leaderboard({ store, refreshTick }) {
  const idx = window.GEO.index;
  const data = useMemo(() => {
    const recOf = (name) => idx.byName.get(window.GEO.norm(name));
    const per = store.members.map(m => {
      const recs = (store.visits[m.id] || []).map(recOf).filter(r => r && r.isOfficial);
      const continents = new Set(recs.map(r => r.officialContinent));
      const furthest = recs.slice().sort((a, b) => b.distanceFromHome - a.distanceFromHome)[0];
      const age = window.ageYears(m.birth);
      return { m, count: recs.length, continents: continents.size, furthest,
        pop: recs.reduce((a, r) => a + r.pop, 0),
        age, ageInt: age == null ? null : Math.floor(age), pace: age ? recs.length / age : 0 };
    });
    const ranked = per.slice().sort((a, b) => b.count - a.count || b.continents - a.continents);
    const award = (key) => per.slice().sort((a, b) => b[key] - a[key])[0];
    return { ranked,
      awards: [
        { ico: "🌍", title: "Globetrotter", sub: "most countries", win: ranked[0], val: ranked[0] && ranked[0].count + " countries" },
        { ico: "🧭", title: "Continent hopper", sub: "most continents", win: award("continents"), val: award("continents") && award("continents").continents + " continents" },
        { ico: "⚡", title: "Fastest explorer", sub: "countries per year", win: award("pace"), valFn: (p) => `${p.pace.toFixed(2)} / yr · age ${p.ageInt}` },
        { ico: "✈️", title: "Long hauler", sub: "furthest from Jaipur", win: per.slice().sort((a, b) => (b.furthest?.distanceFromHome || 0) - (a.furthest?.distanceFromHome || 0))[0], valFn: (p) => p.furthest ? `${p.furthest.name} · ${window.fmt(Math.round(p.furthest.distanceFromHome))} km` : "—" },
      ] };
  }, [store.visits, idx, refreshTick]);

  const medals = ["🥇", "🥈", "🥉", ""];
  const max = Math.max(1, ...data.ranked.map(r => r.count));

  return (
    <div className="view-pad">
      <div className="view-head">
        <div className="eyebrow">/// friendly competition</div>
        <h2>Leaderboard</h2>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 14, marginBottom: 26 }}>
        {data.awards.map((a, i) => (
          <div className="stat-card" key={i} style={{ display: "flex", gap: 14, alignItems: "center" }}>
            <div style={{ fontSize: 30 }}>{a.ico}</div>
            <div style={{ flex: 1 }}>
              <div className="faint mono" style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: ".08em" }}>{a.title}</div>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 700, color: a.win ? a.win.m.color : "var(--text)" }}>{a.win ? a.win.m.name : "—"}</div>
              <div className="muted" style={{ fontSize: 12.5 }}>{a.valFn ? (a.win ? a.valFn(a.win) : "—") : a.val}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="lb">
        {data.ranked.map((r, i) => (
          <div className={"lb-row" + (i === 0 ? " r1" : "")} key={r.m.id}>
            <div className="glow" style={{ background: `linear-gradient(90deg, ${r.m.color}, transparent 60%)` }}></div>
            <div className="rank">{i + 1}</div>
            <span className="medal">{medals[i]}</span>
            <window.Avatar member={r.m} size="lg"/>
            <div className="who">
              <div className="nm">{r.m.name}{r.ageInt != null && <span className="faint" style={{ fontSize: 13, fontWeight: 500, fontFamily: "var(--font-body)" }}> · age {r.ageInt}</span>}</div>
              <div className="meta">{r.continents} continents · {r.pace.toFixed(2)}/yr · reached {window.fmt(Math.round(r.pop / 1e6))}M people{r.furthest ? ` · as far as ${r.furthest.name}` : ""}</div>
              <div style={{ marginTop: 8, height: 6, borderRadius: 999, background: "var(--bg)", overflow: "hidden", maxWidth: 360 }}>
                <div style={{ height: "100%", width: (r.count / max * 100) + "%", background: r.m.color, boxShadow: `0 0 12px -2px ${r.m.color}` }}></div>
              </div>
            </div>
            <div className="score">
              <div className="n" style={{ color: r.m.color }}>{r.count}</div>
              <div className="l">countries</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
window.Leaderboard = Leaderboard;
