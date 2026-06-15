/* Globe.jsx — interactive 3D Earth: drag/zoom/click, glowing visited
   countries, search + fly-to focus, and point-markers for microstates. */
function GlobeView({ store, active, onSelectCountry }) {
  const elRef = useRef(null);
  const globeRef = useRef(null);
  const stateRef = useRef({});
  const globeNamesRef = useRef(new Set());
  const idx = window.GEO.index;
  const [gReady, setGReady] = useState(false);
  const [focused, setFocused] = useState(null);

  stateRef.current = { store, active, onSelectCountry, focused };

  const visMembers = (name) => {
    const ids = stateRef.current.store.visitorsOf(name).filter(id => stateRef.current.active.has(id));
    return store.members.filter(m => ids.includes(m.id));
  };

  const visitCount = (name) => visMembers(name).length;

  const capColor = (feat) => {
    const name = feat.__name;
    if (window.GEO.isHomeCountry(name)) return window.GEO.withAlpha(window.GEO.HOME_COLORS.glow, 0.82);
    const n = visitCount(name);
    const glow = window.GEO.visitGlow(n, name);
    const fill = window.GEO.visitFill(n, name);
    if (!fill) return "rgba(120,110,95,0.04)";
    return window.GEO.withAlpha(glow || fill, 0.78);
  };

  const sideColor = (feat) => {
    const name = feat.__name;
    const n = visitCount(name);
    if (!n && !window.GEO.isHomeCountry(name)) return "rgba(0,0,0,0)";
    const glow = window.GEO.visitGlow(n || 1, name);
    return glow ? window.GEO.withAlpha(glow, 0.72) : "rgba(0,0,0,0)";
  };

  const strokeColor = (feat) => {
    const name = feat.__name;
    if (name === stateRef.current.focused) return "rgba(200,220,235,0.5)";
    return "rgba(255,255,255,0.05)";
  };

  const polyAltitude = (feat) => {
    const name = feat.__name;
    const n = visitCount(name);
    const base = 0.009;
    if (!n && !window.GEO.isHomeCountry(name)) return base;
    if (window.GEO.isHomeCountry(name)) return base + 0.0015;
    return base + n * 0.00055;
  };

  const defaultAltitude = () => {
    const el = elRef.current;
    if (!el) return 3.0;
    const aspect = el.clientWidth / Math.max(el.clientHeight, 1);
    if (aspect < 0.62) return 3.45;
    if (aspect < 0.85) return 3.15;
    if (aspect < 1.15) return 2.95;
    return 2.75;
  };

  const polyLabel = (feat) => {
    const name = feat.__name;
    const rec = idx.byName.get(window.GEO.norm(name));
    const mems = visMembers(name);
    const homeTag = window.GEO.isHomeCountry(name) ? `<span style="color:#6EE8A0;font-size:10px;margin-left:6px">HOME</span>` : "";
    const chips = mems.map(m => `<span style="display:inline-block;width:9px;height:9px;border-radius:50%;background:${m.color};margin-right:3px"></span>`).join("");
    return `<div style="font-family:var(--font-body);background:rgba(22,20,17,.95);border:1px solid #4a443a;border-radius:9px;padding:8px 11px;box-shadow:0 10px 30px -10px #000">
      <div style="font-weight:600;font-family:var(--font-display)">${name}${homeTag}</div>
      <div style="color:#8a8275;font-size:11px;margin-top:2px">${rec ? rec.continent : ""}${rec ? " · " + Math.round(rec.distanceFromHome).toLocaleString() + " km" : ""}</div>
      <div style="margin-top:6px;font-size:11px;color:#cfc7b8">${mems.length ? chips + " " + mems.length + " visited" : "Click to add"}</div>
    </div>`;
  };

  const buildPoints = () => {
    const home = window.CT_DATA.HOME;
    const pts = [{ lat: home.lat, lng: home.lng, type: "home", color: window.GEO.HOME_COLORS.glow, r: 0.5 }];
    const seen = new Set();
    store.members.forEach(m => {
      if (!stateRef.current.active.has(m.id)) return;
      (store.visits[m.id] || []).forEach(name => {
        if (seen.has(name) || globeNamesRef.current.has(name)) return;
        seen.add(name);
        const rec = idx.byName.get(window.GEO.norm(name));
        if (!rec) return;
        const n = visitCount(name);
        pts.push({
          lat: rec.lat, lng: rec.lng, type: "mark", name,
          color: window.GEO.visitGlow(n, name) || "#88F0B0", r: 0.38,
        });
      });
    });
    return pts;
  };

  const buildRings = () => {
    const home = window.CT_DATA.HOME;
    const rings = [{ lat: home.lat, lng: home.lng, type: "home" }];
    const f = stateRef.current.focused;
    if (f) { const rec = idx.byName.get(window.GEO.norm(f)); if (rec) rings.push({ lat: rec.lat, lng: rec.lng, type: "focus" }); }
    return rings;
  };

  useEffect(() => {
    const G = window.Globe;
    const g = G()(elRef.current)
      .backgroundColor("rgba(0,0,0,0)")
      .globeImageUrl("https://unpkg.com/three-globe/example/img/earth-dark.jpg")
      .bumpImageUrl("https://unpkg.com/three-globe/example/img/earth-topology.png")
      .showAtmosphere(true).atmosphereColor("#4A90A8").atmosphereAltitude(0.14)
      .polygonsData([]).polygonAltitude(polyAltitude)
      .polygonCapColor(capColor).polygonSideColor(sideColor)
      .polygonStrokeColor(strokeColor).polygonLabel(polyLabel)
      .polygonsTransitionDuration(0)
      .onPolygonClick((feat) => { setFocused(feat.__name); stateRef.current.onSelectCountry(feat.__name); })
      .pointLat("lat").pointLng("lng").pointColor("color").pointAltitude(0.012).pointRadius("r")
      .pointLabel(d => d.type === "home" ? "Home · Jaipur" : (d.name || ""))
      .onPointClick((d) => { if (d.type === "mark") { setFocused(d.name); stateRef.current.onSelectCountry(d.name); } })
      .ringLat("lat").ringLng("lng")
      .ringColor(d => (t) => {
        const c = d.type === "focus" ? "110,232,160" : "90,200,180";
        return `rgba(${c},${(d.type === "focus" ? 0.85 : 0.55) * (1 - t)})`;
      })
      .ringMaxRadius(d => d.type === "focus" ? 4.5 : 3.5).ringPropagationSpeed(2).ringRepeatPeriod(1600);

    globeRef.current = g;
    try { g.renderer().setPixelRatio(Math.min(window.devicePixelRatio || 1, 2)); } catch (e) {}

    window.GEO.loadGlobeFeatures().then((feats) => {
      const usable = feats.filter(f => f.__name !== "Antarctica");
      globeNamesRef.current = new Set(usable.map(f => f.__name));
      if (globeRef.current) { globeRef.current.polygonsData(usable); setGReady(x => !x); }
    });

    g.controls().autoRotate = true; g.controls().autoRotateSpeed = 0.28;
    g.controls().enableDamping = true; g.controls().minDistance = 180; g.controls().maxDistance = 560;
    g.pointOfView({ lat: 12, lng: 65, altitude: defaultAltitude() }, 0);

    const resize = () => {
      if (!elRef.current) return;
      g.width(elRef.current.clientWidth).height(elRef.current.clientHeight);
    };
    resize(); window.addEventListener("resize", resize);
    const dom = elRef.current;
    const stop = () => { g.controls().autoRotate = false; };
    const resume = () => { setTimeout(() => { if (globeRef.current) g.controls().autoRotate = true; }, 3500); };
    dom.addEventListener("pointerdown", stop); dom.addEventListener("pointerup", resume);

    return () => {
      window.removeEventListener("resize", resize);
      dom.removeEventListener("pointerdown", stop); dom.removeEventListener("pointerup", resume);
      try { g._destructor && g._destructor(); } catch (e) {}
    };
  }, []);

  useEffect(() => {
    const g = globeRef.current; if (!g) return;
    g.polygonAltitude(polyAltitude).polygonCapColor(capColor).polygonSideColor(sideColor)
      .polygonStrokeColor(strokeColor).polygonLabel(polyLabel);
    g.pointsData(buildPoints()).ringsData(buildRings());
  }, [store.visits, active, focused, gReady]);

  const focusOn = (name) => {
    const rec = idx.byName.get(window.GEO.norm(name));
    if (!rec || !globeRef.current) return;
    globeRef.current.controls().autoRotate = false;
    globeRef.current.pointOfView({ lat: rec.lat, lng: rec.lng, altitude: 1.7 }, 900);
    setFocused(name);
    onSelectCountry(name);
  };

  const familyCount = useMemo(() => {
    const s = new Set();
    store.members.forEach(m => { if (active.has(m.id)) (store.visits[m.id] || []).forEach(c => { if (window.GEO.isOfficialName(c)) s.add(c); }); });
    return s.size;
  }, [store.visits, active]);

  return (
    <div className="globe-wrap">
      <div ref={elRef} className="globe-canvas"></div>
      <div className="globe-chrome">
        <div className="globe-atlas-wrap">
          <div className="card atlas-card">
            <div className="atlas-label">Family Atlas</div>
            <div className="atlas-count">
              {familyCount}<span className="atlas-total"> / {idx.totalCountries}</span>
            </div>
            <div className="atlas-sub muted">visited</div>
          </div>
        </div>
        <div className="globe-search-wrap">
          <window.SearchBox store={store} onSelect={focusOn} placeholder="Find a country…" />
        </div>
        <div className="globe-legend-wrap">
          <window.MapLegend embedded />
        </div>
        <div className="globe-hint-wrap">
          <div className="globe-hint">
            <span><span className="k">drag</span> spin</span>
            <span><span className="k">scroll</span> zoom</span>
            <span><span className="k">click</span> to edit</span>
          </div>
        </div>
      </div>
    </div>
  );
}
window.GlobeView = GlobeView;
