/* ============================================================
   CountryTrack — data layer (members, seed travel data, home)
   All visit records are keyed by country NAME so they survive
   geometry changes. Everything here is overridable in the app
   and persisted to localStorage; this file is just the seed.
   ============================================================ */
(function () {
  // --- Family members --------------------------------------------------
  // Colors are warm-leaning but hue-spread so overlaps blend legibly.
  const MEMBERS = [
    { id: "shalbha", name: "Shalbha", color: "#E8765A", birth: "1980-06-15" }, // warm coral
    { id: "lk",      name: "LK",      color: "#E3B23C", birth: "1976-12-30" }, // amber / gold
    { id: "laksh",   name: "Laksh",   color: "#43B98D", birth: "2006-12-16" }, // emerald
    { id: "dhruv",   name: "Dhruv",   color: "#7C7CF0", birth: "2012-05-15" }, // periwinkle
  ];

  // --- Home base -------------------------------------------------------
  const HOME = { name: "Jaipur, India", lat: 26.9124, lng: 75.7873 };

  // --- Seed travel data (dummy, fully editable in-app) -----------------
  // Names match Natural Earth ADMIN/NAME values. Anything unmatched is
  // dropped silently on load (and logged), so it's safe to be generous.
  const SEED_VISITS = {
    shalbha: [
      "Iceland", "Norway", "Finland", "Denmark", "Switzerland", "France",
      "Spain", "Italy", "Vatican City", "Turkiye", "Georgia", "Thailand",
      "Cambodia", "Singapore", "Malaysia", "Indonesia",
      "United States of America", "Kazakhstan", "Botswana", "Rwanda",
      "Kenya", "Australia", "New Zealand", "Austria", "Germany", "Sri Lanka",
    ],
    lk: [
      "Iceland", "Norway", "Finland", "Denmark", "Switzerland", "France",
      "Spain", "Italy", "Vatican City", "Turkiye", "Georgia", "Thailand",
      "Cambodia", "Singapore", "Malaysia", "Indonesia",
      "United States of America", "Canada", "United Kingdom", "Azerbaijan",
      "Kazakhstan", "Yemen", "Oman", "Botswana", "Rwanda", "Kenya",
      "Australia", "Sri Lanka",
    ],
    laksh: [
      "Iceland", "Norway", "Finland", "Denmark", "Switzerland", "France",
      "Spain", "Italy", "Vatican City", "Turkiye", "Georgia", "Thailand",
      "Cambodia", "Singapore", "Malaysia", "Indonesia",
      "United States of America", "United Arab Emirates",
    ],
    dhruv: [
      "Iceland", "Norway", "Finland", "Denmark", "Switzerland", "France",
      "Spain", "Turkiye", "Singapore", "Sri Lanka",
      "United States of America",
    ],
  };

  // Aliases: friendly name -> Natural Earth name. Used when resolving
  // both seed data and user search input.
  const NAME_ALIASES = {
    "usa": "United States of America",
    "us": "United States of America",
    "united states": "United States of America",
    "uk": "United Kingdom",
    "uae": "United Arab Emirates",
    "turkiye": "Turkey",
    "türkiye": "Turkey",
    "vatican city": "Vatican",
    "holy see": "Vatican",
    "russia": "Russia",
    "south korea": "South Korea",
    "north korea": "North Korea",
    "czech republic": "Czechia",
    "burma": "Myanmar",
    "ivory coast": "Côte d'Ivoire",
    "drc": "Democratic Republic of the Congo",
  };

  window.CT_DATA = { MEMBERS, HOME, SEED_VISITS, NAME_ALIASES };
})();
