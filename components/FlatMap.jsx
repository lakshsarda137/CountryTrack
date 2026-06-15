/* FlatMap.jsx — Natural Earth map: pan/zoom, blended fills, microstate
   markers, autocomplete search + fly-to focus with border highlight. */
function FlatMap({ store, active, onSelectCountry }) {
  const idx = window.GEO.index;
  const wrapRef = useRef(null);
  const svgRef = useRef(null);
  const gRef = useRef(null);
  const zoomRef = useRef(null);
  const sizeRef = useRef({ w: 1000, h: 520 });
  const [size, setSize] = useState({ w: 1000, h: 520 });
  const [t, setT] = useState({ k: 1, x: 0, y: 0 });
  const [focused, setFocused] = useState(null);
  const [hover, setHover] = useState(null);

  const W = size.w;
  const H = size.h;

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const blockScroll = (e) => { e.preventDefault(); };
    el.addEventListener("touchmove", blockScroll, { passive: false });
    return () => el.removeEventListener("touchmove", blockScroll);
  }, []);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const sync = () => {
      const w = Math.max(280, el.clientWidth);
      const h = Math.max(280, el.clientHeight);
      sizeRef.current = { w, h };
      setSize({ w, h });
    };
    sync();
    const ro = new ResizeObserver(sync);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const { paths, graticule, spherePath, projection, geoPath, byName, coverTransform } = useMemo(() => {
    const fc = { type: "FeatureCollection", features: idx.features.filter(f => f.__name !== "Antarctica") };
    const projection = d3.geoNaturalEarth1().fitExtent([[8, 8], [W - 8, H - 8]], fc);
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

    // "Cover" zoom — fill the viewport like Google Maps (crop edges, pan to explore).
    const b = gp.bounds(fc);
    const cw = b[1][0] - b[0][0], ch = b[1][1] - b[0][1];
    const cx = (b[0][0] + b[1][0]) / 2, cy = (b[0][1] + b[1][1]) / 2;
    const coverK = cw > 0 && ch > 0 ? Math.min(3, Math.max(W / cw, H / ch)) : 1;
    const coverTransform = d3.zoomIdentity
      .translate(W / 2 - coverK * cx, H / 2 - coverK * cy)
      .scale(coverK);

    return { paths, graticule: gp(d3.geoGraticule10()), spherePath: gp({ type: "Sphere" }), projection, geoPath: gp, byName, coverTransform };
  }, [idx, W, H]);

  const coverRef = useRef(null);

  useEffect(() => {
    coverRef.current = coverTransform;
  }, [coverTransform]);

  useEffect(() => {
    const svg = svgRef.current;
    const g = gRef.current;
    if (!svg || !g || !coverTransform) return;

    const { w, h } = sizeRef.current;
    const kMin = coverTransform.k;

    const zoom = d3.zoom()
      .scaleExtent([kMin, 14])
      .filter((e) => !e.button)
      .on("zoom", (e) => {
        d3.select(g).attr("transform", e.transform);
        setT({ k: e.transform.k, x: e.transform.x, y: e.transform.y });
      });

    const sel = d3.select(svg);
    sel.call(zoom);
    sel.on("dblclick.zoom", null);
    sel.call(zoom.transform, coverTransform);
    setT({ k: coverTransform.k, x: coverTransform.x, y: coverTransform.y });
    zoomRef.current = zoom;

    return () => sel.on(".zoom", null);
  }, [W, H, coverTransform]);

  const flyTo = (name) => {
    const f = idx.byName.get(window.GEO.norm(name));
    if (!f || !zoomRef.current || !svgRef.current) return;
    const b = geoPath.bounds(f.feature);
    const dx = b[1][0] - b[0][0], dy = b[1][1] - b[0][1];
    const cx = (b[0][0] + b[1][0]) / 2, cy = (b[0][1] + b[1][1]) / 2;
    const k = Math.max(coverTransform.k, Math.min(12, 0.88 / Math.max(dx / W, dy / H || 0.0001)));
    const tx = W / 2 - k * cx, ty = H / 2 - k * cy;
    d3.select(svgRef.current).transition().duration(700)
      .call(zoomRef.current.transform, d3.zoomIdentity.translate(tx, ty).scale(k));
    setFocused(name);
  };

  const resetZoom = () => {
    if (!svgRef.current || !zoomRef.current || !coverRef.current) return;
    d3.select(svgRef.current).transition().duration(500).call(zoomRef.current.transform, coverRef.current);
    setFocused(null);
  };

  const onSelect = (name) => { flyTo(name); onSelectCountry(name); };

  const fillFor = (name) => {
    const vis = store.visitorsOf(name).filter(id => active.has(id));
    if (vis.length === 0) return "oklch(0.27 0.012 60)";
    return window.GEO.blendColors(store.members.filter(m => vis.includes(m.id)).map(m => m.color));
  };

  const markers = paths.filter(p => p.tiny).map(p => {
    const vis = store.visitorsOf(p.name).filter(id => active.has(id));
    return vis.length ? { ...p, fill: window.GEO.blendColors(store.members.filter(m => vis.includes(m.id)).map(m => m.color)) } : null;
  }).filter(Boolean);

  const hoverRec = hover && idx.byName.get(window.GEO.norm(hover.name));
  const hoverVis = hover ? store.visitorsOf(hover.name).filter(id => active.has(id)) : [];
  const focusRec = focused && byName[focused];

  return (
    <div className="map-view">
      <div className="map-wrap" ref={wrapRef} onMouseLeave={() => setHover(null)}>
        <div className="map-search">
          <window.SearchBox store={store} onSelect={onSelect} placeholder="Search countries…" />
        </div>
        {t.k > coverTransform.k * 1.05 && <button className="map-reset ghost-btn" onClick={resetZoom}><window.Icons.reset size={15} /> Reset</button>}

        <svg ref={svgRef} className="map-svg" viewBox={`0 0 ${W} ${H}`} role="img"
             onMouseMove={(e) => setHover(h => h ? { ...h, x: e.clientX, y: e.clientY } : h)}>
          <defs>
            <radialGradient id="oceanGrad" cx="50%" cy="42%" r="75%">
              <stop offset="0%" stopColor="oklch(0.20 0.02 240)" />
              <stop offset="100%" stopColor="oklch(0.145 0.012 250)" />
            </radialGradient>
          </defs>
          <g ref={gRef}>
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

        <div className="map-hint">
          <span><span className="k">drag</span> pan</span>
          <span><span className="k">pinch</span> zoom</span>
          <span><span className="k">tap</span> country</span>
        </div>

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
    </div>
  );
}
window.FlatMap = FlatMap;
