/* FlatMap.jsx — Natural Earth map: pan/zoom, blended fills, microstate
   markers, autocomplete search + fly-to focus with border highlight. */
function FlatMap({ store, active, onSelectCountry }) {
  const idx = window.GEO.index;
  const W = 1000, H = 520;
  const svgRef = useRef(null);
  const zoomRef = useRef(null);
  const [t, setT] = useState({ k: 1, x: 0, y: 0 });
  const [focused, setFocused] = useState(null);
  const [hover, setHover] = useState(null);

  const { paths, graticule, spherePath, projection, geoPath, byName } = useMemo(() => {
    const fc = { type: "FeatureCollection", features: idx.features.filter(f => f.__name !== "Antarctica") };
    const projection = d3.geoNaturalEarth1().fitExtent([[6, 6], [W - 6, H - 6]], fc);
    const gp = d3.geoPath(projection);
    const byName = {};
    const paths = fc.features.map(f => {
      const b = gp.bounds(f);
      const maxDim = Math.max(b[1][0] - b[0][0], b[1][1] - b[0][1]);
      const c = projection(d3.geoCentroid(f)) || [0, 0];
      const rec = { name: f.__name, d: gp(f), cx: c[0], cy: c[1], tiny: maxDim < 5 };
      byName[f.__name] = rec;
      return rec;
    }).filter(p => p.d);
    return { paths, graticule: gp(d3.geoGraticule10()), spherePath: gp({ type: "Sphere" }), projection, geoPath: gp, byName };
  }, [idx]);

  // attach d3 zoom once
  useEffect(() => {
    const sel = d3.select(svgRef.current);
    const zoom = d3.zoom().scaleExtent([1, 12]).translateExtent([[0, 0], [W, H]])
      .filter((e) => !e.button && (e.type !== "wheel" || true))
      .on("zoom", (e) => setT({ k: e.transform.k, x: e.transform.x, y: e.transform.y }));
    sel.call(zoom);
    sel.on("dblclick.zoom", null);
    zoomRef.current = zoom;
    return () => sel.on(".zoom", null);
  }, []);

  const flyTo = (name) => {
    const f = idx.byName.get(window.GEO.norm(name));
    if (!f) return;
    const b = geoPath.bounds(f.feature);
    const dx = b[1][0] - b[0][0], dy = b[1][1] - b[0][1];
    const cx = (b[0][0] + b[1][0]) / 2, cy = (b[0][1] + b[1][1]) / 2;
    const k = Math.max(1, Math.min(10, 0.85 / Math.max(dx / W, dy / H || 0.0001)));
    const tx = W / 2 - k * cx, ty = H / 2 - k * cy;
    d3.select(svgRef.current).transition().duration(700)
      .call(zoomRef.current.transform, d3.zoomIdentity.translate(tx, ty).scale(k));
    setFocused(name);
  };

  const resetZoom = () => {
    d3.select(svgRef.current).transition().duration(500).call(zoomRef.current.transform, d3.zoomIdentity);
    setFocused(null);
  };

  const onSelect = (name) => { flyTo(name); onSelectCountry(name); };

  const fillFor = (name) => {
    const vis = store.visitorsOf(name).filter(id => active.has(id));
    if (vis.length === 0) return "oklch(0.27 0.012 60)";
    return window.GEO.blendColors(store.members.filter(m => vis.includes(m.id)).map(m => m.color));
  };

  // visited markers (always for tiny states; helps see microstates)
  const markers = paths.filter(p => p.tiny).map(p => {
    const vis = store.visitorsOf(p.name).filter(id => active.has(id));
    return vis.length ? { ...p, fill: window.GEO.blendColors(store.members.filter(m => vis.includes(m.id)).map(m => m.color)) } : null;
  }).filter(Boolean);

  const hoverRec = hover && idx.byName.get(window.GEO.norm(hover.name));
  const hoverVis = hover ? store.visitorsOf(hover.name).filter(id => active.has(id)) : [];
  const focusRec = focused && byName[focused];

  return (
    <div className="map-wrap" onMouseLeave={() => setHover(null)}>
      <div className="map-search">
        <window.SearchBox store={store} onSelect={onSelect} placeholder="Search any country (incl. Singapore, Vatican…)" />
      </div>
      {t.k > 1.05 && <button className="map-reset ghost-btn" onClick={resetZoom}><window.Icons.reset size={15} /> Reset view</button>}

      <svg ref={svgRef} className="map-svg" viewBox={`0 0 ${W} ${H}`} role="img"
           onMouseMove={(e) => setHover(h => h ? { ...h, x: e.clientX, y: e.clientY } : h)}>
        <defs>
          <radialGradient id="oceanGrad" cx="50%" cy="42%" r="75%">
            <stop offset="0%" stopColor="oklch(0.20 0.02 240)" />
            <stop offset="100%" stopColor="oklch(0.145 0.012 250)" />
          </radialGradient>
        </defs>
        <g transform={`translate(${t.x},${t.y}) scale(${t.k})`}>
          <path d={spherePath} fill="url(#oceanGrad)" stroke="oklch(0.33 0.02 240)" strokeWidth="0.8" vectorEffect="non-scaling-stroke" />
          <path className="map-graticule" d={graticule} vectorEffect="non-scaling-stroke" />
          {paths.map(p => (
            <path key={p.name} className="country" d={p.d} fill={fillFor(p.name)} vectorEffect="non-scaling-stroke"
              onClick={() => onSelect(p.name)}
              onMouseEnter={(e) => setHover({ name: p.name, x: e.clientX, y: e.clientY })}
            />
          ))}
          {markers.map(m => (
            <circle key={m.name} cx={m.cx} cy={m.cy} r={5 / t.k} fill={m.fill}
              stroke="#fff" strokeOpacity="0.5" strokeWidth={1} vectorEffect="non-scaling-stroke"
              style={{ cursor: "pointer" }} onClick={() => onSelect(m.name)} />
          ))}
          {focusRec && (
            <path className="country-focus" d={focusRec.d} fill="none" stroke="var(--gold)" strokeWidth="2.4" vectorEffect="non-scaling-stroke" pointerEvents="none" />
          )}
          {focusRec && byName[focused].tiny && (
            <circle cx={focusRec.cx} cy={focusRec.cy} r={11 / t.k} fill="none" stroke="var(--gold)" strokeWidth="2" vectorEffect="non-scaling-stroke" pointerEvents="none" />
          )}
        </g>
      </svg>

      {hover && (
        <div className="maptip" style={{ left: Math.min(hover.x + 14, window.innerWidth - 250), top: hover.y + 14 }}>
          <div className="t-name">{hover.name}</div>
          <div className="t-meta">{hoverRec ? `${hoverRec.officialContinent || hoverRec.continent} · ${window.fmt(Math.round(hoverRec.distanceFromHome))} km from Jaipur` : ""}</div>
          {hoverVis.length > 0 ? (
            <div className="t-mem">{store.members.filter(m => hoverVis.includes(m.id)).map(m => <window.Avatar key={m.id} member={m} size="sm" />)}</div>
          ) : <div className="t-meta" style={{ marginTop: 6 }}>Tap to record a visit</div>}
        </div>
      )}
    </div>
  );
}
window.FlatMap = FlatMap;
