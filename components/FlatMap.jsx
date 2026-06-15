/* FlatMap.jsx — full-screen flat map: pan/zoom inside a fixed viewport. */
function FlatMap({ store, active, onSelectCountry }) {
  const idx = window.GEO.index;
  const wrapRef = useRef(null);
  const svgRef = useRef(null);
  const gRef = useRef(null);
  const zoomRef = useRef(null);
  const [size, setSize] = useState({ w: 390, h: 600 });
  const [t, setT] = useState({ k: 1, x: 0, y: 0 });
  const [focused, setFocused] = useState(null);
  const [hover, setHover] = useState(null);

  const W = size.w;
  const H = size.h;

  const clampTransform = (transform, w, h, bounds, kMin) => {
    const [[x0, y0], [x1, y1]] = bounds;
    const k = Math.max(kMin, Math.min(14, transform.k));
    const x = Math.min(-k * x0, Math.max(w - k * x1, transform.x));
    const y = Math.min(-k * y0, Math.max(h - k * y1, transform.y));
    return d3.zoomIdentity.translate(x, y).scale(k);
  };

  const measure = () => {
    const view = wrapRef.current?.parentElement;
    const topbar = document.querySelector(".topbar");
    const w = Math.max(280, view?.clientWidth || window.innerWidth);
    const tbH = topbar?.getBoundingClientRect().height || 0;
    const h = Math.max(280, view?.clientHeight || window.innerHeight - tbH);
    return { w, h };
  };

  useEffect(() => {
    const sync = () => {
      const { w, h } = measure();
      setSize({ w, h });
    };
    sync();
    const ro = new ResizeObserver(sync);
    const view = wrapRef.current?.parentElement;
    if (view) ro.observe(view);
    window.addEventListener("resize", sync);
    window.visualViewport?.addEventListener("resize", sync);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", sync);
      window.visualViewport?.removeEventListener("resize", sync);
    };
  }, []);

  const { paths, graticule, spherePath, geoPath, byName, coverTransform, mapBounds } = useMemo(() => {
    const fc = { type: "FeatureCollection", features: idx.features.filter(f => f.__name !== "Antarctica") };
    const projection = d3.geoNaturalEarth1().fitExtent([[8, 8], [W - 8, H - 8]], fc);
    const gp = d3.geoPath(projection);
    const sphere = { type: "Sphere" };
    const bounds = gp.bounds(sphere);
    const byName = {};
    const measureEl = typeof document !== "undefined"
      ? document.createElementNS("http://www.w3.org/2000/svg", "path") : null;
    const paths = fc.features.map(f => {
      const b = gp.bounds(f);
      const maxDim = Math.max(b[1][0] - b[0][0], b[1][1] - b[0][1]);
      const c = projection(d3.geoCentroid(f)) || [0, 0];
      const d = gp(f);
      let pathLen = 200;
      if (measureEl && d) {
        measureEl.setAttribute("d", d);
        pathLen = measureEl.getTotalLength() || 200;
      }
      const rec = { name: f.__name, d, cx: c[0], cy: c[1], tiny: maxDim < 5, pathLen };
      byName[f.__name] = rec;
      return rec;
    }).filter(p => p.d);

    const [[x0, y0], [x1, y1]] = bounds;
    const cw = x1 - x0, ch = y1 - y0;
    const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
    const coverK = cw > 0 && ch > 0 ? Math.max(W / cw, H / ch) : 1;
    const coverTransform = d3.zoomIdentity
      .translate(W / 2 - coverK * cx, H / 2 - coverK * cy)
      .scale(coverK);

    return {
      paths,
      graticule: gp(d3.geoGraticule10()),
      spherePath: gp(sphere),
      geoPath: gp,
      byName,
      coverTransform,
      mapBounds: bounds,
    };
  }, [idx, W, H]);

  useEffect(() => {
    const svg = svgRef.current;
    const g = gRef.current;
    if (!svg || !g) return;

    const kMin = coverTransform.k;
    const bounds = mapBounds;

    const zoom = d3.zoom()
      .scaleExtent([kMin, 14])
      .filter((e) => !e.button)
      .constrain((transform) => clampTransform(transform, W, H, bounds, kMin))
      .on("zoom", (e) => {
        d3.select(g).attr("transform", e.transform);
        setT({ k: e.transform.k, x: e.transform.x, y: e.transform.y });
      });

    const sel = d3.select(svg);
    sel.call(zoom);
    sel.on("dblclick.zoom", null);
    const start = clampTransform(coverTransform, W, H, bounds, kMin);
    sel.call(zoom.transform, start);
    setT({ k: start.k, x: start.x, y: start.y });
    zoomRef.current = zoom;

    return () => sel.on(".zoom", null);
  }, [W, H, coverTransform, mapBounds]);

  const flyTo = (name) => {
    const f = idx.byName.get(window.GEO.norm(name));
    if (!f || !zoomRef.current || !svgRef.current) return;
    const b = geoPath.bounds(f.feature);
    const dx = b[1][0] - b[0][0], dy = b[1][1] - b[0][1];
    const cx = (b[0][0] + b[1][0]) / 2, cy = (b[0][1] + b[1][1]) / 2;
    const k = Math.max(coverTransform.k, Math.min(12, 0.88 / Math.max(dx / W, dy / H || 0.0001)));
    const tx = W / 2 - k * cx, ty = H / 2 - k * cy;
    d3.select(svgRef.current).transition().duration(700)
      .call(zoomRef.current.transform, clampTransform(
        d3.zoomIdentity.translate(tx, ty).scale(k), W, H, mapBounds, coverTransform.k
      ));
    setFocused(name);
  };

  const resetZoom = () => {
    if (!svgRef.current || !zoomRef.current) return;
    d3.select(svgRef.current).transition().duration(500)
      .call(zoomRef.current.transform, clampTransform(coverTransform, W, H, mapBounds, coverTransform.k));
    setFocused(null);
  };

  const onSelect = (name) => { flyTo(name); onSelectCountry(name); };

  const visMembersOf = (name) => {
    const ids = store.visitorsOf(name).filter(id => active.has(id));
    return store.members.filter(m => ids.includes(m.id));
  };

  const styleFor = (name) => {
    if (window.GEO.isHomeCountry(name)) {
      return {
        fill: window.GEO.HOME_COLORS.fill,
        glow: window.GEO.HOME_COLORS.glow,
        stroke: window.GEO.HOME_COLORS.stroke,
        mems: visMembersOf(name),
        home: true,
      };
    }
    const mems = visMembersOf(name);
    const n = mems.length;
    if (!n) return { fill: "oklch(0.27 0.012 60)", glow: null, mems: [], home: false };
    return {
      fill: window.GEO.visitFill(n, name),
      glow: window.GEO.visitGlow(n, name),
      mems,
      home: false,
    };
  };

  const markers = paths.filter(p => p.tiny).map(p => {
    const mems = visMembersOf(p.name);
    if (!mems.length && !window.GEO.isHomeCountry(p.name)) return null;
    const n = mems.length || 1;
    return {
      ...p,
      fill: window.GEO.isHomeCountry(p.name) ? window.GEO.HOME_COLORS.fill : window.GEO.visitFill(n, p.name),
      stroke: window.GEO.isHomeCountry(p.name) ? window.GEO.HOME_COLORS.stroke : (mems[0]?.color || window.GEO.visitGlow(n, p.name)),
    };
  }).filter(Boolean);

  const hoverRec = hover && idx.byName.get(window.GEO.norm(hover.name));
  const hoverVis = hover ? store.visitorsOf(hover.name).filter(id => active.has(id)) : [];
  const focusRec = focused && byName[focused];

  return (
    <div className="map-view" ref={wrapRef}>
      <window.MapLegend members={store.members} />
      <div className="map-search">
        <window.SearchBox store={store} onSelect={onSelect} placeholder="Search countries…" />
      </div>
      {t.k > coverTransform.k * 1.05 && (
        <button className="map-reset ghost-btn" onClick={resetZoom}><window.Icons.reset size={15} /> Reset</button>
      )}

      <svg ref={svgRef} className="map-svg" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice" role="img"
           onMouseMove={(e) => setHover(h => h ? { ...h, x: e.clientX, y: e.clientY } : h)}>
        <rect className="map-ocean-bg" width={W} height={H} />
        <defs>
          <radialGradient id="oceanGrad" cx="50%" cy="42%" r="75%">
            <stop offset="0%" stopColor="oklch(0.20 0.02 240)" />
            <stop offset="100%" stopColor="oklch(0.145 0.012 250)" />
          </radialGradient>
        </defs>
        <g ref={gRef}>
          <path d={spherePath} fill="url(#oceanGrad)" stroke="oklch(0.33 0.02 240)" strokeWidth="0.8" vectorEffect="non-scaling-stroke" />
          <path className="map-graticule" d={graticule} vectorEffect="non-scaling-stroke" />
          {paths.map(p => {
            const st = styleFor(p.name);
            const n = st.mems.length;
            const borderW = 2.2 / t.k;
            return (
              <g key={p.name} className="country-group">
                <path className="country country-fill" d={p.d} fill={st.fill} vectorEffect="non-scaling-stroke"
                  style={st.glow ? { filter: `drop-shadow(0 0 ${2 + (n || 1) * 1.2}px ${st.glow})` } : undefined}
                  onClick={() => onSelect(p.name)}
                  onMouseEnter={(e) => setHover({ name: p.name, x: e.clientX, y: e.clientY })}
                />
                {st.home && (
                  <path className="country-stroke country-stroke-home" d={p.d} fill="none"
                    stroke={st.stroke} strokeWidth={borderW * 1.3} vectorEffect="non-scaling-stroke" pointerEvents="none" />
                )}
                {!st.home && n === 1 && (
                  <path className="country-stroke" d={p.d} fill="none" stroke={st.mems[0].color}
                    strokeWidth={borderW} vectorEffect="non-scaling-stroke" pointerEvents="none" />
                )}
                {!st.home && n > 1 && st.mems.map((m, i, arr) => {
                  const seg = p.pathLen / arr.length;
                  return (
                    <path key={m.id} className="country-stroke" d={p.d} fill="none" stroke={m.color}
                      strokeWidth={borderW} strokeDasharray={`${seg} ${p.pathLen - seg}`}
                      strokeDashoffset={-i * seg} vectorEffect="non-scaling-stroke" pointerEvents="none" />
                  );
                })}
              </g>
            );
          })}
          {markers.map(m => (
            <circle key={m.name} cx={m.cx} cy={m.cy} r={5 / t.k} fill={m.fill}
              stroke={m.stroke || "#fff"} strokeOpacity="0.7" strokeWidth={1.2} vectorEffect="non-scaling-stroke"
              style={{ cursor: "pointer", filter: m.fill ? `drop-shadow(0 0 4px ${m.fill})` : undefined }}
              onClick={() => onSelect(m.name)} />
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
  );
}
window.FlatMap = FlatMap;
