/* common.jsx — shared UI atoms, icons, helpers (exported to window) */
const { useState, useEffect, useRef, useMemo, useCallback } = React;

// ---- tiny icon set (stroke, inherits color) ----
const Icon = ({ d, fill, size = 18, sw = 1.8, children }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={fill || "none"}
       stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
    {children || <path d={d} />}
  </svg>
);

const Icons = {
  globe: (p) => <Icon {...p}><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/></Icon>,
  map: (p) => <Icon {...p}><path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2Z"/><path d="M9 4v14M15 6v14"/></Icon>,
  stats: (p) => <Icon {...p}><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></Icon>,
  trophy: (p) => <Icon {...p}><path d="M7 4h10v4a5 5 0 0 1-10 0V4Z"/><path d="M7 6H4v1a3 3 0 0 0 3 3M17 6h3v1a3 3 0 0 1-3 3M9 20h6M10 20l.5-3h3l.5 3"/></Icon>,
  list: (p) => <Icon {...p}><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/></Icon>,
  search: (p) => <Icon {...p}><circle cx="11" cy="11" r="7"/><path d="m21 21-4-4"/></Icon>,
  check: (p) => <Icon {...p}><path d="M20 6 9 17l-5-5"/></Icon>,
  plus: (p) => <Icon {...p}><path d="M12 5v14M5 12h14"/></Icon>,
  download: (p) => <Icon {...p}><path d="M12 3v12M7 10l5 5 5-5M5 21h14"/></Icon>,
  upload: (p) => <Icon {...p}><path d="M12 21V9M7 14l5-5 5 5M5 3h14"/></Icon>,
  pin: (p) => <Icon {...p}><path d="M12 21s7-6.5 7-12a7 7 0 1 0-14 0c0 5.5 7 12 7 12Z"/><circle cx="12" cy="9" r="2.4"/></Icon>,
  x: (p) => <Icon {...p}><path d="M18 6 6 18M6 6l12 12"/></Icon>,
  reset: (p) => <Icon {...p}><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/></Icon>,
};

const initials = (name) => {
  const w = String(name).trim().split(/\s+/);
  return (w.length >= 2 ? (w[0][0] + w[1][0]) : name.slice(0, 2)).toUpperCase();
};

const Avatar = ({ member, size = "" }) => (
  <div className={"avatar " + size} style={{ background: member.color }} title={member.name}>
    {initials(member.name)}
  </div>
);

// continent display order + colors
const CONTINENTS = [
  ["Asia", "#E3B23C"], ["Europe", "#7C7CF0"], ["Africa", "#E8765A"],
  ["North America", "#43B98D"], ["South America", "#E89C5A"],
  ["Oceania", "#5AB6E8"], ["Antarctica", "#9aa"],
];

const fmt = (n) => n.toLocaleString("en-IN");

function MapLegend({ embedded }) {
  return (
    <div className={"map-legend" + (embedded ? " map-legend-embedded" : "")}>
      <div className="map-legend-block">
        <div className="map-legend-label">How many visited</div>
        <div className="heat-legend">
          {[1, 2, 3, 4].map(n => (
            <div className="heat-legend-item" key={n}>
              <span className="heat-legend-swatch" style={{ background: window.GEO.heatFill(n), boxShadow: `0 0 10px ${window.GEO.heatGlow(n)}, inset 0 0 4px rgba(255,255,255,0.15)` }} />
              <span className="heat-legend-n">{n}</span>
            </div>
          ))}
          <div className="heat-legend-item">
            <span className="heat-legend-swatch" style={{ background: window.GEO.HOME_COLORS.fill, boxShadow: `0 0 10px ${window.GEO.HOME_COLORS.glow}, inset 0 0 4px rgba(255,255,255,0.15)` }} />
            <span className="heat-legend-n">Home</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// age from an ISO birthdate (YYYY-MM-DD)
const ageYears = (birth) => { if (!birth) return null; return (Date.now() - new Date(birth).getTime()) / (365.25 * 24 * 3600 * 1000); };
const ageInt = (birth) => { const a = ageYears(birth); return a == null ? null : Math.floor(a); };

Object.assign(window, { Icon, Icons, Avatar, initials, CONTINENTS, fmt, MapLegend, ageYears, ageInt,
  useState, useEffect, useRef, useMemo, useCallback });
