/* ============================================================
   CountryTrack — official sovereign states
   The 195 UN-recognised countries (193 members + Holy See &
   State of Palestine, the 2 observer states), matching the
   Worldometer / UN list. Keyed by ISO-3166 alpha-3 so it is
   robust to map naming differences. Continent buckets follow
   the standard 6-continent grouping (195 total).
   ============================================================ */
(function () {
  const BY_CONTINENT = {
    "Africa": ["DZA","AGO","BEN","BWA","BFA","BDI","CPV","CMR","CAF","TCD","COM","COG","COD","DJI","EGY","GNQ","ERI","SWZ","ETH","GAB","GMB","GHA","GIN","GNB","CIV","KEN","LSO","LBR","LBY","MDG","MWI","MLI","MRT","MUS","MAR","MOZ","NAM","NER","NGA","RWA","STP","SEN","SYC","SLE","SOM","ZAF","SSD","SDN","TZA","TGO","TUN","UGA","ZMB","ZWE"],
    "Asia": ["AFG","ARM","AZE","BHR","BGD","BTN","BRN","KHM","CHN","CYP","GEO","IND","IDN","IRN","IRQ","ISR","JPN","JOR","KAZ","KWT","KGZ","LAO","LBN","MYS","MDV","MNG","MMR","NPL","PRK","OMN","PAK","PSE","PHL","QAT","SAU","SGP","KOR","LKA","SYR","TJK","THA","TLS","TUR","TKM","ARE","UZB","VNM","YEM"],
    "Europe": ["ALB","AND","AUT","BLR","BEL","BIH","BGR","HRV","CZE","DNK","EST","FIN","FRA","DEU","GRC","HUN","ISL","IRL","ITA","LVA","LIE","LTU","LUX","MLT","MDA","MCO","MNE","NLD","MKD","NOR","POL","PRT","ROU","RUS","SMR","SRB","SVK","SVN","ESP","SWE","CHE","UKR","GBR","VAT"],
    "North America": ["ATG","BHS","BRB","BLZ","CAN","CRI","CUB","DMA","DOM","SLV","GRD","GTM","HTI","HND","JAM","MEX","NIC","PAN","KNA","LCA","VCT","TTO","USA"],
    "South America": ["ARG","BOL","BRA","CHL","COL","ECU","GUY","PRY","PER","SUR","URY","VEN"],
    "Oceania": ["AUS","FJI","KIR","MHL","FSM","NRU","NZL","PLW","PNG","WSM","SLB","TON","TUV","VUT"],
  };

  const byIso = {};
  const continentCounts = {};
  let total = 0;
  for (const [cont, list] of Object.entries(BY_CONTINENT)) {
    continentCounts[cont] = list.length;
    total += list.length;
    list.forEach((iso) => { byIso[iso] = cont; });
  }

  window.CT_OFFICIAL = { byIso, continentCounts, total }; // total === 195
})();
