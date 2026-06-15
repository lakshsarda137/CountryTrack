/* Stats.jsx — "Stats for nerds" dashboard with selectable layouts */
function Stats({ store, active, refreshTick }) {
  const idx = window.GEO.index;
  const [layout, setLayout] = useState(() => localStorage.getItem("ct.statsLayout") || "overview");
  useEffect(() => { localStorage.setItem("ct.statsLayout", layout); }, [layout]);

  const S = useMemo(() => {
    const members = store.members;
    const recOf = (name) => idx.byName.get(window.GEO.norm(name));
    const per = members.map(m => {
      const names = (store.visits[m.id] || []).filter(n => { const r = recOf(n); return r && r.isOfficial; });
      const recs = names.map(recOf);
      const continents = new Set(recs.map(r => r.officialContinent));
      const north = recs.filter(r => r.hemisphereNS === "Northern").length;
      const east = recs.filter(r => r.hemisphereEW === "Eastern").length;
      const tz = new Set(recs.map(r => Math.floor((r.lng + 180) / 15)));
      const pop = recs.reduce((a, r) => a + r.pop, 0);
      const furthest = recs.slice().sort((a, b) => b.distanceFromHome - a.distanceFromHome)[0];
      const age = window.ageYears(m.birth);
      return { m, count: names.length, continents, north, south: recs.length - north,
        east, west: recs.length - east, tz: tz.size, pop, furthest, names: new Set(names),
        age, ageInt: age == null ? null : Math.floor(age), pace: age ? names.length / age : 0 };
    });
    const ranked = per.slice().sort((a, b) => b.count - a.count);

    // family union
    const union = new Map(); // name -> visitor count
    per.forEach(p => p.names.forEach(n => union.set(n, (union.get(n) || 0) + 1)));
    const unionNames = [...union.keys()];
    const unionRecs = unionNames.map(recOf);
    const familyContinents = {};
    window.CONTINENTS.forEach(([c]) => familyContinents[c] = { total: idx.continentTotals[c] || 0, visited: 0 });
    unionRecs.forEach(r => { if (r.isOfficial && familyContinents[r.officialContinent]) familyContinents[r.officialContinent].visited++; });
    const familyPop = unionRecs.reduce((a, r) => a + r.pop, 0);
    const familyFurthest = unionRecs.slice().sort((a, b) => b.distanceFromHome - a.distanceFromHome)[0];
    const allFour = unionNames.filter(n => union.get(n) === members.length);
    const soloOnly = unionNames.filter(n => union.get(n) === 1);
    // territories (visited but not one of the official 195)
    const allVisited = new Set();
    members.forEach(m => (store.visits[m.id] || []).forEach(n => allVisited.add(n)));
    const territoryCount = [...allVisited].filter(n => { const r = recOf(n); return r && !r.isOfficial; }).length;

    // overlap pairs
    const pairs = [];
    for (let i = 0; i < members.length; i++) for (let j = i + 1; j < members.length; j++) {
      const a = per[i], b = per[j];
      const shared = [...a.names].filter(n => b.names.has(n)).length;
      pairs.push({ a: a.m, b: b.m, shared });
    }
    pairs.sort((x, y) => y.shared - x.shared);

    return { per, ranked, union, unionNames, familyContinents, familyPop, familyFurthest,
      allFour, soloOnly, pairs, total: idx.totalCountries, unionCount: unionNames.length, territoryCount,
      popYear: (window.POP.info() && window.POP.info().year) || null };
  }, [store.visits, idx, refreshTick]);

  const conic = (parts) => {
    const total = parts.reduce((a, p) => a + p.v, 0) || 1;
    let acc = 0; const stops = [];
    parts.forEach(p => { const a = acc / total * 360, b = (acc + p.v) / total * 360; stops.push(`${p.c} ${a}deg ${b}deg`); acc += p.v; });
    return `conic-gradient(${stops.join(",")})`;
  };

  // ---------- building blocks ----------
  const RaceBars = ({ title = "Countries visited" }) => {
    const max = Math.max(1, ...S.per.map(p => p.count));
    return (
      <div className="stat-card span2">
        <h4>{title}</h4>
        <div style={{ marginTop: 14 }}>
          {S.ranked.map(p => (
            <div className="bar-row" key={p.m.id}>
              <div className="bl"><window.Avatar member={p.m} size="sm"/>{p.m.name}</div>
              <div className="bar-track"><div className="bar-fill" style={{ width: (p.count / max * 100) + "%", background: p.m.color, boxShadow: `0 0 14px -2px ${p.m.color}` }}></div></div>
              <div className="bv">{p.count}</div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const PaceBars = () => {
    const ranked = S.per.slice().sort((a, b) => b.pace - a.pace);
    const max = Math.max(0.01, ...ranked.map(p => p.pace));
    return (
      <div className="stat-card span2">
        <h4>Countries per year of life</h4>
        <div style={{ marginTop: 14 }}>
          {ranked.map(p => (
            <div key={p.m.id} className="pace-row">
              <div className="pace-label">
                <window.Avatar member={p.m} size="sm"/>{p.m.name}
              </div>
              <div className="bar-track"><div className="bar-fill" style={{ width: (p.pace / max * 100) + "%", background: p.m.color, boxShadow: `0 0 14px -2px ${p.m.color}` }}></div></div>
              <div className="pace-val">
                <div><span style={{ fontWeight: 600 }}>{p.pace.toFixed(2)}</span><span className="faint">/yr</span></div>
                <div className="faint" style={{ fontSize: 11 }}>age {p.ageInt}</div>
              </div>
            </div>
          ))}
        </div>
        <div className="faint" style={{ fontSize: 11.5, marginTop: 6 }}>countries visited ÷ age — a lifetime travel pace</div>
      </div>
    );
  };

  const FamilyDonut = () => {
    const parts = window.CONTINENTS.filter(([c]) => S.familyContinents[c] && S.familyContinents[c].visited > 0)
      .map(([c, col]) => ({ c: col, name: c, v: S.familyContinents[c].visited }));
    return (
      <div className="stat-card">
        <h4>Where they've been</h4>
        <div style={{ display: "flex", gap: 18, alignItems: "center", marginTop: 14, flexWrap: "wrap" }}>
          <div className="donut-ring" style={{ background: conic(parts) }}>
            <div style={{ position: "absolute", inset: 26, borderRadius: "50%", background: "var(--panel)", display: "grid", placeItems: "center" }}>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 700 }}>{S.unionCount}</div>
                <div className="faint" style={{ fontSize: 10 }}>countries</div>
              </div>
            </div>
          </div>
          <div className="donut-legend" style={{ flex: 1 }}>
            {parts.map(p => <div className="li" key={p.name}><span className="d" style={{ background: p.c }}></span>{p.name}<span className="v">{p.v}</span></div>)}
          </div>
        </div>
      </div>
    );
  };

  const ContinentGrid = () => (
    <div className="stat-card span2">
      <h4>Continent coverage</h4>
      <div className="cont-grid" style={{ marginTop: 14 }}>
        {window.CONTINENTS.filter(([c]) => c !== "Antarctica").map(([c, col]) => {
          const fc = S.familyContinents[c] || { total: 0, visited: 0 };
          const pct = fc.total ? Math.round(fc.visited / fc.total * 100) : 0;
          return (
            <div className="cont-cell" key={c}>
              <div className="cn">{c}</div>
              <div className="cc">{fc.visited}/{fc.total} · {pct}%</div>
              <div className="pips"><div className="pip" style={{ background: `linear-gradient(90deg, ${col} ${pct}%, var(--surface) ${pct}%)` }}></div></div>
            </div>
          );
        })}
      </div>
    </div>
  );

  const HemisphereCard = () => (
    <div className="stat-card">
      <h4>Hemisphere spread</h4>
      <div style={{ marginTop: 12 }}>
        {S.ranked.map(p => {
          const tot = p.count || 1;
          return (
            <div key={p.m.id} style={{ margin: "12px 0" }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 5 }}>
                <span style={{ fontWeight: 600, display: "flex", gap: 7, alignItems: "center" }}><window.Avatar member={p.m} size="sm"/>{p.m.name}</span>
                <span className="mono faint hemi-meta">N{p.north} · S{p.south} · E{p.east} · W{p.west}</span>
              </div>
              <div style={{ display: "flex", height: 8, borderRadius: 999, overflow: "hidden", background: "var(--bg)" }}>
                <div style={{ width: (p.north / tot * 100) + "%", background: p.m.color }}></div>
                <div style={{ width: (p.south / tot * 100) + "%", background: window.GEO.withAlpha(p.m.color, 0.4) }}></div>
              </div>
            </div>
          );
        })}
        <div className="faint" style={{ fontSize: 11.5, marginTop: 4 }}>Solid = Northern · faded = Southern hemisphere</div>
      </div>
    </div>
  );

  const OverlapCard = () => (
    <div className="stat-card">
      <h4>Travel buddies</h4>
      <div style={{ marginTop: 10 }}>
        {S.pairs.slice(0, 4).map((p, i) => (
          <div className="fact" key={i}>
            <span style={{ display: "flex", gap: 4 }}><window.Avatar member={p.a} size="sm"/><window.Avatar member={p.b} size="sm"/></span>
            <span className="fl">{p.a.name} &amp; {p.b.name}</span>
            <span className="fv">{p.shared}</span>
          </div>
        ))}
      </div>
    </div>
  );

  const FunFacts = () => {
    const f = S.familyFurthest;
    return (
      <div className="stat-card">
        <h4>Stats for nerds</h4>
        <div style={{ marginTop: 6 }}>
          <div className="fact"><span className="fl">Furthest from Jaipur</span><span className="fv">{f ? `${f.name}` : "—"}</span></div>
          {f && <div className="fact"><span className="fl">…that's</span><span className="fv">{window.fmt(Math.round(f.distanceFromHome))} km</span></div>}
          <div className="fact"><span className="fl">Population reached{S.popYear ? ` (${S.popYear})` : ""}</span><span className="fv">{window.fmt(S.familyPop)}</span></div>
          <div className="fact"><span className="fl">World covered</span><span className="fv">{Math.round(S.unionCount / S.total * 100)}%</span></div>
          <div className="fact"><span className="fl">of {S.total} official countries</span><span className="fv">{S.unionCount}</span></div>
          {S.territoryCount > 0 && <div className="fact"><span className="fl">Territories visited (not counted)</span><span className="fv">{S.territoryCount}</span></div>}
          <div className="fact"><span className="fl">Been everywhere (all 4)</span><span className="fv">{S.allFour.length}</span></div>
          <div className="fact"><span className="fl">Solo discoveries</span><span className="fv">{S.soloOnly.length}</span></div>
        </div>
      </div>
    );
  };

  const Highlight = ({ label, value, unit, sub, color }) => (
    <div className="stat-card">
      <h4>{label}</h4>
      <div className="big" style={color ? { color } : null}>{value}{unit && <small> {unit}</small>}</div>
      {sub && <div className="sub">{sub}</div>}
    </div>
  );

  const leader = S.ranked[0];
  const highlights = (
    <>
      <Highlight label="Family total" value={S.unionCount} unit={`/ ${S.total}`} sub={`${Math.round(S.unionCount / S.total * 100)}% of the world's countries`} color="var(--gold)"/>
      <Highlight label="Leader" value={leader ? leader.m.name : "—"} sub={leader ? `${leader.count} countries visited` : ""} color={leader ? leader.m.color : null}/>
      <Highlight label="Continents touched" value={Object.values(S.familyContinents).filter(c => c.visited > 0).length} unit="/ 6"/>
      <Highlight label="Population reached" value={window.fmt(Math.round(S.familyPop / 1e6)) + "M"} sub={S.popYear ? `as of ${S.popYear} · World Bank` : "across every country visited"}/>
    </>
  );

  return (
    <div className="view-pad">
      <div className="view-head">
        <div className="eyebrow">/// stats for nerds</div>
        <h2>The numbers</h2>
      </div>

      <div className="stats-controls">
        <span className="faint mono" style={{ fontSize: 12 }}>LAYOUT</span>
        <div className="seg">
          {[["overview", "Overview"], ["charts", "Charts-first"], ["compact", "Compact"]].map(([k, l]) => (
            <button key={k} className={layout === k ? "active" : ""} onClick={() => setLayout(k)}>{l}</button>
          ))}
        </div>
      </div>

      {layout === "overview" && (
        <div className="grid stats-grid stats-grid-4">
          {highlights}
          <RaceBars/>
          <PaceBars/>
          <FamilyDonut/>
          <ContinentGrid/>
          <HemisphereCard/>
          <OverlapCard/>
          <FunFacts/>
        </div>
      )}

      {layout === "charts" && (
        <div className="grid stats-grid stats-grid-4">
          <RaceBars title="Who's visited the most"/>
          <PaceBars/>
          <FamilyDonut/>
          <ContinentGrid/>
          <div className="stat-card span2"><HemisphereInline S={S}/></div>
          <FamilyDonut/>
          <Highlight label="World covered" value={Math.round(S.unionCount / S.total * 100)} unit="%" color="var(--gold)" sub={`${S.unionCount} of ${S.total} countries`}/>
          <Highlight label="Most-overlapping pair" value={S.pairs[0] ? `${S.pairs[0].shared}` : "0"} sub={S.pairs[0] ? `${S.pairs[0].a.name} & ${S.pairs[0].b.name}` : ""}/>
        </div>
      )}

      {layout === "compact" && (
        <div className="grid stats-grid stats-grid-3">
          {highlights}
          <RaceBars/>
          <PaceBars/>
          <HemisphereCard/>
          <OverlapCard/>
          <FunFacts/>
          <FamilyDonut/>
        </div>
      )}
    </div>
  );
}

function HemisphereInline({ S }) {
  const fam = S.per.reduce((a, p) => ({ n: a.n + p.north, s: a.s + p.south, e: a.e + p.east, w: a.w + p.west }), { n: 0, s: 0, e: 0, w: 0 });
  const cells = [["Northern", fam.n, "#E3B23C"], ["Southern", fam.s, "#7C7CF0"], ["Eastern", fam.e, "#43B98D"], ["Western", fam.w, "#E8765A"]];
  const max = Math.max(1, ...cells.map(c => c[1]));
  return (
    <div>
      <h4>Hemisphere footprint (family)</h4>
      <div className="hemi-bars">
        {cells.map(([l, v, c]) => (
          <div key={l} style={{ textAlign: "center" }}>
            <div style={{ height: 90, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
              <div style={{ width: 38, height: (v / max * 86) + "%", minHeight: 6, background: c, borderRadius: "6px 6px 0 0", boxShadow: `0 0 16px -3px ${c}` }}></div>
            </div>
            <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 20, marginTop: 6 }}>{v}</div>
            <div className="faint" style={{ fontSize: 12 }}>{l}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
window.Stats = Stats;
window.HemisphereInline = HemisphereInline;
