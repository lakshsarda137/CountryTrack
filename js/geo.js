/* ============================================================
   CountryTrack — geo layer
   Loads Natural Earth country polygons once, builds a country
   index, and exposes geo math (centroid, hemisphere, continent,
   distance from home) + color blending used by every view.
   ============================================================ */
(function () {
  // 50m = high detail: includes Singapore, Maldives, Bahrain, Malta, Brunei,
  // Mauritius, Luxembourg, Cyprus and many other small states. Used for the
  // flat map, the country list, selection and all stats.
  const SRC_50 = [
    "https://cdn.jsdelivr.net/gh/nvkelso/natural-earth-vector@master/geojson/ne_50m_admin_0_countries.geojson",
    "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_50m_admin_0_countries.geojson",
  ];
  // 110m = lightweight (~75k triangles). Used ONLY for the 3D globe so it
  // stays smooth and cool; tiny states are selected via the flat map / list.
  const SRC_110 = [
    "https://cdn.jsdelivr.net/gh/nvkelso/natural-earth-vector@master/geojson/ne_110m_admin_0_countries.geojson",
    "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_admin_0_countries.geojson",
  ];

  // case-insensitive property getter
  function prop(p, keys) {
    for (const k of keys) {
      if (p[k] !== undefined && p[k] !== null && p[k] !== "") return p[k];
      const lk = k.toLowerCase();
      if (p[lk] !== undefined && p[lk] !== null && p[lk] !== "") return p[lk];
    }
    return undefined;
  }

  const norm = (s) => String(s || "").trim().toLowerCase();

  // ---- color blending (heat: saturation rises with visitors, not brightness) ----
  function hexToRgb(hex) {
    const h = hex.replace("#", "");
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
  }
  function rgbToHex([r, g, b]) {
    const c = (v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0");
    return "#" + c(r) + c(g) + c(b);
  }
  function rgbToHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h = 0, s = 0;
    const l = (max + min) / 2;
    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
      else if (max === g) h = ((b - r) / d + 2) / 6;
      else h = ((r - g) / d + 4) / 6;
    }
    return [h * 360, s, l];
  }
  function hslToRgb(h, s, l) {
    h = (((h % 360) + 360) % 360) / 360;
    if (s === 0) { const v = Math.round(l * 255); return [v, v, v]; }
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    const hue = (t) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };
    return [Math.round(hue(h + 1 / 3) * 255), Math.round(hue(h) * 255), Math.round(hue(h - 1 / 3) * 255)];
  }
  function hexToHsl(hex) {
    const [r, g, b] = hexToRgb(hex);
    return rgbToHsl(r, g, b);
  }
  function hslToHex(h, s, l) {
    return rgbToHex(hslToRgb(h, s, l));
  }
  function meanHue(hsls) {
    let x = 0, y = 0;
    for (const [h, s] of hsls) {
      const w = Math.max(0.08, s);
      const rad = h * Math.PI / 180;
      x += Math.cos(rad) * w;
      y += Math.sin(rad) * w;
    }
    if (!x && !y) return hsls[0][0];
    return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
  }

  const FAMILY_GOLD = "#D4A017";

  // More visitors => richer saturation (heat), never screen-blended white.
  function blendColors(hexes) {
    if (!hexes || hexes.length === 0) return null;
    const n = hexes.length;
    if (n === 1) {
      const [h, s, l] = hexToHsl(hexes[0]);
      return hslToHex(h, s * 0.8, l);
    }
    if (n >= 4) return FAMILY_GOLD;
    const hsls = hexes.map(hexToHsl);
    const h = meanHue(hsls);
    const s = Math.min(0.9, 0.5 + n * 0.14);
    return hslToHex(h, s, 0.47);
  }
  function withAlpha(hex, a) {
    const [r, g, b] = hexToRgb(hex);
    return `rgba(${r},${g},${b},${a})`;
  }

  // ---- haversine ------------------------------------------------------
  function distanceKm(aLat, aLng, bLat, bLng) {
    const R = 6371, toR = Math.PI / 180;
    const dLat = (bLat - aLat) * toR, dLng = (bLng - aLng) * toR;
    const s = Math.sin(dLat / 2) ** 2 +
      Math.cos(aLat * toR) * Math.cos(bLat * toR) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(s));
  }

  let _index = null;

  async function fetchGeo(sources) {
    for (const url of sources) {
      try {
        const res = await fetch(url);
        if (!res.ok) continue;
        const json = await res.json();
        if (json.type === "Topology") {
          // world-atlas fallback needs topojson; skip if not available
          if (!window.topojson) continue;
          const obj = json.objects.countries || Object.values(json.objects)[0];
          return window.topojson.feature(json, obj);
        }
        return json;
      } catch (e) {
        console.warn("[geo] source failed", url, e);
      }
    }
    throw new Error("Could not load country geometry from any source.");
  }

  function buildIndex(fc) {
    const features = fc.features.filter((f) => f.geometry);
    const byName = new Map();      // norm(name) -> record
    const countries = [];          // sortable list of records
    for (const f of features) {
      const p = f.properties || {};
      const name = prop(p, ["ADMIN", "NAME", "NAME_LONG", "SOVEREIGNT"]) || "Unknown";
      const continent = prop(p, ["CONTINENT", "REGION_UN"]) || "Other";
      const pop = Number(prop(p, ["POP_EST", "pop_est"]) || 0);
      const iso = prop(p, ["ISO_A2", "iso_a2"]) || "";
      const type = prop(p, ["TYPE", "type"]) || "";
      // ISO-3 candidates from the country's OWN codes only (NE sets ISO_A3 = -99
      // for France/Norway etc., so also check ADM0_A3 / ISO_A3_EH). We deliberately
      // exclude SOV_A3/GU_A3 which map dependencies onto their parent sovereign.
      const isoCands = [...new Set([
        prop(p, ["ADM0_A3"]), prop(p, ["ISO_A3_EH"]), prop(p, ["ISO_A3"]),
      ].filter(c => c && c !== "-99" && /^[A-Z]{3}$/.test(c)))];
      const OFF = window.CT_OFFICIAL.byIso;
      const rawMatch = isoCands.find(c => OFF[c]);
      // a few dependencies (e.g. Australian island territories) inherit their
      // parent's ISO code in the map data — exclude them from "official".
      const matchIso = (rawMatch && type !== "Dependency") ? rawMatch : null;
      let centroid = [0, 0];
      try { centroid = d3.geoCentroid(f); } catch (e) {}
      const [lng, lat] = centroid;
      const rec = {
        name, continent, pop, iso,
        lat, lng,
        hemisphereNS: lat >= 0 ? "Northern" : "Southern",
        hemisphereEW: lng >= 0 ? "Eastern" : "Western",
        feature: f,
        isCountry: continent !== "Antarctica" && name !== "Antarctica",
        // one of the official 195 sovereign / observer states?
        isOfficial: !!matchIso,
        officialContinent: matchIso ? OFF[matchIso] : null,
        iso3: isoCands[0] || "",
        iso3List: isoCands,
        distanceFromHome: 0,
      };
      f.__name = name; // stash for quick access in renderers
      byName.set(norm(name), rec);
      countries.push(rec);
    }
    const home = window.CT_DATA.HOME;
    countries.forEach((c) => { c.distanceFromHome = distanceKm(home.lat, home.lng, c.lat, c.lng); });
    countries.sort((a, b) => a.name.localeCompare(b.name));
    const officialFound = countries.filter((c) => c.isOfficial).length;
    const totalCountries = window.CT_OFFICIAL.total; // 195, authoritative denominator
    const continentTotals = window.CT_OFFICIAL.continentCounts;
    return { features, byName, countries, totalCountries, officialFound, continentTotals };
  }

  function resolveName(input) {
    if (!_index) return null;
    const aliases = window.CT_DATA.NAME_ALIASES || {};
    const orig = norm(input);
    // try alias target first, then the raw name
    const aliased = aliases[orig] ? norm(aliases[orig]) : null;
    const rec = (aliased && _index.byName.get(aliased)) || _index.byName.get(orig);
    return rec ? rec.name : null;
  }

  async function load() {
    if (_index) return _index;
    const fc = await fetchGeo(SRC_50);
    _index = buildIndex(fc);
    if (window.POP) { window.POP.loadStored(); window.POP.apply(); }
    console.info(`[geo] official countries found: ${_index.officialFound} / ${_index.totalCountries}`);
    return _index;
  }

  // lightweight polygons for the 3D globe only
  let _globeFeatures = null;
  async function loadGlobeFeatures() {
    if (_globeFeatures) return _globeFeatures;
    const fc = await fetchGeo(SRC_110);
    _globeFeatures = fc.features.filter((f) => f.geometry);
    _globeFeatures.forEach((f) => {
      const p = f.properties || {};
      f.__name = prop(p, ["ADMIN", "NAME", "NAME_LONG", "SOVEREIGNT"]) || "Unknown";
    });
    return _globeFeatures;
  }

  function isOfficialName(name) {
    const rec = _index && _index.byName.get(norm(name));
    return !!(rec && rec.isOfficial);
  }
  function officialContinentOf(name) {
    const rec = _index && _index.byName.get(norm(name));
    return rec ? rec.officialContinent : null;
  }

  window.GEO = {
    load,
    loadGlobeFeatures,
    get index() { return _index; },
    resolveName,
    isOfficialName,
    officialContinentOf,
    blendColors,
    withAlpha,
    hexToRgb,
    distanceKm,
    norm,
  };
})();
