/* ============================================================
   CountryTrack — live population refresh
   The map ships with Natural Earth population estimates (~2017).
   This pulls the latest available figures so "population reached"
   and related stats stay current.

   NOTE ON SOURCE: Worldometer has no public API and blocks
   cross-origin browser requests (CORS), so it can't be scraped
   safely from a static site. We use the World Bank Open Data API
   (SP.POP.TOTL, most-recent value per country) — authoritative,
   CORS-enabled, and refreshed yearly. When deployed to Vercel a
   serverless function could swap in a true Worldometer scrape.
   ============================================================ */
(function () {
  const KEY = "ct.pop.v1";
  let _data = null; // { fetchedAt, year, source, entries: { ISO3: {value, year} } }

  function loadStored() {
    try { const r = localStorage.getItem(KEY); if (r) _data = JSON.parse(r); } catch (e) {}
    return _data;
  }

  function apply() {
    if (!_data || !window.GEO || !window.GEO.index) return;
    const ix = window.GEO.index;
    ix.countries.forEach((c) => {
      const list = c.iso3List && c.iso3List.length ? c.iso3List : [c.iso3];
      for (const iso of list) {
        const e = _data.entries[iso];
        if (e) { c.pop = e.value; c.popYear = e.year; break; }
      }
    });
  }

  async function refresh() {
    const url = "https://api.worldbank.org/v2/country/all/indicator/SP.POP.TOTL?format=json&mrnev=1&per_page=400";
    const res = await fetch(url);
    if (!res.ok) throw new Error("Population source unavailable (HTTP " + res.status + ")");
    const json = await res.json();
    const rows = (json && json[1]) || [];
    const entries = {}; let year = 0;
    rows.forEach((r) => {
      const iso = r.countryiso3code, v = r.value;
      if (iso && iso.length === 3 && v != null) {
        const y = Number(r.date);
        entries[iso] = { value: Number(v), year: y };
        if (y > year) year = y;
      }
    });
    if (Object.keys(entries).length === 0) throw new Error("No population data returned");
    _data = { fetchedAt: Date.now(), year, source: "World Bank", entries };
    try { localStorage.setItem(KEY, JSON.stringify(_data)); } catch (e) {}
    apply();
    return info();
  }

  function info() {
    return _data ? { fetchedAt: _data.fetchedAt, year: _data.year, source: _data.source, count: Object.keys(_data.entries).length } : null;
  }

  window.POP = { loadStored, apply, refresh, info, get data() { return _data; } };
})();
