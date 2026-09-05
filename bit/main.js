// Vector Zero — evolve a pathogen, spread it across the world, outrun the cure.
// Original design & implementation for the Plethora Bit runtime (plethora-bit@2).
//
// Country roster and the symptom-trait taxonomy were expanded with reference to
// omenking/pandemic (https://github.com/omenking/pandemic, MIT License,
// Copyright (c) 2013 Andrew Brown) — a fan project inspired by the same genre
// of outbreak-simulation game. No code, art, or text from that project is
// reproduced here; population figures, coordinates, trait costs/effects, the
// disease-kind system, and all game logic and rendering are original to this
// bit. See NOTICE in this repo for the attribution this license requires.

(function () {
  "use strict";

  // ---------------------------------------------------------------------
  // World data — abstracted nations, placed by approximate real longitude
  ///latitude so markers land on the right continent. Populations are
  // rounded, illustrative figures used for gameplay balance, not a
  // census dataset.
  // ---------------------------------------------------------------------
  var COUNTRIES = [
    { id: "usa", name: "United States", lon: -98, lat: 39, pop: 335, wealth: 3, climate: "temperate" },
    { id: "can", name: "Canada", lon: -106, lat: 56, pop: 39, wealth: 3, climate: "cold" },
    { id: "mex", name: "Mexico", lon: -102, lat: 23, pop: 129, wealth: 2, climate: "arid" },
    { id: "cub", name: "Cuba", lon: -79, lat: 21.5, pop: 11, wealth: 1, climate: "tropical" },
    { id: "dom", name: "Dominican Republic", lon: -70.5, lat: 19, pop: 11, wealth: 1, climate: "tropical" },
    { id: "gtm", name: "Guatemala", lon: -90.5, lat: 15.5, pop: 18, wealth: 1, climate: "tropical" },

    { id: "col", name: "Colombia", lon: -74, lat: 4, pop: 52, wealth: 1, climate: "tropical" },
    { id: "ven", name: "Venezuela", lon: -66, lat: 8, pop: 28, wealth: 1, climate: "tropical" },
    { id: "per", name: "Peru", lon: -76, lat: -10, pop: 34, wealth: 1, climate: "temperate" },
    { id: "bra", name: "Brazil", lon: -52, lat: -10, pop: 216, wealth: 2, climate: "tropical" },
    { id: "chl", name: "Chile", lon: -71, lat: -30, pop: 19, wealth: 2, climate: "temperate" },
    { id: "arg", name: "Argentina", lon: -64, lat: -34, pop: 46, wealth: 2, climate: "temperate" },
    { id: "bol", name: "Bolivia", lon: -65, lat: -17, pop: 12, wealth: 1, climate: "tropical" },

    { id: "gbr", name: "United Kingdom", lon: -2, lat: 54, pop: 68, wealth: 3, climate: "temperate" },
    { id: "irl", name: "Ireland", lon: -8, lat: 53, pop: 5, wealth: 3, climate: "temperate" },
    { id: "fra", name: "France", lon: 2, lat: 46, pop: 68, wealth: 3, climate: "temperate" },
    { id: "esp", name: "Spain", lon: -4, lat: 40, pop: 47, wealth: 3, climate: "arid" },
    { id: "prt", name: "Portugal", lon: -8, lat: 39.5, pop: 10, wealth: 2, climate: "temperate" },
    { id: "deu", name: "Germany", lon: 10, lat: 51, pop: 84, wealth: 3, climate: "temperate" },
    { id: "nld", name: "Netherlands", lon: 5.5, lat: 52, pop: 18, wealth: 3, climate: "temperate" },
    { id: "bel", name: "Belgium", lon: 4.5, lat: 50.5, pop: 12, wealth: 3, climate: "temperate" },
    { id: "che", name: "Switzerland", lon: 8, lat: 47, pop: 9, wealth: 3, climate: "cold" },
    { id: "ita", name: "Italy", lon: 12.5, lat: 43, pop: 59, wealth: 3, climate: "temperate" },
    { id: "aut", name: "Austria", lon: 14, lat: 47.5, pop: 9, wealth: 3, climate: "cold" },
    { id: "pol", name: "Poland", lon: 19, lat: 52, pop: 37, wealth: 2, climate: "cold" },
    { id: "cze", name: "Czechia", lon: 15.5, lat: 49.8, pop: 11, wealth: 2, climate: "cold" },
    { id: "hun", name: "Hungary", lon: 19.5, lat: 47, pop: 10, wealth: 2, climate: "temperate" },
    { id: "rou", name: "Romania", lon: 25, lat: 46, pop: 19, wealth: 2, climate: "cold" },
    { id: "grc", name: "Greece", lon: 22, lat: 39, pop: 10, wealth: 2, climate: "arid" },
    { id: "swe", name: "Sweden", lon: 15, lat: 62, pop: 10, wealth: 3, climate: "cold" },
    { id: "nor", name: "Norway", lon: 9, lat: 61, pop: 5, wealth: 3, climate: "cold" },
    { id: "fin", name: "Finland", lon: 26, lat: 64, pop: 6, wealth: 3, climate: "cold" },
    { id: "dnk", name: "Denmark", lon: 10, lat: 56, pop: 6, wealth: 3, climate: "cold" },
    { id: "ukr", name: "Ukraine", lon: 31.5, lat: 49, pop: 38, wealth: 1, climate: "cold" },
    { id: "srb", name: "Serbia", lon: 21, lat: 44, pop: 7, wealth: 2, climate: "temperate" },
    { id: "rus", name: "Russia", lon: 60, lat: 60, pop: 144, wealth: 2, climate: "cold" },

    { id: "tur", name: "Turkey", lon: 35, lat: 39, pop: 85, wealth: 2, climate: "temperate" },
    { id: "egy", name: "Egypt", lon: 30, lat: 27, pop: 112, wealth: 1, climate: "arid" },
    { id: "mar", name: "Morocco", lon: -6, lat: 32, pop: 38, wealth: 1, climate: "arid" },
    { id: "dza", name: "Algeria", lon: 3, lat: 28, pop: 45, wealth: 1, climate: "arid" },
    { id: "sau", name: "Saudi Arabia", lon: 45, lat: 24, pop: 36, wealth: 3, climate: "arid" },
    { id: "irq", name: "Iraq", lon: 44, lat: 33, pop: 44, wealth: 1, climate: "arid" },
    { id: "irn", name: "Iran", lon: 53, lat: 32, pop: 89, wealth: 1, climate: "arid" },
    { id: "isr", name: "Israel", lon: 35, lat: 31, pop: 9, wealth: 3, climate: "arid" },
    { id: "are", name: "United Arab Emirates", lon: 54, lat: 24, pop: 10, wealth: 3, climate: "arid" },
    { id: "yem", name: "Yemen", lon: 48, lat: 15.5, pop: 34, wealth: 1, climate: "arid" },
    { id: "syr", name: "Syria", lon: 38.5, lat: 35, pop: 21, wealth: 1, climate: "arid" },

    { id: "nga", name: "Nigeria", lon: 8, lat: 9.5, pop: 223, wealth: 1, climate: "tropical" },
    { id: "cod", name: "DR Congo", lon: 23, lat: -2.5, pop: 102, wealth: 1, climate: "tropical" },
    { id: "ken", name: "Kenya", lon: 38, lat: 0.5, pop: 55, wealth: 1, climate: "tropical" },
    { id: "eth", name: "Ethiopia", lon: 40, lat: 9, pop: 126, wealth: 1, climate: "tropical" },
    { id: "tza", name: "Tanzania", lon: 35, lat: -6, pop: 67, wealth: 1, climate: "tropical" },
    { id: "uga", name: "Uganda", lon: 32, lat: 1, pop: 48, wealth: 1, climate: "tropical" },
    { id: "gha", name: "Ghana", lon: -1, lat: 8, pop: 34, wealth: 1, climate: "tropical" },
    { id: "sdn", name: "Sudan", lon: 30, lat: 15, pop: 48, wealth: 1, climate: "arid" },
    { id: "zaf", name: "South Africa", lon: 24, lat: -29, pop: 60, wealth: 2, climate: "temperate" },

    { id: "pak", name: "Pakistan", lon: 69, lat: 30, pop: 240, wealth: 1, climate: "arid" },
    { id: "ind", name: "India", lon: 79, lat: 22, pop: 1428, wealth: 1, climate: "tropical" },
    { id: "bgd", name: "Bangladesh", lon: 90, lat: 24, pop: 173, wealth: 1, climate: "tropical" },
    { id: "npl", name: "Nepal", lon: 84, lat: 28, pop: 30, wealth: 1, climate: "cold" },
    { id: "lka", name: "Sri Lanka", lon: 81, lat: 7.5, pop: 22, wealth: 1, climate: "tropical" },
    { id: "kaz", name: "Kazakhstan", lon: 67, lat: 48, pop: 20, wealth: 2, climate: "cold" },
    { id: "uzb", name: "Uzbekistan", lon: 64, lat: 41.5, pop: 35, wealth: 1, climate: "arid" },
    { id: "afg", name: "Afghanistan", lon: 66, lat: 34, pop: 41, wealth: 1, climate: "arid" },
    { id: "mng", name: "Mongolia", lon: 103, lat: 46.5, pop: 3, wealth: 1, climate: "cold" },

    { id: "chn", name: "China", lon: 104, lat: 35, pop: 1411, wealth: 2, climate: "temperate" },
    { id: "jpn", name: "Japan", lon: 138, lat: 37, pop: 123, wealth: 3, climate: "temperate" },
    { id: "kor", name: "South Korea", lon: 127.5, lat: 36, pop: 52, wealth: 3, climate: "temperate" },
    { id: "prk", name: "North Korea", lon: 127, lat: 40, pop: 26, wealth: 1, climate: "cold" },

    { id: "vnm", name: "Vietnam", lon: 106, lat: 16, pop: 98, wealth: 1, climate: "tropical" },
    { id: "tha", name: "Thailand", lon: 101, lat: 15, pop: 71, wealth: 1, climate: "tropical" },
    { id: "mmr", name: "Myanmar", lon: 96, lat: 21, pop: 54, wealth: 1, climate: "tropical" },
    { id: "khm", name: "Cambodia", lon: 105, lat: 12.5, pop: 17, wealth: 1, climate: "tropical" },
    { id: "lao", name: "Laos", lon: 103, lat: 18, pop: 8, wealth: 1, climate: "tropical" },
    { id: "mys", name: "Malaysia", lon: 112, lat: 3.5, pop: 34, wealth: 2, climate: "tropical" },
    { id: "sgp", name: "Singapore", lon: 103.8, lat: 1.3, pop: 6, wealth: 3, climate: "tropical" },
    { id: "phl", name: "Philippines", lon: 122, lat: 13, pop: 117, wealth: 1, climate: "tropical" },
    { id: "idn", name: "Indonesia", lon: 113, lat: -2, pop: 277, wealth: 1, climate: "tropical" },

    { id: "aus", name: "Australia", lon: 134, lat: -25, pop: 26, wealth: 3, climate: "arid" },
    { id: "nzl", name: "New Zealand", lon: 172, lat: -41, pop: 5, wealth: 3, climate: "temperate" }
  ];

  function projectLL(lon, lat) {
    return { x: (lon + 180) / 360, y: (90 - lat) / 180 };
  }
  for (var ci = 0; ci < COUNTRIES.length; ci++) {
    var cll = projectLL(COUNTRIES[ci].lon, COUNTRIES[ci].lat);
    COUNTRIES[ci].x = cll.x;
    COUNTRIES[ci].y = cll.y;
  }

  // Simplified, hand-authored low-poly continent silhouettes (lon/lat
  // vertices) used only as a visual backdrop so markers read as sitting
  // on a real world map rather than floating in a void. Not traced from
  // any map product — a stylized approximation of coastlines.
  var LANDMASSES = [
    [ // North America
      [-165, 68], [-140, 70], [-95, 73], [-65, 68], [-55, 52], [-60, 46],
      [-70, 42], [-75, 35], [-80, 26], [-97, 26], [-88, 21], [-92, 14],
      [-83, 9], [-80, 8], [-85, 13], [-95, 16], [-105, 20], [-112, 24],
      [-115, 30], [-117, 33], [-124, 42], [-124, 48], [-130, 55],
      [-140, 60], [-165, 60]
    ],
    [ // South America
      [-77, 12], [-60, 10], [-50, 0], [-35, -6], [-38, -15], [-40, -22],
      [-48, -27], [-57, -35], [-65, -55], [-72, -52], [-71, -33],
      [-70, -18], [-81, -5], [-79, 2]
    ],
    [ // Africa
      [-17, 21], [10, 37], [25, 32], [34, 31], [43, 12], [40, -1],
      [35, -25], [20, -35], [12, -18], [9, 4], [-10, 6], [-17, 15]
    ],
    [ // Eurasia (Europe through Russia, China, South & Southeast Asia mainland)
      [-10, 43], [-9, 53], [5, 51], [10, 54], [25, 60], [30, 68],
      [40, 70], [60, 72], [100, 75], [140, 73], [170, 66], [160, 55],
      [135, 43], [122, 31], [110, 20], [100, 10], [95, 16], [80, 8],
      [72, 20], [61, 25], [50, 30], [35, 30], [27, 37], [23, 40],
      [13, 45], [3, 44]
    ],
    [ // Indonesia / Malay archipelago
      [95, 5], [106, -6], [120, -9], [135, -4], [140, -8], [120, 2], [105, 3]
    ],
    [ // Philippines
      [120, 19], [124, 17], [126, 8], [122, 6], [119, 11]
    ],
    [ // Japan
      [130, 45], [142, 43], [140, 35], [140, 31], [131, 34]
    ],
    [ // United Kingdom & Ireland
      [-8, 59], [-3, 59], [1, 53], [1, 50], [-6, 50], [-11, 54]
    ],
    [ // Australia
      [113, -22], [129, -15], [136, -12], [145, -15], [153, -28],
      [150, -37], [140, -38], [131, -32], [115, -34]
    ],
    [ // New Zealand
      [173, -34], [178, -38], [175, -42], [167, -45], [172, -40]
    ]
  ];

  var DISEASE_KINDS = [
    { id: "virus", name: "Virus", blurb: "Spreads like wildfire, but hard to make truly lethal.", infMax: 3.2, letMax: 0.9, visMax: 1.6 },
    { id: "bacteria", name: "Bacteria", blurb: "Balanced and adaptable. No sharp edge, no sharp weakness.", infMax: 2.3, letMax: 1.5, visMax: 1.5 },
    { id: "parasite", name: "Parasite", blurb: "Slow to spread, but devastating — and easy to hide.", infMax: 1.4, letMax: 2.2, visMax: 1.1 }
  ];

  var NAME_PRESETS = ["Kestrel-9", "Aurora Flu", "Meridian Strain", "Obsidian Fever", "Halcyon-7", "Thornwood Contagion", "Vesper Plague", "Ironbark-X"];

  // ---------------------------------------------------------------------
  // Trait tree — four disciplines. Symptom names follow a broad, standard
  // clinical vocabulary; costs/effects and every other system here are
  // original to this bit.
  // ---------------------------------------------------------------------
  var TRAITS = [
    // Transmission (feeds infectivity)
    { id: "water1", cat: "transmission", name: "Waterborne I", desc: "Spreads through contaminated water.", cost: 2, req: null, infectivity: 0.15 },
    { id: "water2", cat: "transmission", name: "Waterborne II", desc: "Survives water treatment.", cost: 4, req: "water1", infectivity: 0.15 },
    { id: "water3", cat: "transmission", name: "Waterborne III", desc: "Thrives in any water source.", cost: 8, req: "water2", infectivity: 0.20 },
    { id: "air1", cat: "transmission", name: "Airborne I", desc: "Rides on respiratory droplets.", cost: 3, req: null, infectivity: 0.20 },
    { id: "air2", cat: "transmission", name: "Airborne II", desc: "Lingers in the air far longer.", cost: 6, req: "air1", infectivity: 0.20 },
    { id: "air3", cat: "transmission", name: "Airborne III", desc: "True aerosol dispersal.", cost: 10, req: "air2", infectivity: 0.25 },
    { id: "insect", cat: "transmission", name: "Insect Vector", desc: "Mosquitoes carry it further.", cost: 5, req: null, infectivity: 0.15 },
    { id: "livestock", cat: "transmission", name: "Livestock Vector", desc: "Passes through farm animals.", cost: 4, req: null, infectivity: 0.10 },
    { id: "rodent", cat: "transmission", name: "Rodent Vector", desc: "Rats and mice spread it silently.", cost: 4, req: null, infectivity: 0.10 },

    // Symptoms (mixed infectivity / lethality / visibility)
    { id: "fever", cat: "symptoms", name: "Fever", desc: "Raises body temperature.", cost: 2, req: null, infectivity: 0.05, visibility: 0.10 },
    { id: "cough", cat: "symptoms", name: "Coughing", desc: "Expels the pathogen on every breath.", cost: 2, req: null, infectivity: 0.10, visibility: 0.05 },
    { id: "sneeze", cat: "symptoms", name: "Sneezing", desc: "An explosive transmission burst.", cost: 3, req: "cough", infectivity: 0.15, visibility: 0.05 },
    { id: "sweating", cat: "symptoms", name: "Sweating", desc: "Damp surfaces carry it further.", cost: 2, req: null, infectivity: 0.05, visibility: 0.05 },
    { id: "vomiting", cat: "symptoms", name: "Vomiting", desc: "Violent, contagious, and draining.", cost: 3, req: null, infectivity: 0.05, visibility: 0.15, lethality: 0.05 },
    { id: "fatigue", cat: "symptoms", name: "Fatigue", desc: "Wears the host down over time.", cost: 2, req: null, visibility: 0.05, lethality: 0.05 },
    { id: "diarrhea", cat: "symptoms", name: "Diarrhea", desc: "Rapidly contaminates its surroundings.", cost: 3, req: null, infectivity: 0.10, visibility: 0.10 },
    { id: "nausea", cat: "symptoms", name: "Nausea", desc: "Weakens the host quickly.", cost: 3, req: null, infectivity: 0.05, visibility: 0.10 },
    { id: "pulmonary_edema", cat: "symptoms", name: "Pulmonary Edema", desc: "The lungs begin to fill.", cost: 6, req: "vomiting", lethality: 0.15, visibility: 0.15 },
    { id: "dementia", cat: "symptoms", name: "Dementia", desc: "Cognitive collapse, impossible to miss.", cost: 6, req: null, lethality: 0.10, visibility: 0.20 },
    { id: "hypersensitivity", cat: "symptoms", name: "Hypersensitivity", desc: "Every contact becomes a transmission risk.", cost: 4, req: null, infectivity: 0.15, visibility: 0.10 },
    { id: "ataxia", cat: "symptoms", name: "Ataxia", desc: "Loss of motor control.", cost: 5, req: null, lethality: 0.10, visibility: 0.15 },
    { id: "kidney_failure", cat: "symptoms", name: "Kidney Failure", desc: "Toxins build up in the bloodstream.", cost: 7, req: "ataxia", lethality: 0.20, visibility: 0.15 },
    { id: "depression", cat: "symptoms", name: "Depression", desc: "A quiet symptom, easy to miss.", cost: 4, req: null, visibility: 0.05, lethality: 0.05 },
    { id: "hemorrhaging", cat: "symptoms", name: "Hemorrhaging", desc: "Internal bleeding accelerates spread.", cost: 8, req: null, lethality: 0.25, infectivity: 0.05, visibility: 0.20 },
    { id: "liver_failure", cat: "symptoms", name: "Liver Failure", desc: "Systemic toxicity sets in.", cost: 8, req: "kidney_failure", lethality: 0.20, visibility: 0.15 },
    { id: "heart_failure", cat: "symptoms", name: "Heart Failure", desc: "The final systemic collapse.", cost: 10, req: "liver_failure", lethality: 0.30, visibility: 0.20 },
    { id: "blindness", cat: "symptoms", name: "Blindness", desc: "Visible, permanent, unmistakable.", cost: 5, req: null, visibility: 0.15, lethality: 0.05 },
    { id: "hypotonia", cat: "symptoms", name: "Hypotonia", desc: "Muscle tone fails throughout the body.", cost: 4, req: null, lethality: 0.10, visibility: 0.05 },
    { id: "encephalitis", cat: "symptoms", name: "Encephalitis", desc: "Brain inflammation, often fatal.", cost: 9, req: "dementia", lethality: 0.25, visibility: 0.20 },

    // Lethality (structural, mostly hidden until late)
    { id: "necrosis1", cat: "lethality", name: "Necrosis I", desc: "Tissue begins to die.", cost: 4, req: null, lethality: 0.15 },
    { id: "necrosis2", cat: "lethality", name: "Necrosis II", desc: "Necrosis spreads rapidly.", cost: 7, req: "necrosis1", lethality: 0.20 },
    { id: "organfail1", cat: "lethality", name: "Organ Failure I", desc: "Vital organs begin shutting down.", cost: 6, req: null, lethality: 0.20, visibility: 0.10 },
    { id: "organfail2", cat: "lethality", name: "Total Organ Failure", desc: "Systemic collapse.", cost: 12, req: "organfail1", lethality: 0.35, visibility: 0.20 },
    { id: "septic", cat: "lethality", name: "Septic Shock", desc: "The body turns on itself.", cost: 8, req: null, lethality: 0.25, infectivity: 0.05, visibility: 0.20 },

    // Abilities
    { id: "coldres", cat: "abilities", name: "Cold Resistance", desc: "Thrives in cold climates.", cost: 3, req: null, climate: "cold" },
    { id: "heatres", cat: "abilities", name: "Heat Resistance", desc: "Thrives in arid climates.", cost: 3, req: null, climate: "arid" },
    { id: "humidres", cat: "abilities", name: "Humidity Resistance", desc: "Thrives in tropical climates.", cost: 3, req: null, climate: "tropical" },
    { id: "drugres1", cat: "abilities", name: "Drug Resistance I", desc: "Resists early treatments.", cost: 5, req: null, cureResist: 0.15 },
    { id: "drugres2", cat: "abilities", name: "Drug Resistance II", desc: "Resists advanced treatments.", cost: 9, req: "drugres1", cureResist: 0.25 },
    { id: "harden", cat: "abilities", name: "Genetic Hardening", desc: "Near-immune to any cure.", cost: 10, req: "drugres2", cureResist: 0.30 },
    { id: "stealth", cat: "abilities", name: "Genetic Stealth", desc: "Slips past screening.", cost: 6, req: null, detection: -0.20 }
  ];

  var CATS = [
    { id: "transmission", label: "Transmission" },
    { id: "symptoms", label: "Symptoms" },
    { id: "lethality", label: "Lethality" },
    { id: "abilities", label: "Abilities" }
  ];

  var COLOR = {
    bg: "#070b12",
    ocean: "#0c1626",
    healthy: "#1f7a4d",
    panel: "#0f1826",
    panelLine: "#233248",
    text: "#eaf1fb",
    dim: "#8fa2bd",
    accent: "#37e0b0",
    danger: "#ff5a5a",
    btn: "#16273c",
    btnActive: "#1f4a6b"
  };

  // graded heat ramp echoing a choropleth outbreak map: healthy green through
  // amber into an ever-darkening red/black as a country is consumed.
  var HEAT_STOPS = [
    [0.00, "#1f7a4d"],
    [0.05, "#e0c22c"],
    [0.20, "#e0a52c"],
    [0.40, "#e0722c"],
    [0.60, "#c1362b"],
    [0.80, "#8a1f2b"],
    [1.00, "#2a0a10"]
  ];

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function lerp(a, b, t) { return a + (b - a) * t; }

  function hex2rgb(h) {
    h = h.replace("#", "");
    return [parseInt(h.substr(0, 2), 16), parseInt(h.substr(2, 2), 16), parseInt(h.substr(4, 2), 16)];
  }
  function mixHex(h1, h2, t) {
    var a = hex2rgb(h1), b = hex2rgb(h2);
    return "rgb(" + Math.round(lerp(a[0], b[0], t)) + "," + Math.round(lerp(a[1], b[1], t)) + "," + Math.round(lerp(a[2], b[2], t)) + ")";
  }
  function heatColor(t) {
    t = clamp(t, 0, 1);
    for (var i = 0; i < HEAT_STOPS.length - 1; i++) {
      var a = HEAT_STOPS[i], b = HEAT_STOPS[i + 1];
      if (t >= a[0] && t <= b[0]) {
        var span = b[0] - a[0] || 1;
        return mixHex(a[1], b[1], (t - a[0]) / span);
      }
    }
    return HEAT_STOPS[HEAT_STOPS.length - 1][1];
  }

  function newState() {
    var countries = {};
    for (var i = 0; i < COUNTRIES.length; i++) {
      var c = COUNTRIES[i];
      countries[c.id] = { infected: 0, dead: 0, awareness: 0, bordersClosed: false };
    }
    return {
      setupStep: "kind",
      kind: null,
      diseaseName: null,
      started: false,
      gameOver: false,
      won: false,
      endReason: null,
      day: 0,
      dna: 4,
      owned: {},
      patientZero: null,
      countries: countries,
      cureProgress: 0,
      selected: null,
      activeTab: "map",
      activeCat: "transmission",
      speed: 1,
      paused: false,
      scrollY: 0,
      dragStartY: 0,
      dragging: false,
      lastMilestone: 0,
      accMs: 0,
      musicVol: 0.5,
      bestDays: null
    };
  }

  function traitById(id) {
    for (var i = 0; i < TRAITS.length; i++) if (TRAITS[i].id === id) return TRAITS[i];
    return null;
  }
  function kindById(id) {
    for (var i = 0; i < DISEASE_KINDS.length; i++) if (DISEASE_KINDS[i].id === id) return DISEASE_KINDS[i];
    return DISEASE_KINDS[0];
  }

  function ownedStats(state) {
    var kind = kindById(state.kind);
    var s = { infectivity: 0.05, visibility: 0.05, lethality: 0.02, cureResist: 0, detection: 0, climates: {} };
    for (var id in state.owned) {
      if (!state.owned[id]) continue;
      var t = traitById(id);
      if (!t) continue;
      s.infectivity += t.infectivity || 0;
      s.visibility += t.visibility || 0;
      s.lethality += t.lethality || 0;
      s.cureResist += t.cureResist || 0;
      s.detection += t.detection || 0;
      if (t.climate) s.climates[t.climate] = true;
    }
    s.infectivity = clamp(s.infectivity, 0, kind.infMax);
    s.lethality = clamp(s.lethality, 0, kind.letMax);
    s.visibility = clamp(s.visibility, 0, kind.visMax);
    s.cureResist = clamp(s.cureResist, 0, 0.9);
    s.detection = clamp(s.detection, -0.8, 0.5);
    return s;
  }

  function statsWithTrait(state, t) {
    var saved = state.owned[t.id];
    state.owned[t.id] = true;
    var s = ownedStats(state);
    if (saved) state.owned[t.id] = saved; else delete state.owned[t.id];
    return s;
  }

  function traitIsUseful(state, t) {
    var before = ownedStats(state);
    var after = statsWithTrait(state, t);
    return after.infectivity > before.infectivity + 1e-6 ||
      after.lethality > before.lethality + 1e-6 ||
      after.visibility > before.visibility + 1e-6 ||
      !!t.cureResist || !!t.detection || !!t.climate;
  }

  function canBuy(state, t) {
    if (state.owned[t.id]) return false;
    if (t.req && !state.owned[t.req]) return false;
    if (state.dna < t.cost) return false;
    return traitIsUseful(state, t);
  }

  function totalPop() {
    var p = 0;
    for (var i = 0; i < COUNTRIES.length; i++) p += COUNTRIES[i].pop;
    return p;
  }
  var TOTAL_POP = totalPop();

  function worldTally(state) {
    var infected = 0, dead = 0;
    for (var i = 0; i < COUNTRIES.length; i++) {
      var cs = state.countries[COUNTRIES[i].id];
      infected += cs.infected;
      dead += cs.dead;
    }
    return { infected: infected, dead: dead };
  }

  function simDay(state) {
    var stats = ownedStats(state);
    var t = stats.infectivity;
    var tally = worldTally(state);
    var worldInfectedFrac = tally.infected / TOTAL_POP;

    for (var i = 0; i < COUNTRIES.length; i++) {
      var c = COUNTRIES[i];
      var cs = state.countries[c.id];
      if (cs.infected <= 0.0001 && cs.dead <= 0.0001) continue;

      var susceptible = Math.max(0, c.pop - cs.infected - cs.dead);
      var climateMult = stats.climates[c.climate] ? 1.25 : 1.0;
      var growth = cs.infected * t * (susceptible / c.pop) * climateMult * (cs.bordersClosed ? 0.45 : 1);
      cs.infected = Math.min(susceptible + cs.infected, cs.infected + growth);

      var healthcare = 0.5 + c.wealth * 0.3;
      var deathRate = stats.lethality / healthcare * (1 - state.cureProgress * 0.9);
      var dailyDeaths = Math.min(cs.infected, cs.infected * clamp(deathRate, 0, 0.5));
      cs.dead += dailyDeaths;
      cs.infected -= dailyDeaths;

      var detectSpeed = 0.5 + c.wealth * 0.35;
      cs.awareness += (cs.infected / c.pop) * stats.visibility * detectSpeed * 0.06 * (1 - clamp(stats.detection + 0.8, 0, 1.3) + 0.3);
      cs.awareness = clamp(cs.awareness, 0, 1);
      if (cs.awareness > 0.6) cs.bordersClosed = true;
    }

    for (var a = 0; a < COUNTRIES.length; a++) {
      var A = COUNTRIES[a];
      var As = state.countries[A.id];
      if (As.infected < 0.5) continue;
      var infectedFracA = As.infected / A.pop;
      for (var b = 0; b < COUNTRIES.length; b++) {
        if (a === b) continue;
        var B = COUNTRIES[b];
        var Bs = state.countries[B.id];
        if (Bs.infected > 0 || Bs.dead >= B.pop - 1) continue;
        var dx = A.x - B.x, dy = A.y - B.y;
        var dist = Math.sqrt(dx * dx + dy * dy);
        var travel = (A.wealth + B.wealth) / 6;
        var chance = t * travel * (1 / (1 + dist * 9)) * infectedFracA * (Bs.bordersClosed ? 0.15 : 1) * 0.6;
        if (Math.random() < chance) Bs.infected = 1;
      }
    }

    var awarenessAvg = 0;
    for (var k = 0; k < COUNTRIES.length; k++) {
      var kc = COUNTRIES[k];
      awarenessAvg += state.countries[kc.id].awareness * (state.countries[kc.id].infected / kc.pop);
    }
    awarenessAvg /= COUNTRIES.length;
    state.cureProgress += awarenessAvg * 0.018 * (1 - stats.cureResist);
    state.cureProgress = clamp(state.cureProgress, 0, 1);

    if (state.cureProgress >= 1) {
      for (var m = 0; m < COUNTRIES.length; m++) state.countries[COUNTRIES[m].id].infected *= 0.82;
    }

    state.dna += 0.4 + worldInfectedFrac * 4;
    state.day += 1;

    var newTally = worldTally(state);
    if (newTally.dead >= TOTAL_POP * 0.999) {
      state.gameOver = true;
      state.won = true;
      state.endReason = "extinction";
    } else if (state.day > 5 && newTally.infected < 0.05) {
      // Every infected country has decayed below the cross-border spread
      // threshold (see the `As.infected < 0.5` guard above): the outbreak
      // has nowhere left to go, cured or not. Without this the game can
      // soft-lock forever on a weak strain that never reaches a verdict.
      state.gameOver = true;
      state.won = false;
      state.endReason = state.cureProgress >= 0.5 ? "cured" : "fizzled";
    }
  }

  function fmt(n) {
    if (n >= 1000) return (n / 1000).toFixed(2) + "B";
    return n.toFixed(1) + "M";
  }

  window.plethoraBit = {
    meta: { name: "Vector Zero" },
    async init(ctx) {
      var surface = ctx.createCanvas2D({ touchAction: "none" });
      var canvasEl = (surface && (surface.canvas || surface.element || surface.el)) || surface;
      var g = (surface && (surface.ctx || surface.context)) || (canvasEl && canvasEl.getContext && canvasEl.getContext("2d"));

      var state = newState();
      try { state.bestDays = ctx.storage && ctx.storage.get("vz_best_days"); } catch (e) {}

      function W() { return ctx.width || (canvasEl && canvasEl.width) || 360; }
      function H() { return ctx.height || (canvasEl && canvasEl.height) || 640; }
      function safeBottom() { return (ctx.safeArea && ctx.safeArea.bottom) || 0; }

      var mapTop = 78;
      function mapBottom() { return H() - 190 - safeBottom(); }

      function regionPoint(nx, ny, top, bot, w, pad) {
        return { x: pad + nx * (w - pad * 2), y: top + ny * (bot - top) };
      }
      function countryScreenPos(c) {
        return regionPoint(c.x, c.y, mapTop, mapBottom(), W(), 14);
      }
      function countryRadius(c) { return clamp(Math.sqrt(c.pop) * 0.85, 3.5, 24); }
      function drawLandmasses(top, bot, w, pad) {
        g.fillStyle = "#16324a";
        g.strokeStyle = "#24507a";
        g.lineWidth = 1;
        for (var m = 0; m < LANDMASSES.length; m++) {
          var poly = LANDMASSES[m];
          g.beginPath();
          for (var v = 0; v < poly.length; v++) {
            var ll = projectLL(poly[v][0], poly[v][1]);
            var p = regionPoint(ll.x, ll.y, top, bot, w, pad);
            if (v === 0) g.moveTo(p.x, p.y); else g.lineTo(p.x, p.y);
          }
          g.closePath();
          g.fill();
          g.stroke();
        }
      }
      function countryColor(c, cs) {
        var consumedFrac = (cs.infected + cs.dead) / c.pop;
        var deadShare = cs.dead / Math.max(cs.infected + cs.dead, 0.0001);
        return heatColor(consumedFrac * (0.4 + 0.6 * deadShare));
      }

      var hitRegions = [];
      function hit(x0, y0, x1, y1, fn) { hitRegions.push({ x0: x0, y0: y0, x1: x1, y1: y1, fn: fn }); }

      function roundRect(x, y, w, h, r) {
        g.beginPath();
        g.moveTo(x + r, y);
        g.arcTo(x + w, y, x + w, y + h, r);
        g.arcTo(x + w, y + h, x, y + h, r);
        g.arcTo(x, y + h, x, y, r);
        g.arcTo(x, y, x + w, y, r);
        g.closePath();
      }
      function drawButton(x, y, w, h, label, active, disabled) {
        g.fillStyle = disabled ? "#101a26" : (active ? COLOR.btnActive : COLOR.btn);
        roundRect(x, y, w, h, 8);
        g.fill();
        g.fillStyle = disabled ? "#4a5a6d" : COLOR.text;
        g.font = "600 13px sans-serif";
        g.textAlign = "center";
        g.textBaseline = "middle";
        g.fillText(label, x + w / 2, y + h / 2 + 1);
        return { x0: x, y0: y, x1: x + w, y1: y + h };
      }
      function drawBar(x, y, w, h, frac, color) {
        g.fillStyle = "#1a2536";
        roundRect(x, y, w, h, h / 2);
        g.fill();
        g.fillStyle = color;
        roundRect(x, y, Math.max(h, w * clamp(frac, 0, 1)), h, h / 2);
        g.fill();
      }

      function render() {
        var w = W(), h = H();
        g.fillStyle = COLOR.bg;
        g.fillRect(0, 0, w, h);
        hitRegions.length = 0;

        if (!state.started) {
          renderSetup(w, h);
        } else {
          renderHud(w, h);
          if (state.activeTab === "map") renderMap(w, h);
          else if (state.activeTab === "evolve") renderEvolve(w, h);
          else renderStats(w, h);
          renderTabs(w, h);
          if (state.gameOver) renderGameOver(w, h);
        }
      }

      function renderSetup(w, h) {
        g.fillStyle = COLOR.text;
        g.font = "700 24px sans-serif";
        g.textAlign = "center";
        g.fillText("VECTOR ZERO", w / 2, h * 0.10);
        g.fillStyle = COLOR.dim;
        g.font = "12px sans-serif";
        g.fillText("Evolve a pathogen. Spread it worldwide. Outrun the cure.", w / 2, h * 0.10 + 22);

        if (state.setupStep === "kind") renderStepKind(w, h);
        else if (state.setupStep === "name") renderStepName(w, h);
        else renderStepZero(w, h);

        if (state.bestDays) {
          g.fillStyle = COLOR.dim;
          g.font = "11px sans-serif";
          g.fillText("Best extinction: " + state.bestDays + " days", w / 2, h - 16 - safeBottom());
        }
      }

      function renderStepKind(w, h) {
        g.fillStyle = COLOR.dim;
        g.font = "12px sans-serif";
        g.fillText("Step 1 — choose your pathogen", w / 2, h * 0.20);

        var top = h * 0.24, cardH = 84, gap = 12;
        for (var i = 0; i < DISEASE_KINDS.length; i++) {
          var k = DISEASE_KINDS[i];
          var y = top + i * (cardH + gap);
          var active = state.kind === k.id;
          g.fillStyle = active ? "#123a2e" : COLOR.panel;
          roundRect(24, y, w - 48, cardH, 10);
          g.fill();
          g.strokeStyle = active ? COLOR.accent : COLOR.panelLine;
          g.lineWidth = active ? 2 : 1;
          roundRect(24, y, w - 48, cardH, 10);
          g.stroke();

          g.textAlign = "left";
          g.fillStyle = COLOR.text;
          g.font = "700 15px sans-serif";
          g.fillText(k.name, 38, y + 26);
          g.fillStyle = COLOR.dim;
          g.font = "11px sans-serif";
          wrapText(k.blurb, 38, y + 44, w - 90, 2);

          hit(24, y, w - 24, y + cardH, (function (id) {
            return function () { state.kind = id; try { ctx.platform.haptic("light"); } catch (e) {} };
          })(k.id));
        }

        var by = top + DISEASE_KINDS.length * (cardH + gap) + 8;
        var bw = Math.min(220, w - 60);
        var region = drawButton(w / 2 - bw / 2, by, bw, 46, "NEXT", !!state.kind, !state.kind);
        if (state.kind) hit(region.x0, region.y0, region.x1, region.y1, function () { state.setupStep = "name"; });
      }

      function renderStepName(w, h) {
        g.fillStyle = COLOR.dim;
        g.font = "12px sans-serif";
        g.textAlign = "center";
        g.fillText("Step 2 — name your pathogen", w / 2, h * 0.20);

        var top = h * 0.24;
        var cols = 2, cw = (w - 60) / cols, ch = 44, gap = 10;
        for (var i = 0; i < NAME_PRESETS.length; i++) {
          var col = i % cols, row = Math.floor(i / cols);
          var x = 24 + col * (cw + gap);
          var y = top + row * (ch + gap);
          var active = state.diseaseName === NAME_PRESETS[i];
          var region = drawButton(x, y, cw, ch, NAME_PRESETS[i], active);
          hit(region.x0, region.y0, region.x1, region.y1, (function (n) {
            return function () { state.diseaseName = n; };
          })(NAME_PRESETS[i]));
        }

        var by = top + Math.ceil(NAME_PRESETS.length / cols) * (ch + gap) + 10;
        var bw = Math.min(220, w - 60);
        var region2 = drawButton(w / 2 - bw / 2, by, bw, 46, "NEXT", !!state.diseaseName, !state.diseaseName);
        if (state.diseaseName) hit(region2.x0, region2.y0, region2.x1, region2.y1, function () { state.setupStep = "zero"; });

        var back = drawButton(24, by, 70, 46, "BACK", false);
        hit(back.x0, back.y0, back.x1, back.y1, function () { state.setupStep = "kind"; });
      }

      function renderStepZero(w, h) {
        g.fillStyle = COLOR.dim;
        g.font = "12px sans-serif";
        g.textAlign = "center";
        g.fillText("Step 3 — choose patient zero", w / 2, h * 0.20);

        var top = h * 0.24, bot = h * 0.68;
        var pad = 14;
        g.fillStyle = COLOR.ocean;
        g.fillRect(pad, top, w - pad * 2, bot - top);
        drawLandmasses(top, bot, w, pad);
        for (var i = 0; i < COUNTRIES.length; i++) {
          var c = COUNTRIES[i];
          var pz = regionPoint(c.x, c.y, top, bot, w, pad);
          var px = pz.x, py = pz.y;
          var r = countryRadius(c) * 0.8;
          g.beginPath();
          g.arc(px, py, r, 0, Math.PI * 2);
          g.fillStyle = state.patientZero === c.id ? COLOR.accent : COLOR.healthy;
          g.fill();
          if (state.patientZero === c.id) { g.lineWidth = 2; g.strokeStyle = "#ffffff"; g.stroke(); }
          hit(px - r - 6, py - r - 6, px + r + 6, py + r + 6, (function (id) {
            return function () { state.patientZero = id; try { ctx.platform.haptic("light"); } catch (e) {} };
          })(c.id));
        }

        g.fillStyle = COLOR.dim;
        g.font = "12px sans-serif";
        g.fillText(state.patientZero ? "Patient zero: " + labelFor(state.patientZero) : "Tap a country to choose patient zero", w / 2, bot + 20);

        var bw = Math.min(260, w - 60), bh = 46;
        var bx = w / 2 - bw / 2, by = bot + 40;
        var region = drawButton(bx, by, bw, bh, state.patientZero ? "START OUTBREAK" : "CHOOSE A COUNTRY", !!state.patientZero, !state.patientZero);
        if (state.patientZero) {
          hit(region.x0, region.y0, region.x1, region.y1, function () {
            state.started = true;
            state.countries[state.patientZero].infected = 1;
            try { ctx.platform.start({ kind: state.kind, name: state.diseaseName, patientZero: state.patientZero }); } catch (e) {}
            try { ctx.music.play(); state.musicVol = 0.35; ctx.music.setVolume(0.35); } catch (e) {}
          });
        }
        var back = drawButton(24, by, 70, bh, "BACK", false);
        hit(back.x0, back.y0, back.x1, back.y1, function () { state.setupStep = "name"; });
      }

      function labelFor(id) {
        for (var i = 0; i < COUNTRIES.length; i++) if (COUNTRIES[i].id === id) return COUNTRIES[i].name;
        return id;
      }

      function renderHud(w, h) {
        g.fillStyle = COLOR.panel;
        g.fillRect(0, 0, w, mapTop);
        g.strokeStyle = COLOR.panelLine;
        g.beginPath(); g.moveTo(0, mapTop); g.lineTo(w, mapTop); g.stroke();

        var tally = worldTally(state);
        var kind = kindById(state.kind);
        g.fillStyle = COLOR.text;
        g.font = "700 14px sans-serif";
        g.textAlign = "left";
        g.fillText((state.diseaseName || "Pathogen") + " · " + kind.name, 14, 18);
        g.fillStyle = COLOR.dim;
        g.font = "11px sans-serif";
        g.fillText("Day " + state.day, 14, 34);
        g.fillStyle = COLOR.accent;
        g.font = "600 13px sans-serif";
        g.fillText("DNA " + Math.floor(state.dna), 14, 50);

        g.fillStyle = COLOR.dim;
        g.font = "11px sans-serif";
        g.textAlign = "right";
        g.fillText("Infected " + fmt(tally.infected), w - 14, 20);
        g.fillText("Dead " + fmt(tally.dead), w - 14, 34);
        g.fillText("Cure " + Math.round(state.cureProgress * 100) + "%", w - 14, 48);

        g.fillStyle = "#1a2536";
        g.fillRect(14, 58, w - 28, 6);
        g.fillStyle = state.cureProgress > 0.7 ? COLOR.danger : COLOR.accent;
        g.fillRect(14, 58, (w - 28) * state.cureProgress, 6);

        var labels = [["II", 0], ["1x", 1], ["2x", 2], ["4x", 4]];
        var bw = 34, bh = 22, gap = 4;
        var startX = w - (bw * labels.length + gap * (labels.length - 1)) - 14;
        for (var i = 0; i < labels.length; i++) {
          var bx = startX + i * (bw + gap);
          var val = labels[i][1];
          var region = drawButton(bx, 66, bw, bh, labels[i][0], (val === 0 && state.paused) || (!state.paused && state.speed === val));
          hit(region.x0, region.y0, region.x1, region.y1, (function (v) {
            return function () {
              if (v === 0) { state.paused = true; } else { state.paused = false; state.speed = v; }
              try { ctx.platform.haptic("light"); } catch (e) {}
            };
          })(val));
        }
      }

      function renderMap(w, h) {
        var top = mapTop, bot = mapBottom();
        g.fillStyle = COLOR.ocean;
        g.fillRect(0, top, w, bot - top);
        drawLandmasses(top, bot, w, 14);

        for (var i = 0; i < COUNTRIES.length; i++) {
          var c = COUNTRIES[i];
          var cs = state.countries[c.id];
          var p = countryScreenPos(c);
          var r = countryRadius(c);
          g.beginPath();
          g.arc(p.x, p.y, r, 0, Math.PI * 2);
          g.fillStyle = countryColor(c, cs);
          g.fill();
          if (cs.bordersClosed) { g.lineWidth = 1.5; g.strokeStyle = "#ffffff88"; g.stroke(); }
          if (state.selected === c.id) { g.lineWidth = 2; g.strokeStyle = COLOR.accent; g.stroke(); }
          hit(p.x - r - 4, p.y - r - 4, p.x + r + 4, p.y + r + 4, (function (id) {
            return function () { state.selected = id; try { ctx.platform.interact({ country: id }); } catch (e) {} };
          })(c.id));
        }

        var infoY = bot + 8;
        g.fillStyle = COLOR.panel;
        g.fillRect(0, infoY, w, 100);
        if (state.selected) {
          var c2 = null;
          for (var j = 0; j < COUNTRIES.length; j++) if (COUNTRIES[j].id === state.selected) c2 = COUNTRIES[j];
          var cs2 = state.countries[state.selected];
          g.fillStyle = COLOR.text;
          g.font = "700 15px sans-serif";
          g.textAlign = "left";
          g.fillText(c2.name, 14, infoY + 22);
          g.fillStyle = COLOR.dim;
          g.font = "12px sans-serif";
          g.fillText("Population " + fmt(c2.pop), 14, infoY + 42);
          g.fillText("Infected " + fmt(cs2.infected) + "  Dead " + fmt(cs2.dead), 14, infoY + 60);
          g.fillText("Awareness " + Math.round(cs2.awareness * 100) + "%" + (cs2.bordersClosed ? "  Borders closed" : ""), 14, infoY + 78);
        } else {
          g.fillStyle = COLOR.dim;
          g.font = "12px sans-serif";
          g.textAlign = "left";
          g.fillText("Tap a country for details.", 14, infoY + 22);
        }
      }

      function renderEvolve(w, h) {
        var top = mapTop;
        var listBottom = H() - 130 - safeBottom();
        g.fillStyle = COLOR.bg;
        g.fillRect(0, top, w, listBottom - top);

        var catY = top + 8, catH = 30;
        var cw = (w - 28) / CATS.length;
        for (var i = 0; i < CATS.length; i++) {
          var cx = 14 + i * cw;
          var region = drawButton(cx + 2, catY, cw - 4, catH, CATS[i].label, state.activeCat === CATS[i].id);
          hit(region.x0, region.y0, region.x1, region.y1, (function (id) {
            return function () { state.activeCat = id; state.scrollY = 0; };
          })(CATS[i].id));
        }

        var listTop = catY + catH + 8;
        var rowH = 58;
        var traits = TRAITS.filter(function (t) { return t.cat === state.activeCat; });
        var contentH = traits.length * (rowH + 6);
        var viewH = listBottom - listTop;
        var maxScroll = Math.max(0, contentH - viewH);
        state.scrollY = clamp(state.scrollY, 0, maxScroll);

        g.save();
        g.beginPath();
        g.rect(0, listTop, w, viewH);
        g.clip();

        for (var i2 = 0; i2 < traits.length; i2++) {
          var t = traits[i2];
          var ry = listTop + i2 * (rowH + 6) - state.scrollY;
          if (ry + rowH < listTop || ry > listBottom) continue;
          var owned = !!state.owned[t.id];
          var locked = t.req && !state.owned[t.req];
          g.fillStyle = owned ? "#122a22" : COLOR.panel;
          roundRect(14, ry, w - 28, rowH, 8);
          g.fill();
          g.strokeStyle = COLOR.panelLine;
          g.lineWidth = 1;
          roundRect(14, ry, w - 28, rowH, 8);
          g.stroke();

          g.textAlign = "left";
          g.fillStyle = locked ? COLOR.dim : COLOR.text;
          g.font = "700 13px sans-serif";
          g.fillText(t.name, 24, ry + 20);
          g.fillStyle = COLOR.dim;
          g.font = "11px sans-serif";
          wrapText(t.desc, 24, ry + 36, w - 140, 2);

          var bw = 68, bh = 30;
          var bx = w - 14 - bw, by = ry + rowH / 2 - bh / 2;
          var canAfford = canBuy(state, t);
          var maxed = !owned && !locked && !canAfford && state.dna >= t.cost;
          var label = owned ? "OWNED" : (locked ? "LOCKED" : (maxed ? "MAXED" : (t.cost + " DNA")));
          var region2 = drawButton(bx, by, bw, bh, label, owned, locked || maxed || (!owned && state.dna < t.cost));
          if (!owned && !locked && !maxed) {
            hit(region2.x0, region2.y0, region2.x1, region2.y1, (function (tt) {
              return function () {
                if (!canBuy(state, tt)) return;
                state.dna -= tt.cost;
                state.owned[tt.id] = true;
                try { ctx.platform.interact({ trait: tt.id }); } catch (e) {}
                try { ctx.platform.haptic("success"); } catch (e) {}
              };
            })(t));
          }
        }
        g.restore();

        if (maxScroll > 0) {
          var trackH = viewH * (viewH / contentH);
          var trackY = listTop + (viewH - trackH) * (state.scrollY / maxScroll);
          g.fillStyle = "#334a63";
          g.fillRect(w - 5, trackY, 3, trackH);
        }

        hit(0, listTop, w, listBottom, function () {});
      }

      function wrapText(text, x, y, maxW, maxLines) {
        var words = text.split(" ");
        var line = "";
        var lines = [];
        for (var i = 0; i < words.length; i++) {
          var test = line + words[i] + " ";
          if (g.measureText(test).width > maxW && line) {
            lines.push(line);
            line = words[i] + " ";
          } else {
            line = test;
          }
        }
        lines.push(line);
        var n = maxLines || lines.length;
        for (var j = 0; j < Math.min(lines.length, n); j++) g.fillText(lines[j].trim(), x, y + j * 13);
      }

      function renderStats(w, h) {
        var top = mapTop;
        g.fillStyle = COLOR.bg;
        g.fillRect(0, top, w, H() - top);
        var stats = ownedStats(state);
        var kind = kindById(state.kind);
        var tally = worldTally(state);

        var barY = top + 20;
        var barDefs = [
          ["Infectivity", stats.infectivity, kind.infMax, COLOR.accent],
          ["Lethality", stats.lethality, kind.letMax, COLOR.danger],
          ["Visibility", stats.visibility, kind.visMax, "#e0a52c"]
        ];
        g.textAlign = "left";
        for (var i = 0; i < barDefs.length; i++) {
          var d = barDefs[i];
          g.fillStyle = COLOR.dim;
          g.font = "12px sans-serif";
          g.fillText(d[0], 18, barY + i * 34);
          drawBar(18, barY + i * 34 + 6, w - 36, 10, d[1] / d[2], d[3]);
        }

        var rowsTop = barY + barDefs.length * 34 + 16;
        var rows = [
          ["Day", state.day],
          ["DNA available", Math.floor(state.dna)],
          ["Cure resistance", Math.round(stats.cureResist * 100) + "%"],
          ["World infected", fmt(tally.infected)],
          ["World dead", fmt(tally.dead) + " / " + fmt(TOTAL_POP)],
          ["Cure progress", Math.round(state.cureProgress * 100) + "%"]
        ];
        for (var r = 0; r < rows.length; r++) {
          var ry = rowsTop + r * 28;
          g.fillStyle = COLOR.dim;
          g.font = "12px sans-serif";
          g.fillText(rows[r][0], 18, ry);
          g.fillStyle = COLOR.text;
          g.font = "700 13px sans-serif";
          g.textAlign = "right";
          g.fillText(String(rows[r][1]), w - 18, ry);
          g.textAlign = "left";
        }
      }

      function renderTabs(w, h) {
        var tabH = 56;
        var y = H() - tabH - safeBottom();
        g.fillStyle = COLOR.panel;
        g.fillRect(0, y, w, tabH + safeBottom());
        g.strokeStyle = COLOR.panelLine;
        g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke();

        var tabs = [["map", "MAP"], ["evolve", "EVOLVE"], ["stats", "STATS"]];
        var tw = w / tabs.length;
        for (var i = 0; i < tabs.length; i++) {
          var tx = i * tw;
          var active = state.activeTab === tabs[i][0];
          g.fillStyle = active ? COLOR.accent : COLOR.dim;
          g.font = "700 12px sans-serif";
          g.textAlign = "center";
          g.fillText(tabs[i][1], tx + tw / 2, y + tabH / 2 + 4);
          hit(tx, y, tx + tw, y + tabH, (function (id) {
            return function () { state.activeTab = id; };
          })(tabs[i][0]));
        }
      }

      function renderGameOver(w, h) {
        g.fillStyle = "rgba(3,6,10,0.86)";
        g.fillRect(0, 0, w, h);
        g.textAlign = "center";
        var title = state.won ? "EXTINCTION" : (state.endReason === "cured" ? "CURE DEPLOYED" : "OUTBREAK CONTAINED");
        var sub = state.won
          ? "Humanity fell in " + state.day + " days."
          : (state.endReason === "cured"
            ? "A cure reached the world before you did. Eradicated on day " + state.day + "."
            : "The strain burned out before it could spread far enough. Gone by day " + state.day + ".");
        g.fillStyle = state.won ? COLOR.accent : COLOR.danger;
        g.font = "700 24px sans-serif";
        g.fillText(title, w / 2, h * 0.42);
        g.fillStyle = COLOR.text;
        g.font = "13px sans-serif";
        wrapText(sub, w / 2, h * 0.42 + 24, w - 60, 2);
        g.textAlign = "center";

        var bw = 200, bh = 44;
        var region = drawButton(w / 2 - bw / 2, h * 0.42 + 56, bw, bh, "PLAY AGAIN", true);
        hit(region.x0, region.y0, region.x1, region.y1, function () {
          state = newState();
          try { state.bestDays = ctx.storage ? ctx.storage.get("vz_best_days") : null; } catch (e) {}
        });
      }

      function pointFromClient(cx, cy) {
        var rect = canvasEl && canvasEl.getBoundingClientRect ? canvasEl.getBoundingClientRect() : { left: 0, top: 0 };
        return { x: cx - rect.left, y: cy - rect.top };
      }
      function pointFromEvent(e) {
        var t = (e.touches && e.touches[0]) || (e.changedTouches && e.changedTouches[0]);
        var cx = t ? t.clientX : e.clientX;
        var cy = t ? t.clientY : e.clientY;
        return pointFromClient(cx || 0, cy || 0);
      }
      function preventIfPossible(e) {
        // On a real touchscreen, a passive/undeclared listener means
        // preventDefault() here is a silent no-op and the OS can hijack
        // the gesture as a page scroll/pinch, which then delivers
        // pointercancel instead of pointerup and no tap ever registers.
        // The explicit touch-action:none below plus {passive:false} on
        // the listener registration are what make this actually work.
        try { if (e.cancelable) e.preventDefault(); } catch (err) {}
      }

      var lastTapAt = 0;
      var lastTapXY = null;
      function dispatchTap(x, y) {
        var now = (typeof performance !== "undefined" ? performance.now() : Date.now());
        if (lastTapXY && now - lastTapAt < 350 && Math.abs(x - lastTapXY.x) < 6 && Math.abs(y - lastTapXY.y) < 6) {
          return; // a second event path (e.g. synthesized click) for the same physical tap
        }
        lastTapAt = now;
        lastTapXY = { x: x, y: y };
        for (var i = hitRegions.length - 1; i >= 0; i--) {
          var r = hitRegions[i];
          if (x >= r.x0 && x <= r.x1 && y >= r.y0 && y <= r.y1) { r.fn(); break; }
        }
        render();
      }

      function onDown(e) {
        preventIfPossible(e);
        var p = pointFromEvent(e);
        state.dragging = true;
        state.dragStartY = p.y;
        state.dragScrollStart = state.scrollY;
      }
      function onMove(e) {
        if (!state.dragging) return;
        preventIfPossible(e);
        var p = pointFromEvent(e);
        var dy = p.y - state.dragStartY;
        if (state.activeTab === "evolve" && Math.abs(dy) > 4) {
          state.scrollY = state.dragScrollStart - dy;
        }
      }
      function onUp(e) {
        var p = pointFromEvent(e);
        var dy = Math.abs(p.y - state.dragStartY);
        var wasDragging = state.dragging;
        state.dragging = false;
        if (wasDragging && dy < 8) dispatchTap(p.x, p.y);
        else render();
      }
      function onCancel() { state.dragging = false; }
      function onClickFallback(e) {
        // Safety net in case pointer events never fire on some runtime/
        // device combination — a plain click still gets us a working tap.
        var p = pointFromClient(e.clientX, e.clientY);
        dispatchTap(p.x, p.y);
      }

      if (canvasEl) {
        if (canvasEl.style) {
          canvasEl.style.touchAction = "none";
          canvasEl.style.userSelect = "none";
        }
        var noPassive = { passive: false };
        ctx.listen(canvasEl, "pointerdown", onDown, noPassive);
        ctx.listen(canvasEl, "pointermove", onMove, noPassive);
        ctx.listen(canvasEl, "pointerup", onUp, noPassive);
        ctx.listen(canvasEl, "pointercancel", onCancel);
        ctx.listen(canvasEl, "touchstart", onDown, noPassive);
        ctx.listen(canvasEl, "touchmove", onMove, noPassive);
        ctx.listen(canvasEl, "touchend", onUp, noPassive);
        ctx.listen(canvasEl, "touchcancel", onCancel);
        ctx.listen(canvasEl, "click", onClickFallback);
      }

      render();
      try { ctx.platform.ready(); } catch (e) {}

      var MS_PER_DAY = 650;
      var milestones = [0.001, 0.1, 0.3, 0.6, 0.9];

      ctx.onFrame(function (dtMs) {
        if (state.started && !state.gameOver && !state.paused) {
          state.accMs += dtMs * state.speed;
          var stepped = false;
          while (state.accMs >= MS_PER_DAY) {
            state.accMs -= MS_PER_DAY;
            simDay(state);
            stepped = true;
          }
          if (stepped) {
            var tally = worldTally(state);
            var frac = tally.dead / TOTAL_POP;
            for (var i = state.lastMilestone; i < milestones.length; i++) {
              if (frac >= milestones[i]) {
                state.lastMilestone = i + 1;
                try { ctx.platform.milestone("deaths_" + Math.round(milestones[i] * 100) + "pct"); } catch (e) {}
                try { ctx.platform.haptic("warning"); } catch (e) {}
              } else break;
            }
            try { ctx.platform.setScore(Math.round(tally.dead)); } catch (e) {}
            try {
              var targetVol = clamp(0.25 + frac * 0.6 + state.cureProgress * 0.15, 0.2, 0.9);
              if (Math.abs(targetVol - state.musicVol) > 0.05) {
                state.musicVol = targetVol;
                ctx.music.setVolume(targetVol, { fadeMs: 800 });
              }
            } catch (e) {}

            if (state.gameOver) {
              if (state.won) {
                try {
                  var best = ctx.storage ? ctx.storage.get("vz_best_days") : null;
                  if (!best || state.day < best) { ctx.storage && ctx.storage.set("vz_best_days", state.day); state.bestDays = state.day; }
                } catch (e) {}
                try { ctx.memory.record("extinction_days").submit(state.day, { label: state.diseaseName || "Vector Zero" }); } catch (e) {}
                try { ctx.music.sting("success"); } catch (e) {}
                try { ctx.platform.complete({ days: state.day, deaths: Math.round(tally.dead) }); } catch (e) {}
              } else {
                try { ctx.music.sting("warning"); } catch (e) {}
                try { ctx.platform.fail({ days: state.day, deaths: Math.round(tally.dead) }); } catch (e) {}
              }
            }
          }
        }
        render();
      });

      ctx.onDestroy(function () {
        try { ctx.music.stop({ fadeOutMs: 400 }); } catch (e) {}
      });
    }
  };
})();
