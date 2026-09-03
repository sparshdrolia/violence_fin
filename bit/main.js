// Vector Zero — evolve a pathogen, spread it across the world, outrun the cure.
// Original design & implementation for the Plethora Bit runtime (plethora-bit@2).

(function () {
  "use strict";

  // ---------------------------------------------------------------------
  // World data — abstracted nations. Populations are rounded, illustrative
  // figures used for gameplay balance, not a census dataset.
  // ---------------------------------------------------------------------
  var COUNTRIES = [
    { id: "usa", name: "United States", x: 0.20, y: 0.35, pop: 335, wealth: 3, climate: "temperate" },
    { id: "can", name: "Canada", x: 0.19, y: 0.20, pop: 39, wealth: 3, climate: "cold" },
    { id: "mex", name: "Mexico", x: 0.18, y: 0.45, pop: 129, wealth: 2, climate: "arid" },
    { id: "bra", name: "Brazil", x: 0.32, y: 0.63, pop: 216, wealth: 2, climate: "tropical" },
    { id: "arg", name: "Argentina", x: 0.29, y: 0.78, pop: 46, wealth: 2, climate: "temperate" },
    { id: "col", name: "Colombia", x: 0.24, y: 0.55, pop: 52, wealth: 1, climate: "tropical" },
    { id: "gbr", name: "United Kingdom", x: 0.47, y: 0.22, pop: 68, wealth: 3, climate: "temperate" },
    { id: "fra", name: "France", x: 0.49, y: 0.27, pop: 68, wealth: 3, climate: "temperate" },
    { id: "deu", name: "Germany", x: 0.51, y: 0.24, pop: 84, wealth: 3, climate: "temperate" },
    { id: "esp", name: "Spain", x: 0.46, y: 0.31, pop: 47, wealth: 3, climate: "arid" },
    { id: "ita", name: "Italy", x: 0.51, y: 0.30, pop: 59, wealth: 3, climate: "temperate" },
    { id: "pol", name: "Poland", x: 0.52, y: 0.23, pop: 37, wealth: 2, climate: "cold" },
    { id: "swe", name: "Sweden", x: 0.51, y: 0.16, pop: 10, wealth: 3, climate: "cold" },
    { id: "rus", name: "Russia", x: 0.65, y: 0.18, pop: 144, wealth: 2, climate: "cold" },
    { id: "tur", name: "Turkey", x: 0.55, y: 0.31, pop: 85, wealth: 2, climate: "temperate" },
    { id: "egy", name: "Egypt", x: 0.55, y: 0.41, pop: 112, wealth: 1, climate: "arid" },
    { id: "nga", name: "Nigeria", x: 0.50, y: 0.50, pop: 223, wealth: 1, climate: "tropical" },
    { id: "cod", name: "DR Congo", x: 0.52, y: 0.56, pop: 102, wealth: 1, climate: "tropical" },
    { id: "ken", name: "Kenya", x: 0.56, y: 0.55, pop: 55, wealth: 1, climate: "tropical" },
    { id: "zaf", name: "South Africa", x: 0.53, y: 0.73, pop: 60, wealth: 2, climate: "temperate" },
    { id: "sau", name: "Saudi Arabia", x: 0.58, y: 0.42, pop: 36, wealth: 3, climate: "arid" },
    { id: "irn", name: "Iran", x: 0.60, y: 0.37, pop: 89, wealth: 1, climate: "arid" },
    { id: "pak", name: "Pakistan", x: 0.65, y: 0.40, pop: 240, wealth: 1, climate: "arid" },
    { id: "ind", name: "India", x: 0.68, y: 0.45, pop: 1428, wealth: 1, climate: "tropical" },
    { id: "chn", name: "China", x: 0.75, y: 0.35, pop: 1411, wealth: 2, climate: "temperate" },
    { id: "jpn", name: "Japan", x: 0.85, y: 0.34, pop: 123, wealth: 3, climate: "temperate" },
    { id: "kor", name: "South Korea", x: 0.82, y: 0.35, pop: 52, wealth: 3, climate: "temperate" },
    { id: "vnm", name: "Vietnam", x: 0.77, y: 0.46, pop: 98, wealth: 1, climate: "tropical" },
    { id: "tha", name: "Thailand", x: 0.75, y: 0.47, pop: 71, wealth: 1, climate: "tropical" },
    { id: "phl", name: "Philippines", x: 0.80, y: 0.48, pop: 117, wealth: 1, climate: "tropical" },
    { id: "idn", name: "Indonesia", x: 0.78, y: 0.56, pop: 277, wealth: 1, climate: "tropical" },
    { id: "aus", name: "Australia", x: 0.83, y: 0.72, pop: 26, wealth: 3, climate: "arid" }
  ];

  // ---------------------------------------------------------------------
  // Trait tree — four disciplines, each a short prerequisite chain.
  // ---------------------------------------------------------------------
  var TRAITS = [
    // Transmission
    { id: "water1", cat: "transmission", name: "Waterborne I", desc: "Spreads through contaminated water.", cost: 2, req: null, transmission: 0.15 },
    { id: "water2", cat: "transmission", name: "Waterborne II", desc: "Survives water treatment.", cost: 4, req: "water1", transmission: 0.15 },
    { id: "water3", cat: "transmission", name: "Waterborne III", desc: "Thrives in any water source.", cost: 8, req: "water2", transmission: 0.20 },
    { id: "air1", cat: "transmission", name: "Airborne I", desc: "Rides on respiratory droplets.", cost: 3, req: null, transmission: 0.20 },
    { id: "air2", cat: "transmission", name: "Airborne II", desc: "Lingers in the air far longer.", cost: 6, req: "air1", transmission: 0.20 },
    { id: "air3", cat: "transmission", name: "Airborne III", desc: "True aerosol dispersal.", cost: 10, req: "air2", transmission: 0.25 },
    { id: "insect", cat: "transmission", name: "Insect Vector", desc: "Mosquitoes carry it further.", cost: 5, req: null, transmission: 0.15 },
    { id: "livestock", cat: "transmission", name: "Livestock Vector", desc: "Passes through farm animals.", cost: 4, req: null, transmission: 0.10 },
    { id: "rodent", cat: "transmission", name: "Rodent Vector", desc: "Rats and mice spread it silently.", cost: 4, req: null, transmission: 0.10 },

    // Symptoms
    { id: "fever", cat: "symptoms", name: "Fever", desc: "Raises body temperature.", cost: 2, req: null, severity: 0.10, transmission: 0.05 },
    { id: "cough", cat: "symptoms", name: "Coughing", desc: "Expels the pathogen on every breath.", cost: 2, req: null, transmission: 0.10, severity: 0.05 },
    { id: "sneeze", cat: "symptoms", name: "Sneezing", desc: "An explosive transmission burst.", cost: 3, req: "cough", transmission: 0.15, severity: 0.05 },
    { id: "nausea", cat: "symptoms", name: "Nausea", desc: "Weakens the host quickly.", cost: 3, req: null, transmission: 0.05, severity: 0.15 },
    { id: "insomnia", cat: "symptoms", name: "Insomnia", desc: "A quiet symptom, easy to miss.", cost: 3, req: null, severity: 0.10, detection: -0.05 },
    { id: "cysts", cat: "symptoms", name: "Cysts", desc: "Visible, painful, unmistakable.", cost: 5, req: "nausea", severity: 0.20 },

    // Lethality
    { id: "necrosis1", cat: "lethality", name: "Necrosis I", desc: "Tissue begins to die.", cost: 4, req: null, lethality: 0.15 },
    { id: "necrosis2", cat: "lethality", name: "Necrosis II", desc: "Necrosis spreads rapidly.", cost: 7, req: "necrosis1", lethality: 0.20 },
    { id: "organfail1", cat: "lethality", name: "Organ Failure I", desc: "Vital organs begin shutting down.", cost: 6, req: null, lethality: 0.20, severity: 0.10 },
    { id: "organfail2", cat: "lethality", name: "Total Organ Failure", desc: "Systemic collapse.", cost: 12, req: "organfail1", lethality: 0.35, severity: 0.20 },
    { id: "hemorrhage", cat: "lethality", name: "Hemorrhagic Fever", desc: "Internal bleeding accelerates spread.", cost: 8, req: null, lethality: 0.25, transmission: 0.05, severity: 0.20 },

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
    infected: "#e0a52c",
    dead: "#8a1f2b",
    panel: "#0f1826",
    panelLine: "#233248",
    text: "#eaf1fb",
    dim: "#8fa2bd",
    accent: "#37e0b0",
    danger: "#ff5a5a",
    btn: "#16273c",
    btnActive: "#1f4a6b"
  };

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function lerp(a, b, t) { return a + (b - a) * t; }

  function newState() {
    var countries = {};
    for (var i = 0; i < COUNTRIES.length; i++) {
      var c = COUNTRIES[i];
      countries[c.id] = {
        infected: 0,
        dead: 0,
        awareness: 0,
        bordersClosed: false
      };
    }
    return {
      started: false,
      gameOver: false,
      won: false,
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
      musicVol: 0.5
    };
  }

  function traitById(id) {
    for (var i = 0; i < TRAITS.length; i++) if (TRAITS[i].id === id) return TRAITS[i];
    return null;
  }

  function ownedStats(state) {
    var s = { transmission: 0.05, severity: 0.05, lethality: 0.02, cureResist: 0, detection: 0, climates: {} };
    for (var id in state.owned) {
      if (!state.owned[id]) continue;
      var t = traitById(id);
      if (!t) continue;
      s.transmission += t.transmission || 0;
      s.severity += t.severity || 0;
      s.lethality += t.lethality || 0;
      s.cureResist += t.cureResist || 0;
      s.detection += t.detection || 0;
      if (t.climate) s.climates[t.climate] = true;
    }
    s.cureResist = clamp(s.cureResist, 0, 0.9);
    s.detection = clamp(s.detection, -0.8, 0.5);
    return s;
  }

  function canBuy(state, t) {
    if (state.owned[t.id]) return false;
    if (t.req && !state.owned[t.req]) return false;
    return state.dna >= t.cost;
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
    var t = stats.transmission;
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
      var dailyDeaths = cs.infected * clamp(deathRate, 0, 0.5);
      dailyDeaths = Math.min(dailyDeaths, cs.infected);
      cs.dead += dailyDeaths;
      cs.infected -= dailyDeaths;

      var detectSpeed = 0.5 + c.wealth * 0.35;
      cs.awareness += (cs.infected / c.pop) * stats.severity * detectSpeed * 0.06 * (1 - clamp(stats.detection + 0.8, 0, 1.3) + 0.3);
      cs.awareness = clamp(cs.awareness, 0, 1);
      if (cs.awareness > 0.6) cs.bordersClosed = true;
    }

    // cross-border spread
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
        if (Math.random() < chance) {
          Bs.infected = 1;
        }
      }
    }

    // cure research
    var awarenessAvg = 0;
    for (var k = 0; k < COUNTRIES.length; k++) {
      var kc = COUNTRIES[k];
      awarenessAvg += state.countries[kc.id].awareness * (state.countries[kc.id].infected / kc.pop);
    }
    awarenessAvg /= COUNTRIES.length;
    state.cureProgress += awarenessAvg * 0.018 * (1 - stats.cureResist);
    state.cureProgress = clamp(state.cureProgress, 0, 1);

    if (state.cureProgress >= 1) {
      for (var m = 0; m < COUNTRIES.length; m++) {
        var mc = state.countries[COUNTRIES[m].id];
        mc.infected *= 0.82;
      }
    }

    // DNA accrual
    state.dna += 0.4 + worldInfectedFrac * 4;

    state.day += 1;

    var newTally = worldTally(state);
    if (newTally.dead >= TOTAL_POP * 0.999) {
      state.gameOver = true;
      state.won = true;
    } else if (state.cureProgress >= 1 && newTally.infected < TOTAL_POP * 0.0005 && newTally.dead < TOTAL_POP * 0.999) {
      state.gameOver = true;
      state.won = false;
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
      var canvasEl = surface && (surface.canvas || surface.element || surface.el) || surface;
      var g = (surface && (surface.ctx || surface.context)) || (canvasEl && canvasEl.getContext && canvasEl.getContext("2d"));

      var state = newState();

      try {
        var saved = ctx.storage && ctx.storage.get("vz_best_days");
        state.bestDays = saved || null;
      } catch (e) { state.bestDays = null; }

      function W() { return ctx.width || (canvasEl && canvasEl.width) || 360; }
      function H() { return ctx.height || (canvasEl && canvasEl.height) || 640; }
      function safeBottom() { return (ctx.safeArea && ctx.safeArea.bottom) || 0; }

      var mapTop = 78;
      function mapBottom() { return H() - 190 - safeBottom(); }

      function countryScreenPos(c) {
        var pad = 14;
        var mh = mapBottom() - mapTop;
        return { x: pad + c.x * (W() - pad * 2), y: mapTop + c.y * mh };
      }

      function countryRadius(c) {
        return clamp(Math.sqrt(c.pop) * 0.85, 4, 26);
      }

      function countryColor(c, cs) {
        var deadFrac = cs.dead / c.pop;
        var infFrac = cs.infected / c.pop;
        if (deadFrac > 0.01) {
          return mixHex(COLOR.infected, COLOR.dead, clamp(deadFrac * 3, 0, 1));
        }
        if (infFrac > 0.005) {
          return mixHex(COLOR.healthy, COLOR.infected, clamp(infFrac * 4, 0, 1));
        }
        return COLOR.healthy;
      }

      function hex2rgb(h) {
        h = h.replace("#", "");
        return [parseInt(h.substr(0, 2), 16), parseInt(h.substr(2, 2), 16), parseInt(h.substr(4, 2), 16)];
      }
      function mixHex(h1, h2, t) {
        var a = hex2rgb(h1), b = hex2rgb(h2);
        var r = Math.round(lerp(a[0], b[0], t));
        var gc = Math.round(lerp(a[1], b[1], t));
        var bl = Math.round(lerp(a[2], b[2], t));
        return "rgb(" + r + "," + gc + "," + bl + ")";
      }

      // --- hit regions, rebuilt each render ---
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

      function render() {
        var w = W(), h = H();
        g.fillStyle = COLOR.bg;
        g.fillRect(0, 0, w, h);
        hitRegions.length = 0;

        if (!state.started) {
          renderMenu(w, h);
        } else {
          renderHud(w, h);
          if (state.activeTab === "map") renderMap(w, h);
          else if (state.activeTab === "evolve") renderEvolve(w, h);
          else renderStats(w, h);
          renderTabs(w, h);
          if (state.gameOver) renderGameOver(w, h);
        }
      }

      function renderMenu(w, h) {
        g.fillStyle = COLOR.text;
        g.font = "700 26px sans-serif";
        g.textAlign = "center";
        g.fillText("VECTOR ZERO", w / 2, h * 0.16);
        g.fillStyle = COLOR.dim;
        g.font = "13px sans-serif";
        g.fillText("Evolve a pathogen. Spread it worldwide.", w / 2, h * 0.16 + 26);
        g.fillText("Outrun the cure.", w / 2, h * 0.16 + 44);

        // mini map for patient-zero selection
        var top = h * 0.24, bot = h * 0.68;
        var pad = 14;
        for (var i = 0; i < COUNTRIES.length; i++) {
          var c = COUNTRIES[i];
          var mh = bot - top;
          var px = pad + c.x * (w - pad * 2);
          var py = top + c.y * mh;
          var r = countryRadius(c) * 0.8;
          g.beginPath();
          g.arc(px, py, r, 0, Math.PI * 2);
          g.fillStyle = state.patientZero === c.id ? COLOR.accent : COLOR.healthy;
          g.fill();
          if (state.patientZero === c.id) {
            g.lineWidth = 2;
            g.strokeStyle = "#ffffff";
            g.stroke();
          }
          hit(px - r - 6, py - r - 6, px + r + 6, py + r + 6, (function (id) {
            return function () {
              state.patientZero = id;
              try { ctx.platform.haptic("light"); } catch (e) {}
            };
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
            try { ctx.platform.start({ patientZero: state.patientZero }); } catch (e) {}
            try { ctx.music.play(); state.musicVol = 0.35; ctx.music.setVolume(0.35); } catch (e) {}
          });
        }

        if (state.bestDays) {
          g.fillStyle = COLOR.dim;
          g.font = "11px sans-serif";
          g.fillText("Best extinction: " + state.bestDays + " days", w / 2, by + bh + 22);
        }
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
        g.fillStyle = COLOR.text;
        g.font = "700 15px sans-serif";
        g.textAlign = "left";
        g.fillText("Day " + state.day, 14, 24);
        g.fillStyle = COLOR.accent;
        g.font = "600 13px sans-serif";
        g.fillText("DNA " + Math.floor(state.dna), 14, 44);

        g.fillStyle = COLOR.dim;
        g.font = "11px sans-serif";
        g.textAlign = "right";
        g.fillText("Infected " + fmt(tally.infected), w - 14, 20);
        g.fillText("Dead " + fmt(tally.dead), w - 14, 34);
        g.fillText("Cure " + Math.round(state.cureProgress * 100) + "%", w - 14, 48);

        // cure progress bar
        g.fillStyle = "#1a2536";
        g.fillRect(14, 58, w - 28, 6);
        g.fillStyle = state.cureProgress > 0.7 ? COLOR.danger : COLOR.accent;
        g.fillRect(14, 58, (w - 28) * state.cureProgress, 6);

        // speed controls
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

        for (var i = 0; i < COUNTRIES.length; i++) {
          var c = COUNTRIES[i];
          var cs = state.countries[c.id];
          var p = countryScreenPos(c);
          var r = countryRadius(c);
          g.beginPath();
          g.arc(p.x, p.y, r, 0, Math.PI * 2);
          g.fillStyle = countryColor(c, cs);
          g.fill();
          if (cs.bordersClosed) {
            g.lineWidth = 1.5;
            g.strokeStyle = "#ffffff88";
            g.stroke();
          }
          if (state.selected === c.id) {
            g.lineWidth = 2;
            g.strokeStyle = COLOR.accent;
            g.stroke();
          }
          hit(p.x - r - 4, p.y - r - 4, p.x + r + 4, p.y + r + 4, (function (id) {
            return function () { state.selected = id; try { ctx.platform.interact({ country: id }); } catch (e) {} };
          })(c.id));
        }

        // info panel for selection
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

        // category selector
        var catY = top + 8, catH = 30;
        var cw = (w - 28) / CATS.length;
        for (var i = 0; i < CATS.length; i++) {
          var cx = 14 + i * cw;
          var region = drawButton(cx + 2, catY, cw - 4, catH, CATS[i].label, state.activeCat === CATS[i].id);
          hit(region.x0, region.y0, region.x1, region.y1, (function (id) {
            return function () { state.activeCat = id; state.scrollY = 0; };
          })(CATS[i].id));
        }

        // trait list (scrollable)
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
          wrapText(t.desc, 24, ry + 36, w - 140);

          var bw = 68, bh = 30;
          var bx = w - 14 - bw, by = ry + rowH / 2 - bh / 2;
          var label = owned ? "OWNED" : (locked ? "LOCKED" : (t.cost + " DNA"));
          var canAfford = canBuy(state, t);
          var region2 = drawButton(bx, by, bw, bh, label, owned, locked || (!owned && !canAfford));
          if (!owned && !locked) {
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

        hit(0, listTop, w, listBottom, function () {}); // reserve drag area (handled in pointer logic)
      }

      function wrapText(text, x, y, maxW) {
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
        for (var j = 0; j < Math.min(lines.length, 2); j++) g.fillText(lines[j].trim(), x, y + j * 13);
      }

      function renderStats(w, h) {
        var top = mapTop;
        g.fillStyle = COLOR.bg;
        g.fillRect(0, top, w, H() - top);
        var stats = ownedStats(state);
        var tally = worldTally(state);
        var rows = [
          ["Day", state.day],
          ["DNA available", Math.floor(state.dna)],
          ["Total transmission", stats.transmission.toFixed(2)],
          ["Total severity", stats.severity.toFixed(2)],
          ["Total lethality", stats.lethality.toFixed(2)],
          ["Cure resistance", Math.round(stats.cureResist * 100) + "%"],
          ["World infected", fmt(tally.infected)],
          ["World dead", fmt(tally.dead) + " / " + fmt(TOTAL_POP)],
          ["Cure progress", Math.round(state.cureProgress * 100) + "%"]
        ];
        g.textAlign = "left";
        for (var i = 0; i < rows.length; i++) {
          var ry = top + 24 + i * 30;
          g.fillStyle = COLOR.dim;
          g.font = "12px sans-serif";
          g.fillText(rows[i][0], 18, ry);
          g.fillStyle = COLOR.text;
          g.font = "700 13px sans-serif";
          g.textAlign = "right";
          g.fillText(String(rows[i][1]), w - 18, ry);
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
        g.fillStyle = state.won ? COLOR.accent : COLOR.danger;
        g.font = "700 24px sans-serif";
        g.fillText(state.won ? "EXTINCTION" : "CURE DEPLOYED", w / 2, h * 0.42);
        g.fillStyle = COLOR.text;
        g.font = "13px sans-serif";
        g.fillText(state.won ? "Humanity fell in " + state.day + " days." : "The pathogen was eradicated on day " + state.day + ".", w / 2, h * 0.42 + 28);

        var bw = 200, bh = 44;
        var region = drawButton(w / 2 - bw / 2, h * 0.42 + 56, bw, bh, "PLAY AGAIN", true);
        hit(region.x0, region.y0, region.x1, region.y1, function () {
          state = newState();
          try { state.bestDays = ctx.storage ? ctx.storage.get("vz_best_days") : null; } catch (e) {}
        });
      }

      function pointFromEvent(e) {
        var rect = canvasEl && canvasEl.getBoundingClientRect ? canvasEl.getBoundingClientRect() : { left: 0, top: 0 };
        var cx = (e.clientX != null ? e.clientX : (e.touches && e.touches[0] && e.touches[0].clientX) || 0);
        var cy = (e.clientY != null ? e.clientY : (e.touches && e.touches[0] && e.touches[0].clientY) || 0);
        return { x: cx - rect.left, y: cy - rect.top };
      }

      function onDown(e) {
        var p = pointFromEvent(e);
        state.dragging = true;
        state.dragStartY = p.y;
        state.dragScrollStart = state.scrollY;
      }
      function onMove(e) {
        if (!state.dragging) return;
        var p = pointFromEvent(e);
        var dy = p.y - state.dragStartY;
        if (state.activeTab === "evolve" && Math.abs(dy) > 4) {
          state.scrollY = state.dragScrollStart - dy;
        }
      }
      function onUp(e) {
        var p = pointFromEvent(e);
        var dy = Math.abs(p.y - state.dragStartY);
        state.dragging = false;
        if (dy < 8) {
          for (var i = hitRegions.length - 1; i >= 0; i--) {
            var r = hitRegions[i];
            if (p.x >= r.x0 && p.x <= r.x1 && p.y >= r.y0 && p.y <= r.y1) {
              r.fn();
              break;
            }
          }
        }
        render();
      }

      if (canvasEl) {
        ctx.listen(canvasEl, "pointerdown", onDown);
        ctx.listen(canvasEl, "pointermove", onMove);
        ctx.listen(canvasEl, "pointerup", onUp);
        ctx.listen(canvasEl, "pointercancel", function () { state.dragging = false; });
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
                  if (!best || state.day < best) {
                    ctx.storage && ctx.storage.set("vz_best_days", state.day);
                    state.bestDays = state.day;
                  }
                } catch (e) {}
                try { ctx.memory.record("extinction_days").submit(state.day, { label: "Vector Zero" }); } catch (e) {}
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
