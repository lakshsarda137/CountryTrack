/* SearchBox.jsx — country autocomplete used on both maps */
function SearchBox({ store, onSelect, placeholder = "Search a country…", autoFocus = false }) {
  const idx = window.GEO.index;
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [hi, setHi] = useState(0);
  const boxRef = useRef(null);

  const matches = useMemo(() => {
    const nq = window.GEO.norm(q.trim());
    if (!nq) return [];
    const all = idx.countries.filter(c => c.isCountry);
    const starts = [], incl = [];
    for (const c of all) {
      const n = window.GEO.norm(c.name);
      if (n.startsWith(nq)) starts.push(c);
      else if (n.includes(nq)) incl.push(c);
    }
    return [...starts, ...incl].slice(0, 8);
  }, [q, idx]);

  useEffect(() => { setHi(0); }, [q]);
  useEffect(() => {
    const onDoc = (e) => { if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener("pointerdown", onDoc);
    return () => document.removeEventListener("pointerdown", onDoc);
  }, []);

  const choose = (c) => { if (!c) return; onSelect(c.name); setQ(""); setOpen(false); };

  const onKey = (e) => {
    if (!open && (e.key === "ArrowDown")) { setOpen(true); return; }
    if (e.key === "ArrowDown") { e.preventDefault(); setHi(h => Math.min(h + 1, matches.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setHi(h => Math.max(h - 1, 0)); }
    else if (e.key === "Enter") { e.preventDefault(); choose(matches[hi]); }
    else if (e.key === "Escape") { setOpen(false); }
  };

  return (
    <div className="searchbox" ref={boxRef}>
      <div className="sb-input">
        <window.Icons.search size={17} />
        <input
          value={q} placeholder={placeholder} autoFocus={autoFocus}
          onChange={(e) => { setQ(e.target.value); setOpen(true); }}
          onFocus={() => q && setOpen(true)}
          onKeyDown={onKey}
        />
        {q && <button className="sb-clear" onClick={() => { setQ(""); setOpen(false); }} aria-label="Clear"><window.Icons.x size={15} /></button>}
      </div>
      {open && matches.length > 0 && (
        <ul className="sb-drop">
          {matches.map((c, i) => {
            const visitors = store.members.filter(m => store.isVisited(m.id, c.name));
            return (
              <li key={c.name} className={"sb-item" + (i === hi ? " hi" : "")}
                  onMouseEnter={() => setHi(i)} onClick={() => choose(c)}>
                <span className="sb-name">{c.name}</span>
                <span className="sb-cont">{c.officialContinent || c.continent}{!c.isOfficial && " · terr."}</span>
                <span className="sb-dots">
                  {visitors.map(m => <span key={m.id} className="sb-dot" style={{ background: m.color }}></span>)}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
window.SearchBox = SearchBox;
