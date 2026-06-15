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

  const visIds = (name) => stateRef.current.store.visitorsOf(name).filter(id => stateRef.current.active.has(id));
  const blendOf = (name) => {
    const v = visIds(name);
    return v.length ? window.GEO.blendColors(store.members.filter(m => v.includes(m.id)).map(m => m.color)) : null;
  };

  const capColor = (feat) => { const b = blendOf(feat.__name); return b ? window.GEO.withAlpha(b, 0.92) : "rgba(120,110,95,0.04)"; };
  const sideColor = (feat) => { const b = blendOf(feat.__name); return b ? window.GEO.withAlpha(b, 0.25) : "rgba(0,0,0,0)"; };
  const strokeColor = (feat) => (feat.__name === stateRef.current.focused ? "#FFE08A" : "rgba(255,255,255,0.10)");
  const polyLabel = (feat) => {
    const name = feat.__name;
    const rec = idx.byName.get(window.GEO.norm(name));
    const v = visIds(name);
    const chips = store.members.filter(m => v.includes(m.id))
      .map(m => `<span style="display:inline-block;width:9px;height:9px;border-radius:50%;background:${m.color};margin-right:3px"></span>`).join("");
    return `<div style="font-family:var(--font-body);background:rgba(22,20,17,.95);border:1px solid #4a443a;border-radius:9px;padding:8px 11px;box-shadow:0 10px 30px -10px #000">
      <div style="font-weight:600;font-family:var(--font-display)">${name}</div>
      <div style="color:#8a8275;font-size:11px;margin-top:2px">${rec ? rec.continent : ""}${rec ? " · " + Math.round(rec.distanceFromHome).toLocaleString() + " km" : ""}</div>
      <div style="margin-top:6px;font-size:11px;color:#cfc7b8">${v.length ? chips + " " + v.length + " visited" : "Click to add"}</div>
    </div>`;
  };

  // microstate markers: visited countries NOT present in the light globe geometry
  const buildPoints = () => {
    const home = window.CT_DATA.HOME;
    const pts = [{ lat: home.lat, lng: home.lng, type: "home", color: "#FFE08A", r: 0.55 }];
    const seen = new Set();
    store.members.forEach(m => {
      if (!stateRef.current.active.has(m.id)) return;
      (store.visits[m.id] || []).forEach(name => {
        if (seen.has(name) || globeNamesRef.current.has(name)) return;
        seen.add(name);
        const rec = idx.byName.get(window.GEO.norm(name));
        if (!rec) return;
        pts.push({ lat: rec.lat, lng: rec.lng, type: "mark", name, color: blendOf(name) || "#E3B23C", r: 0.42 });
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
      .showAtmosphere(true).atmosphereColor("#E3B23C").atmosphereAltitude(0.18)
      .polygonsData([]).polygonAltitude(0.012)
      .polygonCapColor(capColor).polygonSideColor(sideColor)
      .polygonStrokeColor(strokeColor).polygonLabel(polyLabel)
      .polygonsTransitionDuration(0)
      .onPolygonClick((feat) => { setFocused(feat.__name); stateRef.current.onSelectCountry(feat.__name); })
      .pointLat("lat").pointLng("lng").pointColor("color").pointAltitude(0.015).pointRadius("r")
      .pointLabel(d => d.type === "home" ? "Home · Jaipur" : (d.name || ""))
      .onPointClick((d) => { if (d.type === "mark") { setFocused(d.name); stateRef.current.onSelectCountry(d.name); } })
      .ringLat("lat").ringLng("lng")
      .ringColor(d => (t) => d.type === "focus" ? `rgba(255,224,138,${1 - t})` : `rgba(255,224,138,${0.7 * (1 - t)})`)
      .ringMaxRadius(d => d.type === "focus" ? 5 : 4).ringPropagationSpeed(2.2).ringRepeatPeriod(1400);

    globeRef.current = g;
    try { g.renderer().setPixelRatio(Math.min(window.devicePixelRatio || 1, 2)); } catch (e) {}

    window.GEO.loadGlobeFeatures().then((feats) => {
      const usable = feats.filter(f => f.__name !== "Antarctica");
      globeNamesRef.current = new Set(usable.map(f => f.__name));
      if (globeRef.current) { globeRef.current.polygonsData(usable); setGReady(x => !x); }
    });

    g.controls().autoRotate = true; g.controls().autoRotateSpeed = 0.32;
    g.controls().enableDamping = true; g.controls().minDistance = 130; g.controls().maxDistance = 520;
    g.pointOfView({ lat: 20, lng: 72, altitude: 2.3 }, 0);

    const resize = () => { if (elRef.current) g.width(elRef.current.clientWidth).height(elRef.current.clientHeight); };
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

  // refresh data-driven accessors + markers
  useEffect(() => {
    const g = globeRef.current; if (!g) return;
    g.polygonCapColor(capColor).polygonSideColor(sideColor).polygonStrokeColor(strokeColor).polygonLabel(polyLabel);
    g.pointsData(buildPoints()).ringsData(buildRings());
  }, [store.visits, active, focused, gReady]);

  const focusOn = (name) => {
    const rec = idx.byName.get(window.GEO.norm(name));
    if (!rec || !globeRef.current) return;
    globeRef.current.controls().autoRotate = false;
    globeRef.current.pointOfView({ lat: rec.lat, lng: rec.lng, altitude: 1.6 }, 900);
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
      <div className="globe-search"><window.SearchBox store={store} onSelect={focusOn} placeholder="Find a country…" /></div>
      <div className="globe-overlay">
        <div className="card atlas-card">
          <div className="atlas-label">Family Atlas</div>
          <div className="atlas-count">
            {familyCount}<span className="atlas-total"> / {idx.totalCountries}</span>
          </div>
          <div className="atlas-sub muted">visited</div>
        </div>
      </div>
      <div className="globe-hint">
        <span><span className="k">drag</span> spin</span>
        <span><span className="k">scroll</span> zoom</span>
        <span><span className="k">click</span> to edit</span>
      </div>
    </div>
  );
}
window.GlobeView = GlobeView;
