// Plethora Bit · docs and draft upload: https://agent.plethora.studio/v1/agent/start.md
// Penguin Diner — seat penguins, take orders, serve fish, collect tips.
// Original design & implementation for the Plethora Bit runtime (plethora-bit@2).
// All art is drawn procedurally on the canvas; no external assets, code or
// text from any other game is reproduced.

(function () {
  "use strict";

  // Virtual playfield. Everything is laid out in these units and scaled to fit.
  var VW = 720, VH = 480;
  var OUTLINE = "#1b2a35";
  var FONT = "'Trebuchet MS','Comic Sans MS','Segoe UI',sans-serif";

  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function rnd(a, b) { return a + Math.random() * (b - a); }
  function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

  var hexCache = {};
  function hexRgb(h) {
    if (hexCache[h]) return hexCache[h];
    var n = parseInt(h.slice(1), 16);
    var v = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
    hexCache[h] = v;
    return v;
  }
  function mixHex(a, b, t) {
    var A = hexRgb(a), B = hexRgb(b);
    return "rgb(" + Math.round(lerp(A[0], B[0], t)) + "," + Math.round(lerp(A[1], B[1], t)) + "," + Math.round(lerp(A[2], B[2], t)) + ")";
  }

  // ---------------------------------------------------------------------
  // Static data
  // ---------------------------------------------------------------------
  var TABLE_SLOTS = [
    { x: 250, y: 146 }, { x: 540, y: 149 }, { x: 394, y: 245 }, { x: 300, y: 385 },
    { x: 520, y: 350 }, { x: 105, y: 352 }, { x: 618, y: 262 }
  ];
  var TABLE_ORDER = [2, 0, 1, 3, 4, 5, 6];
  var KITCHEN = { x: 592, y: 50, w: 118, h: 70, stand: { x: 648, y: 160 } };
  var TRASH = { x: 493, y: 452, stand: { x: 455, y: 440 } };
  var REGISTER = { x: 626, y: 392 };
  var MAT = { x: -10, y: 214, w: 205, h: 84 };
  var WAITRESS_HOME = { x: 391, y: 308 };

  var DISHES = [
    { name: "Sardines", price: 10, cook: 4.0, color: "#9db8cc", kind: "sardine" },
    { name: "Salmon", price: 16, cook: 5.0, color: "#f2876f", kind: "salmon" },
    { name: "Shrimp Cocktail", price: 24, cook: 6.0, color: "#ffa447", kind: "shrimp" },
    { name: "Lobster Feast", price: 36, cook: 7.5, color: "#d8332a", kind: "lobster" }
  ];

  var CTYPES = {
    reg:     { name: "Regular",  pat: 42, eat: 11, pay: 1.0, tip: 1.0, s: 1.0 },
    biz:     { name: "Business", pat: 29, eat: 7,  pay: 1.2, tip: 1.8, s: 1.0 },
    kid:     { name: "Kid",      pat: 36, eat: 6,  pay: 0.7, tip: 0.6, s: 0.78 },
    vip:     { name: "VIP",      pat: 38, eat: 12, pay: 2.0, tip: 2.5, s: 1.04 },
    tourist: { name: "Tourist",  pat: 46, eat: 10, pay: 1.0, tip: 1.5, s: 1.0 },
    pirate:  { name: "Pirate",   pat: 62, eat: 10, pay: 2.5, tip: 0.5, s: 1.04 },
    critic:  { name: "Critic",   pat: 32, eat: 12, pay: 3.0, tip: 3.0, s: 1.02 }
  };
  var SCARVES = ["#3f9bea", "#e53935", "#ee6fa9", "#43a047", "#8e5bd6", "#f4b400"];

  var HEADLINES = [
    ["CRASHED UFO", "ufo"], ["FISH PRICES SURGE", "fish"], ["ICEBERG SIGHTED", "berg"],
    ["PENGUIN WINS LOTTO", "star"], ["SEA LEVELS: FINE", "wave"], ["SNOW LIKELY", "snow"]
  ];

  var THEMES = [
    { id: "floe", name: "Ice Floe", cost: 0, desc: "The classic frozen diner at sunset.",
      sky: [["#f3a768", "#fbdcab"], ["#6fc0ee", "#dcf2fb"], ["#ee8a5c", "#fcd2a2"]],
      sea: ["#4f94bd", "#2a6f9e"], ground: "#c9e7ef", ground2: "#e5f5f9", rim: "#9fcad8",
      table: "#f7fcff", tableEdge: "#a5d2df", chair: "#1c1e23", mat: "#d9661f", matEdge: "#f2b01e",
      deco: "bergs", snow: false },
    { id: "lagoon", name: "Tropical Lagoon", cost: 250, desc: "Sand, palms and a warm turquoise sea.",
      sky: [["#ffb36b", "#ffe2a8"], ["#4fc3e8", "#d6f6fb"], ["#ff7e6b", "#ffd3a0"]],
      sea: ["#43d1d6", "#1796b4"], ground: "#f1dfab", ground2: "#f9eec9", rim: "#d9bd76",
      table: "#fff7e0", tableEdge: "#cf9f4f", chair: "#5a3a1e", mat: "#2e9e55", matEdge: "#9be07a",
      deco: "palms", snow: false },
    { id: "aurora", name: "Aurora Night", cost: 450, desc: "Dancing lights over a starry polar night.",
      sky: [["#0b1330", "#1d3b6b"], ["#0e1a40", "#23497f"], ["#0a0f2a", "#2a2f6b"]],
      sea: ["#16355c", "#0b2142"], ground: "#9bbbe0", ground2: "#bcd5f2", rim: "#6f93c2",
      table: "#e3f1ff", tableEdge: "#7ea6d6", chair: "#12162b", mat: "#7a3fd0", matEdge: "#c79bff",
      deco: "aurora", snow: false },
    { id: "festival", name: "Winter Festival", cost: 700, desc: "Fairy lights, falling snow and holiday cheer.",
      sky: [["#e8a7a6", "#f7d9cc"], ["#9bb9d6", "#e6eff7"], ["#d98aa0", "#f4cfc4"]],
      sea: ["#5a86ad", "#35618a"], ground: "#eaf2f8", ground2: "#ffffff", rim: "#b7cde0",
      table: "#ffffff", tableEdge: "#d94545", chair: "#143d2b", mat: "#c3262e", matEdge: "#f2c14e",
      deco: "lights", snow: true },
    { id: "candy", name: "Candy Cove", cost: 1000, desc: "A sugary shore of lollipops and sprinkles.",
      sky: [["#ffb7dc", "#ffe3f1"], ["#ff9fd0", "#e6f7ff"], ["#ff8fbf", "#ffe0ec"]],
      sea: ["#b79af0", "#8e6bd8"], ground: "#ffe8f3", ground2: "#fff6fb", rim: "#f6b6d6",
      table: "#fff2fa", tableEdge: "#ff86bd", chair: "#68286e", mat: "#2fc4c4", matEdge: "#9af2e8",
      deco: "candy", snow: false }
  ];

  var SHIPS = [
    { id: "freighter", name: "Red Freighter", cost: 0, perk: "Cargo discount: +8% on every dish price." },
    { id: "icebreaker", name: "Icebreaker", cost: 300, perk: "Warm cabins: customers are 25% more patient." },
    { id: "submarine", name: "Yellow Submarine", cost: 550, perk: "Deep-sea fishing: kitchen cooks 25% faster." },
    { id: "cruise", name: "Cruise Liner", cost: 800, perk: "Tour groups: every ~45s two tourists arrive and tip +50%." },
    { id: "galleon", name: "Pirate Galleon", cost: 1100, perk: "Pirates drop in (pay 2.5x). Everyone waits 10% longer." },
    { id: "yacht", name: "Royal Yacht", cost: 1600, perk: "+35% tips and more VIP guests." },
    { id: "ufo", name: "Crashed UFO", cost: 2500, perk: "Alien tech: drops a free random boost every ~45s." }
  ];

  var UPGRADES = [
    { id: "skates", name: "Speed Skates", icon: "skate", max: 5, cost: [40, 80, 140, 220, 340], desc: "Waitress glides faster (+14% per level)." },
    { id: "tray", name: "Bigger Tray", icon: "tray", max: 3, cost: [60, 140, 280], desc: "Carry one more dish per trip." },
    { id: "tables", name: "Extra Table", icon: "table", max: 4, cost: [90, 180, 320, 520], desc: "Add another table to the dining floor." },
    { id: "stoves", name: "Extra Fish Fryer", icon: "stove", max: 3, cost: [80, 170, 300], desc: "Cook more orders at the same time." },
    { id: "chef", name: "Pro Chef", icon: "chef", max: 5, cost: [50, 100, 170, 260, 400], desc: "Cooking time -10% per level." },
    { id: "cushions", name: "Cozy Cushions", icon: "heart", max: 5, cost: [45, 95, 160, 250, 380], desc: "Customers are 10% more patient per level." },
    { id: "tipjar", name: "Big Tip Jar", icon: "coin", max: 5, cost: [50, 110, 190, 300, 450], desc: "Tips +15% per level." },
    { id: "menu", name: "Fancier Menu", icon: "fish", max: 3, cost: [100, 260, 520], desc: "Unlock Salmon, Shrimp, then Lobster dishes." },
    { id: "bench", name: "Longer Waiting Mat", icon: "mat", max: 2, cost: [70, 160], desc: "Room for more penguins in line." },
    { id: "neon", name: "Neon Sign", icon: "star", max: 4, cost: [60, 130, 230, 380], desc: "Customers show up 12% more often per level." },
    { id: "shift", name: "Longer Shift", icon: "clock", max: 3, cost: [90, 200, 350], desc: "Each shift lasts 10 seconds longer per level." },
    { id: "busboy", name: "Busboy Bernie", icon: "bucket", max: 2, cost: [150, 320], desc: "A helper clears dirty tables (slowly, then quickly)." },
    { id: "host", name: "Host Penguin", icon: "bell", max: 1, cost: [220], desc: "Automatically seats waiting customers." }
  ];

  var BOOSTS = [
    { id: "freeze", name: "Ice Freeze", icon: "freeze", cost: 40, desc: "Freezes every customer's patience for 10 seconds." },
    { id: "turbo", name: "Turbo Skates", icon: "bolt", cost: 35, desc: "Waitress moves twice as fast for 15 seconds." },
    { id: "golden", name: "Golden Hour", icon: "star", cost: 90, desc: "All payments are doubled for 15 seconds." },
    { id: "cocoa", name: "Hot Cocoa", icon: "cup", cost: 55, desc: "Instantly refills every customer's patience." },
    { id: "flyer", name: "Coupon Flyers", icon: "flyer", cost: 45, desc: "Instantly summons up to three hungry customers." }
  ];

  // ---------------------------------------------------------------------
  // Save data
  // ---------------------------------------------------------------------
  function defaultSave() {
    return {
      bank: 0, day: 1, bestDay: 1, totalEarned: 0, bestShift: 0,
      up: {}, boosts: { freeze: 1, turbo: 1, golden: 0, cocoa: 1, flyer: 0 },
      themes: { floe: 1 }, theme: "floe", ships: { freighter: 1 }, ship: "freighter",
      music: true, stars: {}
    };
  }
  function sanitizeSave(raw) {
    var d = defaultSave();
    if (!raw || typeof raw !== "object") return d;
    var k;
    for (k in d) if (raw[k] !== undefined && typeof raw[k] === typeof d[k]) d[k] = raw[k];
    return d;
  }

  function goalFor(day) { return Math.round((70 + 40 * day + 6 * Math.pow(day, 1.6)) / 10) * 10; }

  function byId(list, id) {
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return list[0];
  }

  // ---------------------------------------------------------------------
  // Plethora Bit entry
  // ---------------------------------------------------------------------
  window.plethoraBit = {
    meta: { name: "Penguin Diner" },
    async init(ctx) {
      var canvasEl = ctx.createCanvas2D({ touchAction: "none", coordinateSpace: "css", maxDpr: 2 });
      var g = canvasEl.getContext("2d");

      function W() { return ctx.width || (canvasEl && canvasEl.width) || 360; }
      function H() { return ctx.height || (canvasEl && canvasEl.height) || 640; }

      var save = defaultSave();
      try {
        save = sanitizeSave(ctx.storage.get("pd_save"));
      } catch (e) { save = defaultSave(); }
      function persist() { try { ctx.storage.set("pd_save", save); } catch (e) {} }
      function haptic(kind) { try { ctx.platform.haptic(kind); } catch (e) {} }

      var screen = "title";   // title | shop | play | results
      var paused = false;
      var G = null;           // the current shift
      var D = null;           // derived stats for the current shift
      var clockT = 0;
      var hitRegions = [];
      var shop = { tab: "up", scroll: 0, from: "title" };
      var drag = { on: false, y0: 0, s0: 0, moved: false };
      var scale = 1, offX = 0, offY = 0;
      var toast = { text: "", t: 0 };
      var score = null;
      try { score = ctx.game.score(); } catch (e) {}
      function setScore(v) { try { if (score) score.set(Math.round(v)); } catch (e) {} }

      function lvl(id) { return save.up[id] || 0; }
      function theme() { return byId(THEMES, save.theme); }
      function shipId() { return save.ship; }

      function derive() {
        var sid = shipId();
        return {
          speed: 150 * (1 + 0.14 * lvl("skates")),
          cap: 2 + lvl("tray"),
          tables: 3 + lvl("tables"),
          stoves: 2 + lvl("stoves"),
          cookMult: (1 - 0.1 * lvl("chef")) * (sid === "submarine" ? 0.75 : 1),
          patMult: 1 + 0.1 * lvl("cushions") + (sid === "icebreaker" ? 0.25 : 0) + (sid === "galleon" ? 0.1 : 0),
          tipMult: 1 + 0.15 * lvl("tipjar") + (sid === "yacht" ? 0.35 : 0),
          priceMult: 1 + (sid === "freighter" ? 0.08 : 0),
          menu: lvl("menu"),
          bench: 4 + lvl("bench"),
          spawnMult: 1 + 0.12 * lvl("neon"),
          dayLen: 120 + 10 * lvl("shift"),
          busboy: lvl("busboy") === 0 ? 0 : (lvl("busboy") === 1 ? 6 : 2.5),
          host: lvl("host") > 0
        };
      }

      function toastMsg(s) { toast.text = s; toast.t = 2.2; }

      // -------------------------------------------------------------------
      // Shift setup
      // -------------------------------------------------------------------
      function newShift(day) {
        D = derive();
        var tables = [];
        for (var i = 0; i < D.tables; i++) {
          var sl = TABLE_SLOTS[TABLE_ORDER[i]];
          tables.push({ id: i, x: sl.x, y: sl.y, state: "free", cust: null, pay: 0, cleanT: 0, glow: 0, dish: null });
        }
        G = {
          day: day, goal: goalFor(day), time: 0, dayLen: D.dayLen, earned: 0, state: "ready",
          customers: [], tables: tables, cook: [], ready: [], nextId: 1,
          w: { x: WAITRESS_HOME.x, y: WAITRESS_HOME.y, face: 1, actions: [], cur: null, busy: 0, dishes: [], tickets: [], walk: 0, moving: false, mode: "" },
          spawnT: 2.5, floats: [], combo: 0, served: 0, lost: 0, tips: 0, selected: null,
          freeze: 0, turbo: 0, golden: 0, shipT: 0, shipEvT: 12, otLeft: 0, t: 0,
          critic: day >= 5 && day % 5 === 0, criticDone: false, announce: "", announceT: 0,
          regBump: 0, headline: 0, headT: 0, stars: 0, bonus: 0, success: false, tipsEarned: 0
        };
        paused = false;
      }

      function say(text) { if (G) { G.announce = text; G.announceT = 2.6; } }

      // -------------------------------------------------------------------
      // Customers
      // -------------------------------------------------------------------
      function queueList() {
        var out = [];
        for (var i = 0; i < G.customers.length; i++) {
          var c = G.customers[i];
          if (c.state === "enter" || c.state === "queue") out.push(c);
        }
        return out;
      }
      function slotPos(i) { return { x: 172 - i * 34, y: 258 + (i % 2) * 6 }; }

      function chooseType(forced) {
        if (forced) return forced;
        var d = G.day, r = Math.random();
        var sid = shipId();
        if (G.critic && !G.criticDone && G.time > G.dayLen * 0.4) { G.criticDone = true; return "critic"; }
        var vipChance = (d >= 4 ? 0.06 : 0) + (sid === "yacht" ? 0.1 : 0);
        var pirateChance = sid === "galleon" ? 0.1 : 0;
        if (r < pirateChance) return "pirate";
        if (r < pirateChance + vipChance) return "vip";
        if (d >= 2 && Math.random() < 0.22) return "biz";
        if (d >= 3 && Math.random() < 0.2) return "kid";
        return "reg";
      }

      function pickDish() {
        var top = D.menu;
        if (top > 0 && Math.random() < 0.55) return top;
        return Math.floor(Math.random() * (top + 1));
      }

      function spawnCustomer(forcedType) {
        if (queueList().length >= D.bench) return null;
        var type = chooseType(forcedType);
        var T = CTYPES[type];
        var q = queueList();
        var pm = T.pat * D.patMult * clamp(1 - G.day * 0.012, 0.65, 1);
        var c = {
          id: G.nextId++, type: type, x: -40, y: 258, tx: 0, ty: 0, state: "enter",
          table: null, side: 1, pmax: pm, pat: pm, dish: pickDish(), eat: 0, face: 1, walk: 0, moving: true,
          scarf: pick(SCARVES), pay: 0, tip: 0, dead: false, fade: 1, askPulse: Math.random() * 6
        };
        var sp = slotPos(q.length);
        c.tx = sp.x; c.ty = sp.y;
        G.customers.push(c);
        return c;
      }

      function spawnInterval() {
        var base = Math.max(4.8, 9.5 - 0.4 * G.day);
        var p = G.time / G.dayLen;
        if (p > 0.4 && p < 0.6) base *= 0.65;    // lunch rush
        return rnd(0.75, 1.25) * base / D.spawnMult;
      }

      function seatCustomer(c, t) {
        t.state = "taken"; t.cust = c; c.table = t;
        c.side = Math.random() < 0.5 ? -1 : 1;
        c.tx = t.x + c.side * 76; c.ty = t.y + 24;
        c.state = "toSeat";
        if (G.selected === c) G.selected = null;
        haptic("light");
      }

      function removeFromKitchen(c) {
        var i, w = G.w;
        for (i = G.cook.length - 1; i >= 0; i--) if (G.cook[i].c === c) G.cook.splice(i, 1);
        for (i = G.ready.length - 1; i >= 0; i--) if (G.ready[i].c === c) G.ready.splice(i, 1);
        for (i = w.dishes.length - 1; i >= 0; i--) if (w.dishes[i].c === c) w.dishes.splice(i, 1);
        for (i = w.tickets.length - 1; i >= 0; i--) if (w.tickets[i].c === c) w.tickets.splice(i, 1);
      }

      function floatText(x, y, text, color, size) {
        G.floats.push({ x: x, y: y, text: text, color: color || "#fff", life: 1.3, size: size || 18 });
      }

      function angryLeave(c) {
        c.state = "leaving"; c.angry = true;
        removeFromKitchen(c);
        if (c.table) {
          c.table.cust = null;
          c.table.state = c.table.state === "taken" ? "free" : c.table.state;
          c.table = null;
        }
        if (G.selected === c) G.selected = null;
        c.tx = -60; c.ty = c.y + 30;
        G.lost++; G.combo = 0;
        floatText(c.x, c.y - 90, "Angry!", "#ff5a4d", 18);
        haptic("warning");
        if (c.type === "critic") {
          G.earned = Math.max(0, G.earned - 50); setScore(G.earned);
          say("THE CRITIC STORMS OUT! -$50");
        }
      }

      function finishEating(c) {
        var t = c.table;
        c.state = "leaving";
        if (t) {
          t.cust = null; t.state = "dirty"; t.pay = c.pay + c.tip; t.cleanT = D.busboy; t.dish = null;
        }
        c.table = null;
        c.tx = -60; c.ty = c.y + 40;
      }

      function updateCustomer(c, dt) {
        var dx = c.tx - c.x, dy = c.ty - c.y, dist = Math.hypot(dx, dy);
        var sp = c.state === "leaving" ? 160 : 135;
        if (dist > 1.5) {
          var st = Math.min(dist, sp * dt);
          c.x += dx / dist * st; c.y += dy / dist * st;
          if (Math.abs(dx) > 2) c.face = dx >= 0 ? 1 : -1;
          c.walk += dt * 11; c.moving = true;
        } else { c.moving = false; }

        var frozen = G.freeze > 0;
        switch (c.state) {
          case "enter":
            if (!c.moving) c.state = "queue";
            if (!frozen) c.pat -= dt * 0.6;
            break;
          case "queue":
            if (!frozen) c.pat -= dt * 0.6;
            break;
          case "toSeat":
            if (!c.moving) { c.state = "seated"; c.face = -c.side; }
            break;
          case "seated":
            if (!frozen) c.pat -= dt * 1.0;
            break;
          case "ordered":
            if (!frozen) c.pat -= dt * 0.85;
            break;
          case "eating":
            c.eat -= dt;
            if (c.eat <= 0) finishEating(c);
            break;
          case "leaving":
            c.fade = clamp(c.fade - dt * (c.x < 20 ? 3 : 0.3), 0, 1);
            if (c.x <= -50 || c.fade <= 0) c.dead = true;
            break;
        }
        if ((c.state === "enter" || c.state === "queue" || c.state === "seated" || c.state === "ordered") && c.pat <= 0) angryLeave(c);
      }

      // -------------------------------------------------------------------
      // Waitress actions
      // -------------------------------------------------------------------
      function addAction(a) {
        var w = G.w;
        if (w.actions.length >= 4) return;
        var last = w.actions.length ? w.actions[w.actions.length - 1] : w.cur;
        if (last && last.k === a.k && last.t === a.t) return;
        w.actions.push(a);
      }

      function standPoint(a) {
        if (a.k === "table") return { x: a.t.x, y: a.t.y + 52 };
        if (a.k === "kitchen") return KITCHEN.stand;
        return TRASH.stand;
      }

      function beginAction(a) {
        var w = G.w, t = a.t, c = t && t.cust;
        if (a.k === "table") {
          if (t.state === "dirty") { a.mode = "clean"; w.busy = 1.0; return; }
          if (c && c.state === "seated") { a.mode = "order"; w.busy = 0.6; return; }
          if (c && c.state === "ordered") {
            for (var i = 0; i < w.dishes.length; i++) if (w.dishes[i].c === c) { a.mode = "serve"; w.busy = 0.4; return; }
          }
          w.cur = null; return;
        }
        if (a.k === "kitchen") { a.mode = "kitchen"; w.busy = 0.5; return; }
        a.mode = "trash"; w.busy = 0.4;
      }

      function collectTable(t) {
        var amt = t.pay * (G.golden > 0 ? 2 : 1);
        G.earned += amt; G.regBump = 1; setScore(G.earned);
        try { ctx.music.sting("coin"); } catch (e) {}
        floatText(t.x, t.y - 30, "+$" + amt, "#ffe14a", 20);
        t.pay = 0; t.state = "free"; t.cleanT = 0;
        haptic("success");
      }

      function finishAction(a) {
        var w = G.w, t = a.t, c = t && t.cust, i;
        w.cur = null;
        if (a.mode === "clean") {
          if (t.state === "dirty") collectTable(t);
        } else if (a.mode === "order") {
          if (c && c.state === "seated") {
            c.state = "ordered";
            w.tickets.push({ c: c });
          }
        } else if (a.mode === "serve") {
          if (c && c.state === "ordered") {
            for (i = 0; i < w.dishes.length; i++) {
              if (w.dishes[i].c === c) {
                w.dishes.splice(i, 1);
                serve(c, t);
                break;
              }
            }
          }
        } else if (a.mode === "kitchen") {
          for (i = 0; i < w.tickets.length; i++) {
            var tk = w.tickets[i];
            if (tk.c.dead || tk.c.state !== "ordered") continue;
            G.cook.push({ c: tk.c, left: DISHES[tk.c.dish].cook * D.cookMult });
          }
          w.tickets = [];
          while (G.ready.length && w.dishes.length < D.cap) {
            var r = G.ready.shift();
            if (!r.c.dead && r.c.state === "ordered") w.dishes.push({ c: r.c });
          }
        } else if (a.mode === "trash") {
          if (w.dishes.length) {
            for (i = 0; i < w.dishes.length; i++) {
              var oc = w.dishes[i].c;
              if (oc && oc.state === "ordered") {
                // dish dumped: customer must be re-ticketed
                w.tickets.push({ c: oc });
              }
            }
            w.dishes = [];
            floatText(TRASH.x, TRASH.y - 40, "Trashed", "#cfd8dc", 14);
          }
        }
      }

      function serve(c, t) {
        var T = CTYPES[c.type];
        var frac = clamp(c.pat / c.pmax, 0, 1);
        var base = DISHES[c.dish].price * T.pay * D.priceMult;
        c.pay = Math.round(base);
        var comboMult = 1 + Math.min(G.combo, 10) * 0.05;
        c.tip = Math.round(base * (0.1 + 0.55 * frac) * T.tip * D.tipMult * comboMult);
        if (c.type === "tourist") c.tip = Math.round(c.tip * 1.5);
        if (c.type === "critic") {
          if (frac > 0.35) { c.tip += 100; say("THE CRITIC LOVES IT! +$100"); }
          else say("The critic is unimpressed...");
        }
        if (frac > 0.4) G.combo++; else G.combo = 0;
        G.served++; G.tipsEarned += c.tip;
        c.state = "eating";
        c.eat = T.eat * rnd(0.9, 1.1);
        t.state = "occupied"; t.dish = c.dish;
        floatText(t.x, t.y - 40, "Yum!", "#fff3b0", 16);
        if (G.combo >= 3) floatText(t.x, t.y - 62, "x" + G.combo + " combo", "#7be0ff", 14);
      }

      function updateWaitress(dt) {
        var w = G.w;
        if (w.busy > 0) {
          w.busy -= dt; w.moving = false;
          if (w.busy <= 0) { var a = w.cur; if (a) finishAction(a); }
          return;
        }
        if (!w.cur) {
          w.cur = w.actions.shift() || null;
          if (w.cur) w.cur.began = false;
        }
        if (!w.cur) { w.moving = false; return; }
        var p = standPoint(w.cur);
        var dx = p.x - w.x, dy = p.y - w.y, dist = Math.hypot(dx, dy);
        var spd = D.speed * (G.turbo > 0 ? 2 : 1);
        if (dist > 3) {
          var st = Math.min(dist, spd * dt);
          w.x += dx / dist * st; w.y += dy / dist * st;
          if (Math.abs(dx) > 2) w.face = dx > 0 ? 1 : -1;
          w.walk += dt * 12 * (spd / 150); w.moving = true;
        } else {
          w.moving = false;
          beginAction(w.cur);
        }
      }

      // -------------------------------------------------------------------
      // Day update
      // -------------------------------------------------------------------
      function update(dt) {
        clockT += dt;
        if (toast.t > 0) toast.t -= dt;
        if (!G) return;
        G.t += dt;
        G.regBump = Math.max(0, G.regBump - dt * 3);
        G.headT += dt;
        if (G.headT > 8) { G.headT = 0; G.headline = (G.headline + 1) % HEADLINES.length; }
        for (var f = G.floats.length - 1; f >= 0; f--) {
          var fl = G.floats[f];
          fl.life -= dt; fl.y -= 26 * dt;
          if (fl.life <= 0) G.floats.splice(f, 1);
        }
        if (G.announceT > 0) G.announceT -= dt;
        G.shipT += dt;

        if (screen !== "play" || paused || G.state === "ready" || G.state === "done") return;

        G.time += dt;
        G.freeze = Math.max(0, G.freeze - dt);
        G.turbo = Math.max(0, G.turbo - dt);
        G.golden = Math.max(0, G.golden - dt);

        if (G.state === "run" && G.time >= G.dayLen) {
          G.state = "overtime"; G.otLeft = 25; say("CLOSING TIME - finish your last orders!");
        }
        if (G.state === "overtime") {
          G.otLeft -= dt;
          if (G.customers.length === 0 || G.otLeft <= 0) { endShift(); return; }
        }

        if (G.state === "run") {
          G.spawnT -= dt;
          if (G.spawnT <= 0) { spawnCustomer(); G.spawnT = spawnInterval(); }
          G.shipEvT -= dt;
          if (G.shipEvT <= 0) { G.shipEvT = 45; shipEvent(); }
        }

        // queue positions
        var q = queueList(), i;
        for (i = 0; i < q.length; i++) {
          var sp = slotPos(i);
          q[i].tx = sp.x; q[i].ty = sp.y;
        }
        for (i = 0; i < G.customers.length; i++) updateCustomer(G.customers[i], dt);
        for (i = G.customers.length - 1; i >= 0; i--) if (G.customers[i].dead) G.customers.splice(i, 1);

        // kitchen
        var active = Math.min(D.stoves, G.cook.length);
        for (i = active - 1; i >= 0; i--) {
          var ck = G.cook[i];
          ck.left -= dt;
          if (ck.left <= 0) {
            G.cook.splice(i, 1);
            if (!ck.c.dead && ck.c.state === "ordered") G.ready.push({ c: ck.c });
          }
        }

        // helpers
        for (i = 0; i < G.tables.length; i++) {
          var tb = G.tables[i];
          tb.glow = G.selected && tb.state === "free" ? 1 : 0;
          if (tb.state === "dirty" && D.busboy > 0) {
            tb.cleanT -= dt;
            if (tb.cleanT <= 0) collectTable(tb);
          }
        }
        if (D.host) {
          G.hostT = (G.hostT || 0) - dt;
          if (G.hostT <= 0) {
            G.hostT = 1.4;
            var first = queueList().filter(function (c) { return c.state === "queue"; })[0];
            var free = freeTable();
            if (first && free) seatCustomer(first, free);
          }
        }

        updateWaitress(dt);
      }

      function freeTable() {
        for (var i = 0; i < G.tables.length; i++) if (G.tables[i].state === "free") return G.tables[i];
        return null;
      }

      function shipEvent() {
        var sid = shipId();
        if (sid === "cruise") {
          say("TOUR GROUP ARRIVING!");
          spawnCustomer("tourist"); spawnCustomer("tourist");
        } else if (sid === "galleon") {
          if (Math.random() < 0.6) { say("A PIRATE DROPS IN!"); spawnCustomer("pirate"); }
        } else if (sid === "ufo") {
          var b = pick(BOOSTS);
          save.boosts[b.id] = Math.min(9, (save.boosts[b.id] || 0) + 1);
          persist();
          say("ALIEN GIFT: +1 " + b.name.toUpperCase());
        }
      }

      function useBoost(id) {
        if (!G || (G.state !== "run" && G.state !== "overtime") || paused) return;
        if ((save.boosts[id] || 0) <= 0) { toastMsg("None left - buy more in the shop"); return; }
        save.boosts[id]--;
        if (id === "freeze") { G.freeze = 10; say("ICE FREEZE!"); }
        else if (id === "turbo") { G.turbo = 15; say("TURBO SKATES!"); }
        else if (id === "golden") { G.golden = 15; say("GOLDEN HOUR - DOUBLE MONEY!"); }
        else if (id === "cocoa") {
          for (var i = 0; i < G.customers.length; i++) G.customers[i].pat = G.customers[i].pmax;
          say("HOT COCOA FOR EVERYONE!");
        } else if (id === "flyer") {
          for (var n = 0; n < 3; n++) spawnCustomer();
          say("FLYERS OUT - HERE THEY COME!");
        }
        persist(); haptic("success");
        try { ctx.platform.interact({ boost: id }); } catch (e) {}
      }

      function startShift() {
        if (!G || G.state !== "ready") return;
        G.state = "run"; G.spawnT = 1.2;
        setScore(0);
        try { ctx.platform.start({ day: G.day, goal: G.goal }); } catch (e) {}
        playMusic();
        haptic("light");
      }

      function endShift() {
        G.state = "done";
        G.success = G.earned >= G.goal;
        G.stars = G.success ? (G.earned >= G.goal * 1.7 ? 3 : (G.earned >= G.goal * 1.3 ? 2 : 1)) : 0;
        G.bonus = G.stars > 1 ? (G.stars - 1) * 40 + G.day * 5 : 0;
        var pay = G.success ? G.earned + G.bonus : Math.floor(G.earned * 0.5);
        G.banked = pay;
        save.bank += pay;
        save.totalEarned += G.earned;
        if (G.earned > save.bestShift) save.bestShift = G.earned;
        if (G.success) {
          save.day = Math.max(save.day, G.day + 1);
          save.bestDay = Math.max(save.bestDay, G.day);
          var old = save.stars[G.day] || 0;
          if (G.stars > old) save.stars[G.day] = G.stars;
        }
        persist();
        screen = "results";
        setScore(G.earned);
        try { ctx.platform.milestone("day_" + G.day + (G.success ? "_cleared" : "_failed")); } catch (e) {}
        if (G.success) {
          try { ctx.music.sting("success"); } catch (e) {}
          try { ctx.platform.complete({ day: G.day, earned: G.earned, stars: G.stars }); } catch (e) {}
          try { ctx.memory.record("day_reached").submit(G.day, { label: "Day " + G.day }); } catch (e) {}
        } else {
          try { ctx.music.sting("fail"); } catch (e) {}
          try { ctx.platform.fail({ day: G.day, earned: G.earned }); } catch (e) {}
        }
        try { ctx.memory.record("best_shift_earnings").submit(G.earned, { label: "Day " + G.day }); } catch (e) {}
      }

      // -------------------------------------------------------------------
      // Drawing helpers
      // -------------------------------------------------------------------
      function hit(x0, y0, x1, y1, fn) { hitRegions.push({ x0: x0, y0: y0, x1: x1, y1: y1, fn: fn }); }

      function txt(s, x, y, size, color, align, o) {
        o = o || {};
        g.font = (o.w || "800") + " " + size + "px " + FONT;
        g.textAlign = align || "left";
        g.textBaseline = "alphabetic";
        if (o.stroke) { g.lineWidth = o.lw || 3.5; g.strokeStyle = o.stroke; g.lineJoin = "round"; g.strokeText(s, x, y); }
        g.fillStyle = color; g.fillText(s, x, y);
      }

      function rr(x, y, w, h, r) {
        r = Math.min(r, w / 2, h / 2);
        g.beginPath();
        g.moveTo(x + r, y);
        g.arcTo(x + w, y, x + w, y + h, r);
        g.arcTo(x + w, y + h, x, y + h, r);
        g.arcTo(x, y + h, x, y, r);
        g.arcTo(x, y, x + w, y, r);
        g.closePath();
      }

      function ell(x, y, rx, ry, fill, stroke, lw) {
        g.beginPath();
        g.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), 0, 0, Math.PI * 2);
        if (fill) { g.fillStyle = fill; g.fill(); }
        if (stroke) { g.lineWidth = lw || 2; g.strokeStyle = stroke; g.stroke(); }
      }

      function button(x, y, w, h, label, o) {
        o = o || {};
        var col = o.disabled ? "#7e8f9a" : (o.color || "#f5a623");
        var dark = o.disabled ? "#5a6a74" : (o.dark || "#b8690b");
        rr(x, y + 4, w, h, 10); g.fillStyle = dark; g.fill();
        rr(x, y, w, h, 10); g.fillStyle = col; g.fill();
        g.lineWidth = 2.5; g.strokeStyle = OUTLINE; g.stroke();
        rr(x + 4, y + 3, w - 8, h * 0.4, 7); g.fillStyle = "rgba(255,255,255,0.28)"; g.fill();
        txt(label, x + w / 2, y + h / 2 + (o.size || 17) * 0.35, o.size || 17, "#ffffff", "center", { stroke: OUTLINE, lw: 4 });
        if (!o.disabled && o.fn) hit(x, y, x + w, y + h, o.fn);
      }

      function panel(x, y, w, h, fill) {
        rr(x, y, w, h, 12); g.fillStyle = fill || "rgba(20,40,60,0.88)"; g.fill();
        g.lineWidth = 2.5; g.strokeStyle = OUTLINE; g.stroke();
      }

      // ---------------- icons ----------------
      function icon(kind, x, y, s) {
        g.save(); g.translate(x, y); g.scale(s, s);
        g.lineWidth = 2; g.strokeStyle = OUTLINE; g.lineJoin = "round";
        switch (kind) {
          case "skate":
            rr(-10, -10, 14, 16, 3); g.fillStyle = "#e8f1f7"; g.fill(); g.stroke();
            rr(-10, 4, 24, 5, 2); g.fillStyle = "#c7d3dc"; g.fill(); g.stroke();
            g.beginPath(); g.moveTo(-12, 12); g.lineTo(15, 12); g.stroke(); break;
          case "tray":
            ell(0, 4, 15, 5, "#c68a4a", OUTLINE, 2); ell(0, 0, 12, 4, "#f0b36a", OUTLINE, 2);
            ell(-3, -4, 6, 3, "#f2876f", OUTLINE, 1.5); break;
          case "table":
            ell(0, -4, 15, 6, "#f7fcff", OUTLINE, 2); g.fillStyle = "#9fb6c4"; g.fillRect(-2, -2, 4, 12); ell(0, 11, 8, 3, "#9fb6c4", OUTLINE, 1.5); break;
          case "stove":
            rr(-13, -6, 26, 16, 3); g.fillStyle = "#6c7a86"; g.fill(); g.stroke();
            g.fillStyle = "#ff8a1f"; g.beginPath(); g.moveTo(-6, -6); g.quadraticCurveTo(-2, -16, 0, -6); g.quadraticCurveTo(4, -14, 7, -6); g.fill(); break;
          case "chef":
            ell(0, -6, 11, 8, "#fff", OUTLINE, 2); rr(-8, -2, 16, 11, 2); g.fillStyle = "#fff"; g.fill(); g.stroke(); break;
          case "heart":
            g.beginPath(); g.moveTo(0, 10); g.bezierCurveTo(-18, -2, -8, -14, 0, -5); g.bezierCurveTo(8, -14, 18, -2, 0, 10);
            g.fillStyle = "#ee5b82"; g.fill(); g.stroke(); break;
          case "coin":
            ell(0, 0, 12, 12, "#ffcf33", OUTLINE, 2); txt("$", 0, 6, 15, "#a86a00", "center"); break;
          case "fish":
            ell(-2, 0, 12, 7, "#9db8cc", OUTLINE, 2);
            g.beginPath(); g.moveTo(8, 0); g.lineTo(16, -7); g.lineTo(16, 7); g.closePath(); g.fillStyle = "#9db8cc"; g.fill(); g.stroke();
            ell(-8, -2, 1.6, 1.6, "#1b2a35"); break;
          case "mat":
            rr(-14, -7, 28, 14, 3); g.fillStyle = "#d9661f"; g.fill(); g.stroke();
            g.strokeStyle = "#f2b01e"; g.strokeRect(-11, -4, 22, 8); break;
          case "star":
            starPath(0, 0, 13, 5.5); g.fillStyle = "#ffd23f"; g.fill(); g.strokeStyle = OUTLINE; g.stroke(); break;
          case "clock":
            ell(0, 0, 12, 12, "#fff", OUTLINE, 2);
            g.beginPath(); g.moveTo(0, 0); g.lineTo(0, -8); g.moveTo(0, 0); g.lineTo(6, 3); g.stroke(); break;
          case "bucket":
            g.beginPath(); g.moveTo(-10, -8); g.lineTo(10, -8); g.lineTo(7, 10); g.lineTo(-7, 10); g.closePath();
            g.fillStyle = "#4aa3d8"; g.fill(); g.stroke(); ell(0, -8, 10, 3, "#8fd0f0", OUTLINE, 1.5); break;
          case "bell":
            g.beginPath(); g.moveTo(-11, 8); g.quadraticCurveTo(-11, -12, 0, -12); g.quadraticCurveTo(11, -12, 11, 8); g.closePath();
            g.fillStyle = "#ffcf33"; g.fill(); g.stroke(); ell(0, 10, 3, 3, "#ffcf33", OUTLINE, 1.5); break;
          case "freeze":
            g.strokeStyle = "#bdeaff"; g.lineWidth = 3;
            for (var a = 0; a < 3; a++) {
              var an = a * Math.PI / 3;
              g.beginPath(); g.moveTo(Math.cos(an) * -12, Math.sin(an) * -12); g.lineTo(Math.cos(an) * 12, Math.sin(an) * 12); g.stroke();
            }
            break;
          case "bolt":
            g.beginPath(); g.moveTo(3, -13); g.lineTo(-8, 3); g.lineTo(-1, 3); g.lineTo(-4, 13); g.lineTo(9, -3); g.lineTo(1, -3); g.closePath();
            g.fillStyle = "#ffd23f"; g.fill(); g.stroke(); break;
          case "cup":
            rr(-9, -7, 16, 16, 3); g.fillStyle = "#fff"; g.fill(); g.stroke();
            g.beginPath(); g.arc(8, 1, 5, -1.4, 1.4); g.stroke(); ell(-1, -5, 7, 2.2, "#8b4b24"); break;
          case "flyer":
            rr(-10, -12, 20, 24, 2); g.fillStyle = "#fff6cf"; g.fill(); g.stroke();
            g.fillStyle = "#d9661f"; g.fillRect(-6, -8, 12, 4); g.fillRect(-6, -1, 12, 2); g.fillRect(-6, 4, 8, 2); break;
        }
        g.restore();
      }

      function starPath(cx, cy, ro, ri) {
        g.beginPath();
        for (var i = 0; i < 10; i++) {
          var r = i % 2 === 0 ? ro : ri, a = -Math.PI / 2 + i * Math.PI / 5;
          var px = cx + Math.cos(a) * r, py = cy + Math.sin(a) * r;
          if (i === 0) g.moveTo(px, py); else g.lineTo(px, py);
        }
        g.closePath();
      }

      // ---------------- dishes ----------------
      function drawDish(idx, x, y, s) {
        var d = DISHES[idx];
        g.save(); g.translate(x, y); g.scale(s, s);
        ell(0, 2, 15, 6, "#f2f6f8", OUTLINE, 2);
        g.lineWidth = 2; g.strokeStyle = OUTLINE;
        switch (d.kind) {
          case "sardine":
            ell(-2, -3, 10, 4.5, d.color, OUTLINE, 1.8);
            g.beginPath(); g.moveTo(7, -3); g.lineTo(13, -8); g.lineTo(13, 2); g.closePath(); g.fillStyle = d.color; g.fill(); g.stroke(); break;
          case "salmon":
            ell(0, -4, 12, 5.5, d.color, OUTLINE, 1.8); g.strokeStyle = "#fff"; g.beginPath(); g.moveTo(-8, -5); g.lineTo(8, -5); g.moveTo(-8, -2); g.lineTo(8, -2); g.stroke(); break;
          case "shrimp":
            g.beginPath(); g.arc(0, -4, 8, Math.PI * 1.1, Math.PI * 2.1); g.lineWidth = 5; g.strokeStyle = d.color; g.stroke();
            g.lineWidth = 1.6; g.strokeStyle = OUTLINE; g.beginPath(); g.arc(0, -4, 10.5, Math.PI * 1.1, Math.PI * 2.1); g.stroke(); break;
          case "lobster":
            ell(0, -4, 11, 5, d.color, OUTLINE, 1.8); ell(-11, -6, 4, 3, d.color, OUTLINE, 1.5); ell(11, -6, 4, 3, d.color, OUTLINE, 1.5); break;
        }
        g.restore();
      }

      // ---------------- penguins ----------------
      function drawPenguin(x, y, o) {
        var s = o.s || 1;
        var bob = o.moving ? Math.abs(Math.sin(o.walk || 0)) * 3 : 0;
        var sway = o.moving ? Math.sin((o.walk || 0)) * 0.06 : 0;
        g.save();
        g.translate(x, y);
        g.globalAlpha = o.alpha === undefined ? 1 : o.alpha;
        g.scale(s * (o.face || 1), s);
        if (o.shadow !== false) ell(0, 2, 22, 6, "rgba(20,50,70,0.22)");
        g.rotate(sway);
        var sit = o.sit ? 14 : 0;
        // feet
        if (!o.sit) {
          var f1 = o.moving ? Math.sin(o.walk) * 4 : 0;
          ell(-10 + f1, -3, 11, 5, "#ffa21f", OUTLINE, 2);
          ell(11 - f1, -3, 11, 5, "#ffa21f", OUTLINE, 2);
        } else {
          ell(14, -2 + 0, 11, 5, "#ffa21f", OUTLINE, 2);
        }
        // body
        var by = -40 + sit - bob;
        ell(0, by, 25, 38 - sit * 0.5, o.body || "#3a3e47", OUTLINE, 2.5);
        // belly
        ell(5, by + 8, 15, 26 - sit * 0.5, o.belly || "#ffffff", null);
        // apron
        if (o.apron) {
          rr(-4, by + 2, 25, 30 - sit * 0.4, 8); g.fillStyle = o.apron; g.fill(); g.lineWidth = 2; g.strokeStyle = OUTLINE; g.stroke();
          g.beginPath(); g.arc(8, by + 3, 7, 0, Math.PI, true); g.strokeStyle = OUTLINE; g.stroke();
        }
        // arm
        var armSwing = o.moving ? Math.sin(o.walk) * 0.25 : 0;
        g.save(); g.translate(-18, by - 8); g.rotate(0.35 + armSwing);
        ell(0, 10, 6, 15, o.body || "#3a3e47", OUTLINE, 2); g.restore();
        // scarf
        if (o.scarf) {
          g.save(); g.translate(0, by - 22);
          rr(-20, -4, 40, 11, 5); g.fillStyle = o.scarf; g.fill(); g.lineWidth = 2; g.strokeStyle = OUTLINE; g.stroke();
          rr(5, 3, 9, 18, 3); g.fillStyle = o.scarf; g.fill(); g.stroke();
          g.restore();
        }
        // beak
        var hy = by - 28;
        g.beginPath(); g.moveTo(15, hy + 1); g.lineTo(31, hy + 5); g.lineTo(15, hy + 10); g.closePath();
        g.fillStyle = "#ffa21f"; g.fill(); g.lineWidth = 2; g.strokeStyle = OUTLINE; g.stroke();
        // eyes
        ell(9, hy - 3, 5.5, 6, "#ffffff", OUTLINE, 1.5);
        ell(11, hy - 2, 2.4, 3, "#10151b");
        if (o.eyepatch) { ell(9, hy - 3, 6.5, 7, "#0b0b0b"); g.strokeStyle = "#0b0b0b"; g.lineWidth = 2; g.beginPath(); g.moveTo(-8, hy - 12); g.lineTo(18, hy + 6); g.stroke(); }
        if (o.angry) { g.strokeStyle = OUTLINE; g.lineWidth = 2.5; g.beginPath(); g.moveTo(3, hy - 12); g.lineTo(15, hy - 7); g.stroke(); }
        // headgear
        var hat = o.hat;
        if (hat === "bonnet") {
          g.beginPath(); g.arc(2, hy - 6, 19, Math.PI * 1.02, Math.PI * 1.98); g.closePath();
          g.fillStyle = "#f6a6c9"; g.fill(); g.lineWidth = 2.5; g.strokeStyle = OUTLINE; g.stroke();
          ell(2, hy - 6, 19, 5, "#ffd6e8", OUTLINE, 2);
        } else if (hat === "crown") {
          g.beginPath(); g.moveTo(-9, hy - 14); g.lineTo(-9, hy - 28); g.lineTo(-3, hy - 20); g.lineTo(3, hy - 30); g.lineTo(9, hy - 20); g.lineTo(15, hy - 28); g.lineTo(15, hy - 14); g.closePath();
          g.fillStyle = "#ffd23f"; g.fill(); g.lineWidth = 2; g.strokeStyle = OUTLINE; g.stroke();
        } else if (hat === "pirate") {
          g.beginPath(); g.moveTo(-14, hy - 12); g.quadraticCurveTo(3, hy - 38, 20, hy - 12); g.quadraticCurveTo(3, hy - 18, -14, hy - 12);
          g.fillStyle = "#1c1c22"; g.fill(); g.lineWidth = 2; g.strokeStyle = OUTLINE; g.stroke();
          txt("x", 3, hy - 17, 9, "#fff", "center");
        } else if (hat === "biz") {
          rr(-12, hy - 22, 26, 10, 3); g.fillStyle = "#222a33"; g.fill(); g.lineWidth = 2; g.strokeStyle = OUTLINE; g.stroke();
        } else if (hat === "tourist") {
          ell(2, hy - 12, 20, 5, "#f4d27a", OUTLINE, 2); ell(2, hy - 17, 11, 7, "#f4d27a", OUTLINE, 2);
        } else if (hat === "critic") {
          ell(2, hy - 12, 20, 4.5, "#7b1f2b", OUTLINE, 2); rr(-8, hy - 30, 20, 20, 3); g.fillStyle = "#7b1f2b"; g.fill(); g.stroke();
        } else if (hat === "kid") {
          g.beginPath(); g.moveTo(-8, hy - 11); g.lineTo(2, hy - 30); g.lineTo(12, hy - 11); g.closePath();
          g.fillStyle = "#ff6fae"; g.fill(); g.lineWidth = 2; g.strokeStyle = OUTLINE; g.stroke();
        }
        if (o.glasses) { g.strokeStyle = OUTLINE; g.lineWidth = 2; g.beginPath(); g.arc(9, hy - 3, 8, 0, Math.PI * 2); g.stroke(); }
        g.restore();
      }

      function custLook(c) {
        var o = { s: CTYPES[c.type].s, face: c.face, moving: c.moving, walk: c.walk, scarf: c.scarf, sit: c.state === "seated" || c.state === "ordered" || c.state === "eating", alpha: c.fade, angry: c.angry };
        if (c.type === "vip") o.hat = "crown";
        else if (c.type === "pirate") { o.hat = "pirate"; o.eyepatch = true; o.scarf = "#a31515"; }
        else if (c.type === "biz") { o.hat = "biz"; o.scarf = "#2f3a47"; }
        else if (c.type === "tourist") { o.hat = "tourist"; o.scarf = "#ff9f1c"; }
        else if (c.type === "critic") { o.hat = "critic"; o.glasses = true; o.scarf = "#7b1f2b"; }
        else if (c.type === "kid") o.hat = "kid";
        return o;
      }

      // ---------------- ships ----------------
      function drawShip(id, x, y, s) {
        g.save(); g.translate(x, y); g.scale(s, s);
        g.lineWidth = 2; g.strokeStyle = OUTLINE; g.lineJoin = "round";
        switch (id) {
          case "freighter":
            g.beginPath(); g.moveTo(-60, -10); g.lineTo(60, -10); g.lineTo(48, 8); g.lineTo(-52, 8); g.closePath(); g.fillStyle = "#c0272d"; g.fill(); g.stroke();
            rr(-45, -26, 22, 16, 2); g.fillStyle = "#4aa0d6"; g.fill(); g.stroke();
            rr(-18, -22, 34, 12, 2); g.fillStyle = "#e9edf0"; g.fill(); g.stroke();
            rr(-6, -34, 10, 14, 2); g.fillStyle = "#c0272d"; g.fill(); g.stroke();
            rr(22, -22, 22, 12, 2); g.fillStyle = "#f2b01e"; g.fill(); g.stroke(); break;
          case "cruise":
            g.beginPath(); g.moveTo(-70, -10); g.lineTo(70, -10); g.lineTo(56, 10); g.lineTo(-60, 10); g.closePath(); g.fillStyle = "#f5f8fa"; g.fill(); g.stroke();
            rr(-52, -30, 100, 20, 3); g.fillStyle = "#ffffff"; g.fill(); g.stroke();
            rr(-36, -44, 66, 14, 3); g.fillStyle = "#e6edf2"; g.fill(); g.stroke();
            rr(-14, -58, 12, 14, 2); g.fillStyle = "#e5483b"; g.fill(); g.stroke(); rr(8, -58, 12, 14, 2); g.fill(); g.stroke();
            g.fillStyle = "#4aa0d6"; for (var i = 0; i < 9; i++) g.fillRect(-46 + i * 11, -24, 6, 6);
            g.fillStyle = "#1d4a8a"; g.fillRect(-68, 0, 124, 4); break;
          case "galleon":
            g.beginPath(); g.moveTo(-50, -8); g.lineTo(54, -8); g.quadraticCurveTo(46, 14, 30, 14); g.lineTo(-34, 14); g.quadraticCurveTo(-46, 10, -50, -8); g.closePath();
            g.fillStyle = "#7a4a22"; g.fill(); g.stroke();
            g.fillStyle = "#5a3416"; g.fillRect(-4, -52, 5, 44); g.fillRect(-30, -40, 4, 32); g.fillRect(24, -40, 4, 32);
            g.beginPath(); g.moveTo(1, -52); g.lineTo(26, -42); g.lineTo(1, -16); g.closePath(); g.fillStyle = "#f4efe0"; g.fill(); g.stroke();
            g.beginPath(); g.moveTo(-5, -50); g.lineTo(-28, -38); g.lineTo(-5, -16); g.closePath(); g.fill(); g.stroke();
            g.fillStyle = "#111"; ell(8, -34, 4, 4, "#111"); break;
          case "icebreaker":
            g.beginPath(); g.moveTo(-62, -10); g.lineTo(60, -10); g.lineTo(50, 10); g.lineTo(-50, 10); g.closePath(); g.fillStyle = "#1f4f8c"; g.fill(); g.stroke();
            g.fillStyle = "#ff8a1f"; g.fillRect(-56, -10, 112, 5);
            rr(-30, -28, 50, 18, 3); g.fillStyle = "#f4f6f8"; g.fill(); g.stroke();
            rr(-12, -40, 22, 12, 2); g.fillStyle = "#ff8a1f"; g.fill(); g.stroke();
            g.fillStyle = "#4aa0d6"; for (var j = 0; j < 4; j++) g.fillRect(-24 + j * 12, -24, 7, 6); break;
          case "submarine":
            ell(0, 0, 54, 18, "#ffd23f", OUTLINE, 2.5);
            rr(-12, -34, 28, 18, 5); g.fillStyle = "#f0bf1a"; g.fill(); g.stroke();
            g.fillStyle = OUTLINE; g.fillRect(2, -46, 4, 14); g.fillRect(2, -46, 12, 4);
            ell(-22, 0, 5, 5, "#8fd0f0", OUTLINE, 2); ell(-4, 0, 5, 5, "#8fd0f0", OUTLINE, 2); ell(14, 0, 5, 5, "#8fd0f0", OUTLINE, 2);
            g.beginPath(); g.moveTo(-52, 0); g.lineTo(-64, -12); g.lineTo(-64, 12); g.closePath(); g.fillStyle = "#f0bf1a"; g.fill(); g.stroke(); break;
          case "yacht":
            g.beginPath(); g.moveTo(-58, -8); g.lineTo(62, -8); g.lineTo(44, 10); g.lineTo(-48, 10); g.closePath(); g.fillStyle = "#ffffff"; g.fill(); g.stroke();
            g.fillStyle = "#d4a017"; g.fillRect(-56, -8, 114, 4);
            rr(-28, -26, 44, 18, 6); g.fillStyle = "#f2f6f8"; g.fill(); g.stroke();
            rr(-18, -38, 22, 12, 4); g.fillStyle = "#4aa0d6"; g.fill(); g.stroke();
            g.beginPath(); g.moveTo(40, -8); g.lineTo(40, -34); g.lineTo(58, -8); g.closePath(); g.fillStyle = "#d4a017"; g.fill(); g.stroke(); break;
          case "ufo":
            g.fillStyle = "rgba(160,255,200,0.25)"; g.beginPath(); g.moveTo(-18, 8); g.lineTo(18, 8); g.lineTo(34, 40); g.lineTo(-34, 40); g.closePath(); g.fill();
            ell(0, -4, 48, 14, "#aab4bf", OUTLINE, 2.5); ell(0, -14, 22, 16, "#7fe3ff", OUTLINE, 2.5);
            ell(-28, -4, 4, 3, "#ffd23f"); ell(0, 0, 4, 3, "#ffd23f"); ell(28, -4, 4, 3, "#ffd23f"); break;
        }
        g.restore();
      }

      // ---------------- background ----------------
      function skyColors(th, p) {
        var k = th.sky;
        var a, b, t;
        if (p < 0.5) { a = k[0]; b = k[1]; t = p / 0.5; } else { a = k[1]; b = k[2]; t = (p - 0.5) / 0.5; }
        return [mixHex(a[0], b[0], t), mixHex(a[1], b[1], t)];
      }

      function drawBackground(th, p, forGame) {
        var sc = skyColors(th, p);
        var gr = g.createLinearGradient(0, 0, 0, 80);
        gr.addColorStop(0, sc[0]); gr.addColorStop(1, sc[1]);
        g.fillStyle = gr; g.fillRect(0, 0, VW, 100);
        // stars for night theme
        if (th.deco === "aurora") {
          for (var s = 0; s < 40; s++) {
            var sx = (s * 97) % VW, sy = (s * 53) % 70;
            g.fillStyle = "rgba(255,255,255," + (0.4 + 0.5 * Math.abs(Math.sin(clockT * 1.5 + s))) + ")";
            g.fillRect(sx, sy, 2, 2);
          }
          for (var b = 0; b < 3; b++) {
            var ag = g.createLinearGradient(0, 0, 0, 80);
            var col = b === 0 ? "80,255,180" : (b === 1 ? "120,160,255" : "200,120,255");
            ag.addColorStop(0, "rgba(" + col + ",0)"); ag.addColorStop(0.5, "rgba(" + col + ",0.35)"); ag.addColorStop(1, "rgba(" + col + ",0)");
            g.fillStyle = ag;
            g.beginPath(); g.moveTo(0, 20 + b * 6);
            for (var xx = 0; xx <= VW; xx += 30) g.lineTo(xx, 20 + b * 8 + Math.sin(xx * 0.02 + clockT * 0.8 + b) * 12);
            g.lineTo(VW, 80); g.lineTo(0, 80); g.closePath(); g.fill();
          }
        } else {
          // sun arcing across the sky
          var sunX = lerp(40, VW - 80, p), sunY = 62 - Math.sin(p * Math.PI) * 14;
          var sg = g.createRadialGradient(sunX, sunY, 4, sunX, sunY, 46);
          sg.addColorStop(0, "rgba(255,244,200,0.95)"); sg.addColorStop(1, "rgba(255,230,160,0)");
          g.fillStyle = sg; g.fillRect(sunX - 50, sunY - 50, 100, 100);
        }
        // sea
        var sea = g.createLinearGradient(0, 52, 0, 130);
        sea.addColorStop(0, th.sea[0]); sea.addColorStop(1, th.sea[1]);
        g.fillStyle = sea; g.fillRect(0, 52, VW, 90);
        g.strokeStyle = "rgba(255,255,255,0.22)"; g.lineWidth = 1.5;
        for (var w = 0; w < 7; w++) {
          var wy = 70 + w * 9, wx = (w * 131 + clockT * 6 * (w % 2 ? 1 : -1)) % VW;
          g.beginPath(); g.moveTo(wx, wy); g.quadraticCurveTo(wx + 10, wy - 3, wx + 20, wy); g.stroke();
        }
        // static background ship + equipped ship sailing
        drawShip("freighter", 120, 62, 0.55);
        drawShip("cruise", 520, 60, 0.42);
        // decoration behind the ice
        drawDeco(th);
        // ground
        g.beginPath(); g.moveTo(0, 110);
        for (var x = 0; x <= VW; x += 24) g.lineTo(x, 100 + Math.sin(x * 0.045) * 6 + Math.sin(x * 0.11) * 3);
        g.lineTo(VW, VH); g.lineTo(0, VH); g.closePath();
        g.fillStyle = th.ground; g.fill();
        g.lineWidth = 2.5; g.strokeStyle = th.rim; g.stroke();
        // patches
        ell(120, 170, 120, 24, th.ground2); ell(600, 190, 130, 22, th.ground2);
        ell(360, 430, 220, 26, th.ground2);
        g.strokeStyle = th.rim; g.lineWidth = 1.5;
        g.beginPath(); g.moveTo(190, 255); g.lineTo(166, 238); g.lineTo(176, 222); g.moveTo(166, 238); g.lineTo(150, 244); g.stroke();
        // snow bank, bottom-left
        g.beginPath(); g.moveTo(0, 440); g.quadraticCurveTo(100, 425, 200, 440); g.lineTo(240, VH); g.lineTo(0, VH); g.closePath();
        g.fillStyle = "#f6fbfe"; g.fill(); g.lineWidth = 2; g.strokeStyle = th.rim; g.stroke();
        if (th.snow) {
          g.fillStyle = "rgba(255,255,255,0.9)";
          for (var f = 0; f < 50; f++) {
            var fx = (f * 71 + Math.sin(clockT + f) * 14) % VW, fy = (f * 37 + clockT * (20 + (f % 5) * 8)) % VH;
            g.fillRect(fx, fy, 3, 3);
          }
        }
      }

      function drawDeco(th) {
        g.lineWidth = 2; g.strokeStyle = OUTLINE; g.lineJoin = "round";
        var i;
        if (th.deco === "bergs" || th.deco === "aurora" || th.deco === "lights") {
          var iceFill = th.deco === "aurora" ? "#b9d3f2" : "#e9f6fb";
          var pts = [[210, 92, 250, 60, 292, 92], [300, 92, 345, 70, 395, 92], [640, 92, 690, 64, 740, 92], [-30, 96, 30, 62, 100, 96]];
          for (i = 0; i < pts.length; i++) {
            var p = pts[i];
            g.beginPath(); g.moveTo(p[0], p[1]); g.lineTo(p[2] - 12, p[3] + 8); g.lineTo(p[2], p[3]); g.lineTo(p[4], p[5]); g.closePath();
            g.fillStyle = iceFill; g.fill(); g.strokeStyle = th.rim; g.stroke();
          }
        }
        if (th.deco === "palms") {
          for (i = 0; i < 4; i++) {
            var px = [40, 190, 560, 690][i], ph = 38 + (i % 2) * 8;
            g.strokeStyle = "#6b4423"; g.lineWidth = 5;
            g.beginPath(); g.moveTo(px, 100); g.quadraticCurveTo(px + 8, 100 - ph / 2, px + 4, 100 - ph); g.stroke();
            g.fillStyle = "#2e9e55"; g.strokeStyle = OUTLINE; g.lineWidth = 2;
            for (var l = 0; l < 5; l++) {
              var la = -Math.PI * 0.95 + l * Math.PI * 0.45;
              g.beginPath(); g.moveTo(px + 4, 100 - ph);
              g.quadraticCurveTo(px + 4 + Math.cos(la) * 16, 100 - ph + Math.sin(la) * 18 - 6, px + 4 + Math.cos(la) * 30, 100 - ph + Math.sin(la) * 12 + 10);
              g.quadraticCurveTo(px + 4 + Math.cos(la) * 14, 100 - ph + Math.sin(la) * 8 + 2, px + 4, 100 - ph); g.fill(); g.stroke();
            }
          }
        }
        if (th.deco === "lights") {
          g.strokeStyle = "#2a2a2a"; g.lineWidth = 1.5;
          g.beginPath(); g.moveTo(0, 6); g.quadraticCurveTo(VW / 2, 36, VW, 6); g.stroke();
          var cols = ["#ff4d4d", "#ffd23f", "#4dd2ff", "#7dff7a"];
          for (i = 0; i < 18; i++) {
            var tx = i / 17, lx = tx * VW, ly = 6 + Math.sin(tx * Math.PI) * 15;
            var on = Math.sin(clockT * 3 + i) > -0.3;
            ell(lx, ly + 5, 4, 5, on ? cols[i % 4] : "#555", OUTLINE, 1);
          }
        }
        if (th.deco === "candy") {
          for (i = 0; i < 6; i++) {
            var cx = [40, 170, 330, 470, 600, 690][i];
            g.strokeStyle = "#fff"; g.lineWidth = 3; g.beginPath(); g.moveTo(cx, 100); g.lineTo(cx, 76); g.stroke();
            ell(cx, 68, 12, 12, ["#ff6fae", "#7be0ff", "#ffd23f"][i % 3], OUTLINE, 2);
            g.strokeStyle = "rgba(255,255,255,0.8)"; g.lineWidth = 2; g.beginPath(); g.arc(cx, 68, 6, 0, Math.PI * 1.6); g.stroke();
          }
        }
      }

      function drawEquippedShip(forGame) {
        var period = 50;
        var tt = ((forGame && G ? G.shipT : clockT) % period) / period;
        var x = lerp(-90, VW + 90, tt);
        drawShip(shipId(), x, 64 + Math.sin(clockT * 1.6) * 1.5, 0.62);
      }

      function drawClock(p) {
        var cx = 70, cy = 118;
        g.strokeStyle = OUTLINE; g.lineWidth = 4; g.lineCap = "round";
        g.beginPath(); g.moveTo(cx - 6, cy + 24); g.lineTo(cx - 18, cy + 38); g.moveTo(cx + 6, cy + 24); g.lineTo(cx + 18, cy + 38); g.stroke();
        g.lineCap = "butt";
        ell(cx, cy, 26, 26, "#d8dfe4", OUTLINE, 3);
        ell(cx, cy, 21, 21, "#ffffff", OUTLINE, 1.5);
        for (var i = 0; i < 12; i++) {
          var a = i * Math.PI / 6;
          g.beginPath(); g.moveTo(cx + Math.sin(a) * 17, cy - Math.cos(a) * 17); g.lineTo(cx + Math.sin(a) * 20, cy - Math.cos(a) * 20); g.stroke();
        }
        var hrs = 9 + 8 * clamp(p, 0, 1.2);
        var ha = (hrs % 12) / 12 * Math.PI * 2, ma = (hrs % 1) * Math.PI * 2;
        g.lineWidth = 3;
        g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + Math.sin(ha) * 11, cy - Math.cos(ha) * 11); g.stroke();
        g.lineWidth = 2;
        g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + Math.sin(ma) * 16, cy - Math.cos(ma) * 16); g.stroke();
      }

      function drawTV() {
        var x = 322, y = 44, w = 150, h = 84;
        rr(x - 6, y - 4, w + 12, h + 10, 8); g.fillStyle = "#2f3944"; g.fill(); g.lineWidth = 2.5; g.strokeStyle = OUTLINE; g.stroke();
        var sg = g.createLinearGradient(0, y, 0, y + h); sg.addColorStop(0, "#cfe9fa"); sg.addColorStop(1, "#4d89b8");
        g.fillStyle = sg; g.fillRect(x, y, w, h - 4);
        // anchor penguin
        ell(x + 28, y + 56, 20, 22, "#555b66", OUTLINE, 1.5); ell(x + 30, y + 62, 11, 15, "#fff");
        ell(x + 28, y + 36, 15, 14, "#555b66", OUTLINE, 1.5); ell(x + 25, y + 34, 5, 5, "#e8e8e8", OUTLINE, 1); ell(x + 35, y + 34, 5, 5, "#e8e8e8", OUTLINE, 1);
        g.beginPath(); g.moveTo(x + 29, y + 38); g.lineTo(x + 36, y + 42); g.lineTo(x + 29, y + 44); g.closePath(); g.fillStyle = "#ffa21f"; g.fill();
        // story graphic
        var hl = HEADLINES[G ? G.headline : 0];
        gx(hl[1], x + 105, y + 26);
        txt(hl[0], x + 56, y + 70, 9, "#ffffff", "left", { stroke: "#1d3a52", lw: 2.5 });
        txt("PPN", x + w - 6, y + 77, 11, "#ff8a1f", "right", { stroke: "#1d3a52", lw: 2.5 });
      }
      function gx(kind, x, y) {
        g.save(); g.translate(x, y);
        if (kind === "ufo") { ell(0, 0, 18, 6, "#aab4bf", OUTLINE, 1.5); ell(0, -5, 8, 6, "#7fe3ff", OUTLINE, 1.5); g.strokeStyle = "#fff"; g.beginPath(); g.moveTo(-26, 8); g.lineTo(-10, 4); g.stroke(); }
        else if (kind === "fish") { ell(-2, 0, 12, 6, "#ffb347", OUTLINE, 1.5); g.beginPath(); g.moveTo(9, 0); g.lineTo(16, -6); g.lineTo(16, 6); g.closePath(); g.fillStyle = "#ffb347"; g.fill(); g.stroke(); }
        else if (kind === "berg") { g.beginPath(); g.moveTo(-16, 10); g.lineTo(-4, -12); g.lineTo(4, -4); g.lineTo(16, 10); g.closePath(); g.fillStyle = "#fff"; g.fill(); g.strokeStyle = OUTLINE; g.stroke(); }
        else if (kind === "star") { starPath(0, 0, 13, 5.5); g.fillStyle = "#ffd23f"; g.fill(); g.strokeStyle = OUTLINE; g.stroke(); }
        else if (kind === "wave") { g.strokeStyle = "#fff"; g.lineWidth = 3; g.beginPath(); g.moveTo(-16, 0); g.quadraticCurveTo(-8, -10, 0, 0); g.quadraticCurveTo(8, 10, 16, 0); g.stroke(); }
        else { g.fillStyle = "#fff"; for (var i = 0; i < 6; i++) g.fillRect(-14 + (i * 11) % 30, -10 + i * 4, 3, 3); }
        g.restore();
      }

      function drawKitchen() {
        var k = KITCHEN;
        rr(k.x, k.y + 18, k.w, k.h, 8); g.fillStyle = "#e1f0f6"; g.fill(); g.lineWidth = 2.5; g.strokeStyle = OUTLINE; g.stroke();
        rr(k.x + 10, k.y + 28, k.w - 20, 28, 5); g.fillStyle = "#2b3f4e"; g.fill(); g.stroke();
        // chef penguin peeking
        drawPenguin(k.x + 30, k.y + 56, { s: 0.55, face: 1, shadow: false, hat: null, scarf: "#fff" });
        rr(k.x + 14, k.y - 2, 32, 16, 6); g.fillStyle = "#fff"; g.fill(); g.lineWidth = 2; g.strokeStyle = OUTLINE; g.stroke();
        // counter
        rr(k.x - 4, k.y + 62, k.w + 8, 14, 5); g.fillStyle = "#b9d8e4"; g.fill(); g.lineWidth = 2.5; g.stroke();
        txt("FISH BAR", k.x + k.w / 2, k.y + 14, 11, "#fff", "center", { stroke: OUTLINE, lw: 3 });
        // cooking progress pips
        for (var i = 0; i < D.stoves; i++) {
          var x = k.x + 18 + i * 20, ck = G.cook[i];
          ell(x, k.y + 69, 7, 4, ck ? "#ff8a1f" : "#8aa2b0", OUTLINE, 1.5);
          if (ck) {
            var fr = 1 - ck.left / (DISHES[ck.c.dish].cook * D.cookMult);
            g.fillStyle = "#7bff6a"; g.fillRect(x - 8, k.y + 75, 16 * clamp(fr, 0, 1), 3);
          }
        }
        // ready dishes
        for (var r = 0; r < G.ready.length && r < 6; r++) {
          drawDish(G.ready[r].c.dish, k.x + 16 + r * 17, k.y + 60 - Math.abs(Math.sin(clockT * 5 + r)) * 2, 0.6);
        }
        if (G.ready.length) {
          ell(k.x + k.w - 8, k.y + 24, 10, 10, "#e5483b", OUTLINE, 2);
          txt(String(G.ready.length), k.x + k.w - 8, k.y + 29, 12, "#fff", "center");
        }
        hit(k.x - 6, k.y - 4, k.x + k.w + 6, k.y + k.h + 20, function () { if (G && G.state !== "ready" && !paused) addAction({ k: "kitchen" }); });
      }

      function drawRegister() {
        var rx = REGISTER.x, ry = REGISTER.y;
        var bump = G ? G.regBump : 0;
        rr(rx - 4 - 4 * bump, ry - 4 - 4 * bump, 92 + 8 * bump, 36 + 8 * bump, 4); g.fillStyle = "#4b4137"; g.fill(); g.lineWidth = 2.5; g.strokeStyle = OUTLINE; g.stroke();
        rr(rx, ry, 88, 16, 3); g.fillStyle = "#151a1e"; g.fill();
        txt("$", rx + 6, ry + 13, 13, "#ff8a1f");
        txt(String(G ? G.goal : 0), rx + 82, ry + 13, 14, "#ff8a1f", "right");
        rr(rx, ry + 19, 88, 16, 3); g.fillStyle = "#151a1e"; g.fill();
        txt("$", rx + 6, ry + 32, 13, "#4dff6a");
        txt(String(G ? Math.round(G.earned) : 0), rx + 82, ry + 32, 14, "#4dff6a", "right");
        // body
        rr(rx - 10, ry + 44, 108, 50, 6); g.fillStyle = "#cfa86a"; g.fill(); g.lineWidth = 2.5; g.strokeStyle = OUTLINE; g.stroke();
        g.fillStyle = "#f4c24a";
        for (var i = 0; i < 4; i++) for (var j = 0; j < 3; j++) g.fillRect(rx + 6 + i * 14, ry + 52 + j * 11, 10, 7);
        rr(rx - 16, ry + 86, 120, 8, 3); g.fillStyle = "#6b5a49"; g.fill(); g.stroke();
      }

      function drawTrash() {
        var x = TRASH.x, y = TRASH.y;
        g.beginPath(); g.moveTo(x - 24, y - 36); g.lineTo(x + 24, y - 36); g.lineTo(x + 19, y + 24); g.lineTo(x - 19, y + 24); g.closePath();
        g.fillStyle = "#8d9aa5"; g.fill(); g.lineWidth = 2.5; g.strokeStyle = OUTLINE; g.stroke();
        g.strokeStyle = "#5d6a74"; g.lineWidth = 2;
        for (var i = -1; i <= 1; i++) { g.beginPath(); g.moveTo(x + i * 10, y - 30); g.lineTo(x + i * 8, y + 18); g.stroke(); }
        ell(x, y - 36, 26, 7, "#b3bec7", OUTLINE, 2.5);
        txt("TRASH", x, y + 8, 10, "#ffffff", "center", { stroke: OUTLINE, lw: 3 });
        hit(x - 30, y - 44, x + 30, y + 28, function () { if (G && G.state !== "ready" && !paused) addAction({ k: "trash" }); });
      }

      function drawMat(th) {
        g.beginPath(); g.moveTo(MAT.x, MAT.y + 8); g.lineTo(MAT.x + MAT.w - 20, MAT.y); g.lineTo(MAT.x + MAT.w, MAT.y + 62); g.lineTo(MAT.x + MAT.w - 20, MAT.y + MAT.h); g.lineTo(MAT.x, MAT.y + MAT.h - 8); g.closePath();
        g.fillStyle = th.mat; g.fill(); g.lineWidth = 4; g.strokeStyle = th.matEdge; g.stroke();
        g.lineWidth = 1.5; g.strokeStyle = OUTLINE; g.stroke();
      }

      function drawChair(x, y, th, flip) {
        g.save(); g.translate(x, y); g.scale(flip, 1);
        ell(0, 18, 18, 6, "rgba(20,50,70,0.2)");
        g.fillStyle = "#6c7780"; g.fillRect(-3, 6, 6, 12); ell(0, 19, 11, 3.5, "#6c7780", OUTLINE, 1.5);
        g.beginPath(); g.moveTo(-18, -2); g.quadraticCurveTo(-24, -22, -8, -22); g.quadraticCurveTo(0, -18, 2, -8); g.quadraticCurveTo(18, -6, 18, 4);
        g.quadraticCurveTo(10, 14, -8, 10); g.quadraticCurveTo(-16, 8, -18, -2); g.closePath();
        g.fillStyle = th.chair; g.fill(); g.lineWidth = 2; g.strokeStyle = OUTLINE; g.stroke();
        g.restore();
      }

      function drawTable(t, th) {
        var x = t.x, y = t.y;
        drawChair(x - 84, y + 22, th, 1);
        drawChair(x + 84, y + 22, th, -1);
        if (t.glow) {
          g.save(); g.shadowColor = "#46ff3a"; g.shadowBlur = 18 + Math.sin(clockT * 6) * 5;
          ell(x, y, 66, 22, null, "#4dff3a", 4); g.restore();
        }
        ell(x, y + 56, 20, 6, "rgba(20,50,70,0.2)");
        g.fillStyle = "#b8c9d2"; g.fillRect(x - 6, y + 12, 12, 42); g.strokeStyle = OUTLINE; g.lineWidth = 2; g.strokeRect(x - 6, y + 12, 12, 42);
        ell(x, y + 56, 24, 7, "#e9f2f7", OUTLINE, 2);
        // skirt with icicles
        g.beginPath(); g.moveTo(x - 64, y + 4);
        for (var i = 0; i <= 8; i++) {
          var ix = x - 64 + i * 16;
          g.lineTo(ix, y + 8 + (i % 2 ? 16 : 7));
          g.lineTo(ix + 8, y + 10);
        }
        g.lineTo(x + 64, y + 4); g.closePath();
        g.fillStyle = th.tableEdge; g.fill(); g.lineWidth = 2; g.strokeStyle = OUTLINE; g.stroke();
        ell(x, y, 64, 22, th.table, OUTLINE, 2.5);
        ell(x - 12, y - 6, 28, 6, "rgba(255,255,255,0.7)");
        // dish / dirt
        if (t.state === "occupied" && t.dish !== null) drawDish(t.dish, x + (t.cust ? -t.cust.side * 28 : 0), y - 2, 1.0);
        if (t.state === "dirty") {
          ell(x - 16, y, 12, 5, "#eef3f6", OUTLINE, 1.5); ell(x + 10, y + 2, 11, 5, "#eef3f6", OUTLINE, 1.5);
          g.fillStyle = "#c9a37a"; g.fillRect(x - 20, y - 2, 8, 3);
          for (var c = 0; c < 3; c++) {
            var bounce = Math.abs(Math.sin(clockT * 4 + c)) * 3;
            ell(x - 6 + c * 9, y - 8 - bounce, 6, 6, "#ffd23f", OUTLINE, 1.5);
          }
          txt("$" + Math.round(t.pay), x, y - 24, 14, "#ffe14a", "center", { stroke: OUTLINE, lw: 4 });
        }
        hit(x - 66, y - 26, x + 66, y + 40, function () { onTableTap(t); });
      }

      function patColor(f) { return f > 0.6 ? "#4ddd5a" : (f > 0.3 ? "#ffcf33" : "#ff4d3d"); }

      function drawBubble(x, y, c) {
        if (c.state === "seated") {
          var pulse = 1 + Math.sin(clockT * 6 + c.askPulse) * 0.06;
          g.save(); g.translate(x, y); g.scale(pulse, pulse);
          rr(-17, -30, 34, 30, 9); g.fillStyle = "#fff"; g.fill(); g.lineWidth = 2; g.strokeStyle = OUTLINE; g.stroke();
          g.beginPath(); g.moveTo(-3, -1); g.lineTo(2, 8); g.lineTo(6, -1); g.fillStyle = "#fff"; g.fill();
          txt("!", 0, -9, 22, "#e5483b", "center");
          g.restore();
        } else if (c.state === "ordered") {
          rr(x - 22, y - 36, 44, 36, 10); g.fillStyle = "#fff"; g.fill(); g.lineWidth = 2; g.strokeStyle = OUTLINE; g.stroke();
          g.beginPath(); g.moveTo(x - 4, y - 1); g.lineTo(x + 2, y + 9); g.lineTo(x + 8, y - 1); g.fillStyle = "#fff"; g.fill();
          drawDish(c.dish, x, y - 14, 1.0);
        }
      }

      function drawPatience(x, y, c) {
        var f = clamp(c.pat / c.pmax, 0, 1);
        rr(x - 20, y, 40, 7, 3); g.fillStyle = "rgba(20,35,45,0.7)"; g.fill();
        if (f > 0) { rr(x - 19, y + 1, 38 * f, 5, 2); g.fillStyle = patColor(f); g.fill(); }
      }

      function drawWaitress() {
        var w = G.w;
        drawPenguin(w.x, w.y, { s: 1.04, face: w.face, moving: w.moving, walk: w.walk, hat: "bonnet", apron: "#f9c5dc", scarf: null, shadow: true });
        // carried dishes
        for (var i = 0; i < w.dishes.length; i++) drawDish(w.dishes[i].c.dish, w.x + w.face * (24 + i * 4), w.y - 38 - i * 11, 0.85);
        if (w.tickets.length) {
          rr(w.x - 30, w.y - 100, 24, 18, 3); g.fillStyle = "#fffbe0"; g.fill(); g.lineWidth = 2; g.strokeStyle = OUTLINE; g.stroke();
          txt(String(w.tickets.length), w.x - 18, w.y - 86, 12, "#a33", "center");
        }
        if (w.busy > 0 && w.cur) {
          var dur = w.cur.mode === "clean" ? 1.0 : (w.cur.mode === "order" ? 0.6 : 0.5);
          var fr = clamp(1 - w.busy / dur, 0, 1);
          rr(w.x - 18, w.y - 96, 36, 6, 3); g.fillStyle = "rgba(20,35,45,0.7)"; g.fill();
          rr(w.x - 17, w.y - 95, 34 * fr, 4, 2); g.fillStyle = "#6be3ff"; g.fill();
        }
        // small feet-level target so it never steals taps from tables behind her
        hit(w.x - 22, w.y - 22, w.x + 22, w.y + 6, function () { G.w.actions = []; G.w.cur = null; G.w.busy = 0; });
      }

      function drawWorld(th) {
        var p = G ? clamp(G.time / G.dayLen, 0, 1) : 0.92;
        drawBackground(th, p, true);
        drawEquippedShip(true);
        drawClock(p);
        drawTV();
        drawMat(th);
        drawTrash();
        drawRegister();
        if (G) drawKitchen();
      }

      function drawPlay(th) {
        drawWorld(th);
        var i;
        for (i = 0; i < G.tables.length; i++) drawTable(G.tables[i], th);
        // characters sorted by depth
        var chars = [];
        for (i = 0; i < G.customers.length; i++) chars.push({ y: G.customers[i].y, c: G.customers[i] });
        chars.push({ y: G.w.y, w: true });
        chars.sort(function (a, b) { return a.y - b.y; });
        for (i = 0; i < chars.length; i++) {
          if (chars[i].w) { drawWaitress(); continue; }
          var c = chars[i].c;
          var o = custLook(c);
          if (c.id === (G.selected && G.selected.id)) {
            g.save(); g.shadowColor = "#46ff3a"; g.shadowBlur = 16; ell(c.x, c.y - 36 * o.s, 30 * o.s, 44 * o.s, null, "#4dff3a", 3); g.restore();
          }
          drawPenguin(c.x, c.y, o);
          if (c.state !== "leaving") {
            var topY = c.y - 86 * o.s + (o.sit ? 12 : 0);
            drawPatience(c.x, topY - 4, c);
            if (c.type === "vip") txt("VIP", c.x, topY - 10, 11, "#ffd23f", "center", { stroke: OUTLINE, lw: 3 });
            if (c.type === "critic") txt("CRITIC", c.x, topY - 10, 11, "#ff9fb4", "center", { stroke: OUTLINE, lw: 3 });
            drawBubble(c.x + c.side * 0, topY - 16, c);
          }
          var cc = c;
          if (c.state === "queue" || c.state === "enter") {
            hit(c.x - 18, c.y - 80, c.x + 18, c.y + 4, function () { onQueueTap(this); }.bind(cc));
          } else if (c.table && (c.state === "seated" || c.state === "ordered" || c.state === "toSeat")) {
            var tbl = c.table;
            hit(c.x - 24, c.y - 90, c.x + 24, c.y + 6, function () { onTableTap(tbl); });
          }
        }
        // hint over selected penguin
        // floating text
        for (i = 0; i < G.floats.length; i++) {
          var fl = G.floats[i];
          g.globalAlpha = clamp(fl.life, 0, 1);
          txt(fl.text, fl.x, fl.y, fl.size, fl.color, "center", { stroke: OUTLINE, lw: 4 });
          g.globalAlpha = 1;
        }
        drawHud(th);
      }

      function onQueueTap(c) {
        if (!G || G.state === "ready" || paused) return;
        G.selected = (G.selected === c) ? null : c;
        haptic("light");
      }

      function onTableTap(t) {
        if (!G || G.state === "ready" || paused) return;
        if (t.state === "free") {
          var who = G.selected;
          if (!who || who.dead || (who.state !== "queue" && who.state !== "enter")) {
            who = queueList().filter(function (c) { return c.state === "queue"; })[0];
          }
          if (who) seatCustomer(who, t);
          return;
        }
        if (t.state === "taken" && t.cust && t.cust.state === "toSeat") return;
        addAction({ k: "table", t: t });
      }

      function drawHud() {
        // pause
        txt("PAUSE", VW - 14, 38, 24, "#e5342b", "right", { stroke: "#fff", lw: 5 });
        txt("PAUSE", VW - 14, 38, 24, "#e5342b", "right");
        hit(VW - 100, 8, VW, 48, function () { if (G.state !== "ready") paused = true; });
        // logo plate
        rr(VW / 2 - 118, 4, 236, 34, 8); g.fillStyle = "#1c3f78"; g.fill(); g.lineWidth = 2.5; g.strokeStyle = OUTLINE; g.stroke();
        txt("PENGUIN", VW / 2 - 8, 30, 22, "#ffffff", "right", { stroke: "#0d2250", lw: 4 });
        txt("DINER", VW / 2 - 2, 30, 22, "#ff8a1f", "left", { stroke: "#0d2250", lw: 4 });
        // day + time
        txt("DAY " + G.day, 12, 24, 18, "#ffffff", "left", { stroke: OUTLINE, lw: 4 });
        var remain = G.state === "run" ? Math.max(0, G.dayLen - G.time) : 0;
        txt(G.state === "overtime" ? "LAST ORDERS" : (G.state === "ready" ? "READY" : Math.ceil(remain) + "s"), 12, 44, 14, "#ffe9a8", "left", { stroke: OUTLINE, lw: 3.5 });
        if (G.combo >= 2) txt("COMBO x" + G.combo, VW - 14, 62, 15, "#7be0ff", "right", { stroke: OUTLINE, lw: 3.5 });
        // active effects
        var ey = 74;
        var efx = [["FREEZE", G.freeze, "#8fe0ff"], ["TURBO", G.turbo, "#ffd23f"], ["GOLDEN x2", G.golden, "#ffb300"]];
        for (var e = 0; e < efx.length; e++) {
          if (efx[e][1] > 0) { txt(efx[e][0] + " " + Math.ceil(efx[e][1]) + "s", VW - 14, ey, 13, efx[e][2], "right", { stroke: OUTLINE, lw: 3.5 }); ey += 16; }
        }
        // boosts bar
        for (var b = 0; b < BOOSTS.length; b++) {
          var bx = 12 + b * 46, by = 424, n = save.boosts[BOOSTS[b].id] || 0;
          (function (id) {
            rr(bx, by, 40, 40, 9); g.fillStyle = n > 0 ? "rgba(26,60,90,0.9)" : "rgba(60,70,80,0.7)"; g.fill(); g.lineWidth = 2.5; g.strokeStyle = OUTLINE; g.stroke();
            icon(BOOSTS[b].icon, bx + 20, by + 20, 0.95);
            ell(bx + 33, by + 33, 8, 8, "#e5483b", OUTLINE, 1.5);
            txt(String(n), bx + 33, by + 37, 11, "#fff", "center");
            hit(bx, by, bx + 40, by + 40, function () { useBoost(id); });
          })(BOOSTS[b].id);
        }
        // tutorial hints
        if (G.state === "run" && G.day === 1 && G.served === 0 && G.time < 45) {
          var hint = "Tap a penguin in line, then tap an empty table.";
          var sel = G.selected;
          var anySeated = G.customers.some(function (c) { return c.state === "seated"; });
          var anyOrdered = G.customers.some(function (c) { return c.state === "ordered"; });
          if (sel) hint = "Now tap an empty table to seat them.";
          if (anySeated) hint = "Tap the penguin to take their order.";
          if (anyOrdered || G.ready.length) hint = "Tap the FISH BAR, wait, tap it again, then tap the table.";
          if (G.w.tickets.length) hint = "Tap the FISH BAR to hand in the order.";
          panel(VW / 2 - 190, 404, 380, 28, "rgba(20,40,60,0.85)");
          txt(hint, VW / 2, 423, 13, "#ffffff", "center");
        }
        if (G.announceT > 0) {
          g.globalAlpha = clamp(G.announceT, 0, 1);
          txt(G.announce, VW / 2, 190, 22, "#fff3b0", "center", { stroke: OUTLINE, lw: 5 });
          g.globalAlpha = 1;
        }
      }

      // ---------------- overlays ----------------
      function drawReady(th) {
        g.fillStyle = "rgba(10,25,40,0.5)"; g.fillRect(0, 0, VW, VH);
        panel(VW / 2 - 190, 110, 380, 270, "rgba(22,52,78,0.96)");
        txt("DAY " + G.day, VW / 2, 156, 36, "#ffffff", "center", { stroke: OUTLINE, lw: 6 });
        txt("Earn  $" + G.goal + "  to keep the diner open", VW / 2, 188, 17, "#ffe9a8", "center");
        txt("Shift: " + D.dayLen + "s   Tables: " + D.tables + "   Tray: " + D.cap, VW / 2, 214, 14, "#cfe6f4", "center");
        var ship = byId(SHIPS, shipId());
        txt("Ship: " + ship.name, VW / 2, 240, 14, "#8fe0ff", "center");
        wrap(ship.perk, VW / 2, 258, 340, 13, "#cfe6f4", 2);
        if (G.critic) txt("A FOOD CRITIC IS COMING TODAY!", VW / 2, 300, 14, "#ff9fb4", "center");
        var st = save.stars[G.day] || 0;
        txt(st ? "Best: " + stars(st) : "New shift", VW / 2, 322, 14, "#ffd23f", "center");
        button(VW / 2 - 175, 336, 100, 38, "SHOP", { size: 16, color: "#3f9bea", dark: "#1f5f9e", fn: function () { shop.from = "play"; shop.scroll = 0; screen = "shop"; } });
        button(VW / 2 - 65, 336, 130, 38, "OPEN!", { size: 18, color: "#43b04a", dark: "#25702b", fn: startShift });
        button(VW / 2 + 75, 336, 100, 38, "MENU", { size: 16, color: "#8a97a3", dark: "#5a6a74", fn: function () { screen = "title"; G = null; } });
      }

      function stars(n) { var s = ""; for (var i = 0; i < 3; i++) s += i < n ? "★" : "☆"; return s; }

      function wrap(text, x, y, maxW, lh, color, maxLines) {
        var words = text.split(" "), line = "", lines = [];
        g.font = "700 " + lh + "px " + FONT;
        for (var i = 0; i < words.length; i++) {
          var test = line ? line + " " + words[i] : words[i];
          if (g.measureText(test).width > maxW && line) { lines.push(line); line = words[i]; } else line = test;
        }
        lines.push(line);
        for (var j = 0; j < lines.length && j < (maxLines || 99); j++) txt(lines[j], x, y + j * (lh + 3), lh, color, "center", { w: "600" });
      }

      function drawPaused() {
        g.fillStyle = "rgba(10,25,40,0.6)"; g.fillRect(0, 0, VW, VH);
        panel(VW / 2 - 140, 130, 280, 220, "rgba(22,52,78,0.96)");
        txt("PAUSED", VW / 2, 180, 32, "#fff", "center", { stroke: OUTLINE, lw: 6 });
        button(VW / 2 - 100, 200, 200, 42, "RESUME", { color: "#43b04a", dark: "#25702b", fn: function () { paused = false; } });
        button(VW / 2 - 100, 254, 200, 42, save.music ? "MUSIC: ON" : "MUSIC: OFF", { color: "#3f9bea", dark: "#1f5f9e", size: 15, fn: toggleMusic });
        button(VW / 2 - 100, 308, 200, 34, "QUIT SHIFT", { color: "#c0392b", dark: "#7e231a", size: 14, fn: function () { paused = false; screen = "title"; G = null; } });
      }

      var musicOn = false;
      function playMusic() {
        if (!save.music || musicOn) return;
        try { ctx.music.unlock(); ctx.music.play("cozy"); ctx.music.setVolume(0.4); musicOn = true; } catch (e) {}
      }
      function toggleMusic() {
        save.music = !save.music; persist();
        if (save.music) playMusic();
        else { try { ctx.music.stop({ fadeOutMs: 200 }); } catch (e) {} musicOn = false; }
      }

      function drawResults(th) {
        g.fillStyle = "rgba(10,25,40,0.62)"; g.fillRect(0, 0, VW, VH);
        panel(VW / 2 - 210, 40, 420, 400, "rgba(22,52,78,0.97)");
        txt(G.success ? "SHIFT COMPLETE!" : "NOT ENOUGH...", VW / 2, 88, 30, G.success ? "#7dff7a" : "#ff7a6b", "center", { stroke: OUTLINE, lw: 6 });
        txt("Day " + G.day, VW / 2, 112, 16, "#cfe6f4", "center");
        if (G.success) {
          for (var i = 0; i < 3; i++) {
            starPath(VW / 2 - 50 + i * 50, 150, 20, 8.5);
            g.fillStyle = i < G.stars ? "#ffd23f" : "rgba(255,255,255,0.18)"; g.fill(); g.lineWidth = 2.5; g.strokeStyle = OUTLINE; g.stroke();
          }
        } else {
          txt("Goal was $" + G.goal + " - you made $" + Math.round(G.earned), VW / 2, 156, 15, "#ffe9a8", "center");
        }
        var rows = [
          ["Earned", "$" + Math.round(G.earned)],
          ["Goal", "$" + G.goal],
          ["Customers served", String(G.served)],
          ["Customers lost", String(G.lost)],
          ["Tips collected", "$" + Math.round(G.tipsEarned)],
          [G.success ? "Star bonus" : "Consolation (50%)", G.success ? "+$" + G.bonus : "$" + Math.floor(G.earned * 0.5)]
        ];
        for (var r = 0; r < rows.length; r++) {
          txt(rows[r][0], VW / 2 - 140, 200 + r * 24, 15, "#cfe6f4", "left", { w: "600" });
          txt(rows[r][1], VW / 2 + 140, 200 + r * 24, 15, "#ffffff", "right");
        }
        txt("Added to bank: $" + G.banked + "   (Bank $" + save.bank + ")", VW / 2, 360, 16, "#ffe14a", "center", { stroke: OUTLINE, lw: 3.5 });
        var by = 378;
        button(VW / 2 - 190, by, 120, 40, "SHOP", { size: 16, color: "#3f9bea", dark: "#1f5f9e", fn: function () { shop.from = "results"; shop.scroll = 0; screen = "shop"; } });
        button(VW / 2 - 60, by, 120, 40, G.success ? "NEXT DAY" : "RETRY", { size: 15, color: "#43b04a", dark: "#25702b", fn: function () { newShift(G.success ? G.day + 1 : G.day); screen = "play"; } });
        button(VW / 2 + 70, by, 120, 40, "MENU", { size: 16, color: "#8a97a3", dark: "#5a6a74", fn: function () { screen = "title"; G = null; } });
      }

      // ---------------- title ----------------
      function drawTitle(th) {
        drawBackground(th, 0.92, false);
        drawEquippedShip(false);
        drawClock(0.9);
        // idle waddling penguins
        var wx = (clockT * 30) % (VW + 100) - 50;
        drawPenguin(wx, 440, { s: 0.9, face: 1, moving: true, walk: clockT * 10, scarf: "#3f9bea" });
        drawPenguin(VW - ((clockT * 22) % (VW + 100)) + 50, 410, { s: 0.8, face: -1, moving: true, walk: clockT * 9, scarf: "#e53935" });
        // logo
        var bob = Math.sin(clockT * 2) * 3;
        g.save(); g.translate(VW / 2, 150 + bob);
        rr(-215, -64, 430, 120, 20); g.fillStyle = "#1c3f78"; g.fill(); g.lineWidth = 5; g.strokeStyle = OUTLINE; g.stroke();
        rr(-205, -56, 410, 104, 14); g.strokeStyle = "#7fb4ff"; g.lineWidth = 2; g.stroke();
        txt("PENGUIN", 0, -6, 58, "#ffffff", "center", { stroke: "#0d2250", lw: 9 });
        txt("DINER", 0, 42, 50, "#ff8a1f", "center", { stroke: "#0d2250", lw: 9 });
        g.restore();
        drawPenguin(VW / 2 - 232, 236 + bob, { s: 0.8, face: 1, hat: "bonnet", apron: "#f9c5dc" });
        drawPenguin(VW / 2 + 236, 236 + bob, { s: 0.8, face: -1, scarf: "#ee6fa9" });
        var cont = save.day > 1;
        button(VW / 2 - 110, 262, 220, 50, cont ? "CONTINUE - DAY " + save.day : "PLAY", { size: 20, color: "#43b04a", dark: "#25702b", fn: function () { newShift(save.day); screen = "play"; playMusic(); } });
        button(VW / 2 - 110, 324, 106, 40, "SHOP", { size: 16, color: "#3f9bea", dark: "#1f5f9e", fn: function () { shop.from = "title"; shop.scroll = 0; screen = "shop"; } });
        button(VW / 2 + 4, 324, 106, 40, save.music ? "MUSIC ON" : "MUSIC OFF", { size: 13, color: "#8a6fd6", dark: "#58449a", fn: toggleMusic });
        panel(VW / 2 - 150, 378, 300, 56, "rgba(20,45,70,0.82)");
        txt("Bank $" + save.bank + "    Best day " + save.bestDay, VW / 2, 402, 15, "#ffe9a8", "center");
        txt("Total earned $" + Math.round(save.totalEarned) + "    Best shift $" + save.bestShift, VW / 2, 424, 12, "#cfe6f4", "center", { w: "600" });
        if (cont) {
          button(VW - 118, 440, 106, 30, "NEW GAME", { size: 11, color: "#8a97a3", dark: "#5a6a74", fn: confirmReset });
        }
      }
      var resetArmed = 0;
      function confirmReset() {
        if (resetArmed > clockT) { save = defaultSave(); persist(); resetArmed = 0; toastMsg("Progress reset"); }
        else { resetArmed = clockT + 3; toastMsg("Tap NEW GAME again to erase all progress"); }
      }

      // ---------------- shop ----------------
      var TABS = [["up", "UPGRADES"], ["boost", "BOOSTS"], ["theme", "THEMES"], ["ship", "SHIPS"]];

      function shopRows() {
        var rows = [], i;
        if (shop.tab === "up") {
          for (i = 0; i < UPGRADES.length; i++) {
            (function (u) {
              var l = lvl(u.id), maxed = l >= u.max;
              rows.push({
                kind: "up", icon: u.icon, name: u.name, desc: u.desc, pips: u.max, level: l,
                btn: maxed ? "MAX" : "$" + u.cost[l], disabled: maxed || save.bank < u.cost[l], owned: maxed,
                act: function () {
                  if (maxed || save.bank < u.cost[l]) { if (!maxed) toastMsg("Not enough money"); return; }
                  save.bank -= u.cost[l]; save.up[u.id] = l + 1; persist(); haptic("success");
                  try { ctx.platform.interact({ upgrade: u.id }); } catch (e) {}
                }
              });
            })(UPGRADES[i]);
          }
        } else if (shop.tab === "boost") {
          for (i = 0; i < BOOSTS.length; i++) {
            (function (b) {
              var n = save.boosts[b.id] || 0;
              rows.push({
                kind: "boost", icon: b.icon, name: b.name + "   x" + n, desc: b.desc,
                btn: n >= 9 ? "FULL" : "$" + b.cost, disabled: n >= 9 || save.bank < b.cost,
                act: function () {
                  if (n >= 9) return;
                  if (save.bank < b.cost) { toastMsg("Not enough money"); return; }
                  save.bank -= b.cost; save.boosts[b.id] = n + 1; persist(); haptic("success");
                }
              });
            })(BOOSTS[i]);
          }
        } else if (shop.tab === "theme") {
          for (i = 0; i < THEMES.length; i++) {
            (function (t) {
              var owned = !!save.themes[t.id], equipped = save.theme === t.id;
              rows.push({
                kind: "theme", theme: t, name: t.name, desc: t.desc, owned: owned, equipped: equipped,
                btn: equipped ? "ACTIVE" : (owned ? "USE" : "$" + t.cost), disabled: equipped || (!owned && save.bank < t.cost),
                act: function () {
                  if (equipped) return;
                  if (!owned) {
                    if (save.bank < t.cost) { toastMsg("Not enough money"); return; }
                    save.bank -= t.cost; save.themes[t.id] = 1;
                  }
                  save.theme = t.id; persist(); haptic("success");
                }
              });
            })(THEMES[i]);
          }
        } else {
          for (i = 0; i < SHIPS.length; i++) {
            (function (s) {
              var owned = !!save.ships[s.id], equipped = save.ship === s.id;
              rows.push({
                kind: "ship", ship: s, name: s.name, desc: s.perk, owned: owned, equipped: equipped,
                btn: equipped ? "ACTIVE" : (owned ? "SAIL" : "$" + s.cost), disabled: equipped || (!owned && save.bank < s.cost),
                act: function () {
                  if (equipped) return;
                  if (!owned) {
                    if (save.bank < s.cost) { toastMsg("Not enough money"); return; }
                    save.bank -= s.cost; save.ships[s.id] = 1;
                  }
                  save.ship = s.id; persist(); haptic("success");
                }
              });
            })(SHIPS[i]);
          }
        }
        return rows;
      }

      function drawShop(th) {
        g.fillStyle = "#13293d"; g.fillRect(0, 0, VW, VH);
        for (var s = 0; s < 30; s++) { g.fillStyle = "rgba(255,255,255,0.05)"; ell((s * 83) % VW, (s * 47) % VH, 40, 14); }
        // header
        g.fillStyle = "#1b3b57"; g.fillRect(0, 0, VW, 54); g.fillStyle = OUTLINE; g.fillRect(0, 54, VW, 3);
        button(10, 9, 84, 36, "BACK", { size: 15, color: "#8a97a3", dark: "#5a6a74", fn: function () { screen = shop.from === "play" && G ? "play" : (shop.from === "results" && G ? "results" : "title"); if (screen === "play" && G && G.state === "ready") { D = derive(); rebuildTables(); } } });
        txt("SHOP", VW / 2, 38, 28, "#ffffff", "center", { stroke: OUTLINE, lw: 5 });
        ell(VW - 128, 28, 12, 12, "#ffcf33", OUTLINE, 2); txt("$", VW - 128, 33, 15, "#a86a00", "center");
        txt(String(save.bank), VW - 108, 36, 22, "#ffe14a", "left", { stroke: OUTLINE, lw: 4 });
        // tabs
        var tw = (VW - 20) / TABS.length;
        for (var t = 0; t < TABS.length; t++) {
          (function (id) {
            button(10 + t * tw + 2, 64, tw - 4, 32, TABS[t][1], { size: 14, color: shop.tab === id ? "#f5a623" : "#3d5a73", dark: shop.tab === id ? "#b8690b" : "#274055", fn: function () { shop.tab = id; shop.scroll = 0; } });
          })(TABS[t][0]);
        }
        var rows = shopRows();
        var top = 106, rowH = 78, gap = 6, viewH = VH - top - 8;
        var contentH = rows.length * (rowH + gap);
        var maxScroll = Math.max(0, contentH - viewH);
        shop.scroll = clamp(shop.scroll, 0, maxScroll);
        g.save();
        g.beginPath(); g.rect(0, top, VW, viewH); g.clip();
        for (var i = 0; i < rows.length; i++) {
          var r = rows[i], y = top + i * (rowH + gap) - shop.scroll;
          if (y + rowH < top || y > VH) continue;
          panel(14, y, VW - 28, rowH, r.equipped ? "rgba(30,90,70,0.9)" : "rgba(27,59,87,0.95)");
          // icon area
          if (r.kind === "theme") {
            var tt = r.theme;
            var gr = g.createLinearGradient(0, y + 10, 0, y + 68);
            gr.addColorStop(0, tt.sky[2][0]); gr.addColorStop(0.45, tt.sky[2][1]); gr.addColorStop(0.46, tt.sea[0]); gr.addColorStop(0.7, tt.sea[1]); gr.addColorStop(0.71, tt.ground); gr.addColorStop(1, tt.ground2);
            rr(26, y + 10, 76, 58, 8); g.fillStyle = gr; g.fill(); g.lineWidth = 2; g.strokeStyle = OUTLINE; g.stroke();
            ell(64, y + 56, 20, 7, tt.table, OUTLINE, 1.5);
          } else if (r.kind === "ship") {
            rr(26, y + 10, 76, 58, 8); g.fillStyle = "#3f86b3"; g.fill(); g.lineWidth = 2; g.strokeStyle = OUTLINE; g.stroke();
            drawShip(r.ship.id, 64, y + 46, 0.48);
          } else {
            ell(64, y + 39, 29, 29, "#27506f", OUTLINE, 2.5);
            icon(r.icon, 64, y + 39, 1.5);
          }
          txt(r.name, 118, y + 26, 17, "#ffffff", "left");
          wrapLeft(r.desc, 118, y + 44, VW - 118 - 150, 12, "#bcd4e4", 2);
          if (r.kind === "up") {
            for (var p = 0; p < r.pips; p++) {
              rr(118 + p * 16, y + 63, 13, 7, 3); g.fillStyle = p < r.level ? "#7dff7a" : "rgba(255,255,255,0.18)"; g.fill();
            }
          }
          if (r.kind !== "up" && r.kind !== "boost") {
            if (r.owned && !r.equipped) txt("OWNED", 118, y + 68, 11, "#7dff7a", "left");
          }
          var rrow = r;
          button(VW - 28 - 100, y + 20, 100, 38, r.btn, { size: 16, disabled: r.disabled && !r.equipped, color: r.equipped ? "#2f9e6b" : (r.owned ? "#3f9bea" : "#f5a623"), dark: r.equipped ? "#1c6a47" : (r.owned ? "#1f5f9e" : "#b8690b"), fn: function () { rrow.act(); } });
          if (r.disabled && !r.equipped && !r.owned) hit(VW - 128, y + 20, VW - 28, y + 58, function () { rrow.act(); });
        }
        g.restore();
        if (maxScroll > 0) {
          var th2 = viewH * viewH / contentH, ty = top + (viewH - th2) * (shop.scroll / maxScroll);
          rr(VW - 8, ty, 4, th2, 2); g.fillStyle = "rgba(255,255,255,0.35)"; g.fill();
        }
      }

      function rebuildTables() {
        // after shopping before the shift opens: refresh tables to match purchases
        var day = G.day;
        newShift(day);
      }

      function wrapLeft(text, x, y, maxW, size, color, maxLines) {
        var words = text.split(" "), line = "", lines = [];
        g.font = "600 " + size + "px " + FONT;
        for (var i = 0; i < words.length; i++) {
          var test = line ? line + " " + words[i] : words[i];
          if (g.measureText(test).width > maxW && line) { lines.push(line); line = words[i]; } else line = test;
        }
        lines.push(line);
        for (var j = 0; j < lines.length && j < maxLines; j++) txt(lines[j], x, y + j * (size + 2), size, color, "left", { w: "600" });
      }

      // -------------------------------------------------------------------
      // Frame render
      // -------------------------------------------------------------------
      function render() {
        hitRegions.length = 0;
        var w = W(), h = H();
        // Keep the whole playfield inside the content safe area (clear of the
        // camera cutout and the logo button); the background runs edge to edge.
        var area = ctx.contentSafeArea || ctx.safeArea || { top: 0, right: 0, bottom: 0, left: 0 };
        var aw = Math.max(50, w - (area.left || 0) - (area.right || 0));
        var ah = Math.max(50, h - (area.top || 0) - (area.bottom || 0));
        scale = Math.min(aw / VW, ah / VH);
        offX = (area.left || 0) + (aw - VW * scale) / 2;
        offY = (area.top || 0) + (ah - VH * scale) / 2;
        var th = theme();
        var bgp = G && screen !== "title" && screen !== "shop" ? clamp(G.time / G.dayLen, 0, 1) : 0.92;
        var skyc = skyColors(th, bgp);
        g.fillStyle = th.ground; g.fillRect(0, 0, w, h);
        var skyG = g.createLinearGradient(0, 0, 0, offY + 56 * scale);
        skyG.addColorStop(0, skyc[0]); skyG.addColorStop(1, skyc[1]);
        g.fillStyle = skyG; g.fillRect(0, 0, w, offY + 56 * scale);
        g.fillStyle = th.sea[0]; g.fillRect(0, offY + 52 * scale, w, 60 * scale);
        if (screen === "shop") { g.fillStyle = "#13293d"; g.fillRect(0, 0, w, h); }
        g.save();
        g.translate(offX, offY); g.scale(scale, scale);
        g.beginPath(); g.rect(0, 0, VW, VH); g.clip();
        try {
          if (screen === "title") drawTitle(th);
          else if (screen === "shop") drawShop(th);
          else if (G) {
            drawPlay(th);
            if (screen === "play" && G.state === "ready") drawReady(th);
            else if (screen === "results") drawResults(th);
            else if (paused) drawPaused();
          }
          if (toast.t > 0) {
            g.globalAlpha = clamp(toast.t, 0, 1);
            panel(VW / 2 - 190, 440, 380, 30, "rgba(15,30,45,0.92)");
            txt(toast.text, VW / 2, 460, 14, "#fff", "center");
            g.globalAlpha = 1;
          }
        } catch (err) {
          g.restore();
          try { ctx.platform.error(err); } catch (e2) {}
          g.save();
          g.fillStyle = "#fff"; g.font = "12px sans-serif"; g.fillText("render error: " + err.message, 10, 20);
        }
        g.restore();
      }

      // -------------------------------------------------------------------
      // Input
      // -------------------------------------------------------------------
      function pointFromClient(cx, cy) {
        var rect = canvasEl && canvasEl.getBoundingClientRect ? canvasEl.getBoundingClientRect() : { left: 0, top: 0 };
        return { x: (cx - rect.left - offX) / scale, y: (cy - rect.top - offY) / scale };
      }
      function pointFromEvent(e) {
        var t = (e.touches && e.touches[0]) || (e.changedTouches && e.changedTouches[0]);
        var cx = t ? t.clientX : e.clientX, cy = t ? t.clientY : e.clientY;
        return pointFromClient(cx || 0, cy || 0);
      }
      function preventIfPossible(e) { try { if (e.cancelable) e.preventDefault(); } catch (err) {} }

      var lastTapAt = 0, lastTapXY = null;
      function dispatchTap(x, y) {
        var now = (typeof performance !== "undefined" ? performance.now() : Date.now());
        if (lastTapXY && now - lastTapAt < 350 && Math.abs(x - lastTapXY.x) < 6 && Math.abs(y - lastTapXY.y) < 6) return;
        lastTapAt = now; lastTapXY = { x: x, y: y };
        for (var i = hitRegions.length - 1; i >= 0; i--) {
          var r = hitRegions[i];
          if (x >= r.x0 && x <= r.x1 && y >= r.y0 && y <= r.y1) { r.fn(); break; }
        }
        render();
      }

      function onDown(e) {
        preventIfPossible(e);
        var p = pointFromEvent(e);
        drag.on = true; drag.y0 = p.y; drag.s0 = shop.scroll; drag.moved = false;
      }
      function onMove(e) {
        if (!drag.on) return;
        preventIfPossible(e);
        var p = pointFromEvent(e);
        if (screen === "shop" && Math.abs(p.y - drag.y0) > 5) { shop.scroll = drag.s0 - (p.y - drag.y0); drag.moved = true; }
      }
      function onUp(e) {
        var p = pointFromEvent(e);
        var was = drag.on;
        drag.on = false;
        if (was && !drag.moved && Math.abs(p.y - drag.y0) < 8) dispatchTap(p.x, p.y);
        else render();
      }
      function onCancel() { drag.on = false; }
      function onClickFallback(e) {
        var p = pointFromClient(e.clientX, e.clientY);
        dispatchTap(p.x, p.y);
      }

      if (canvasEl) {
        if (canvasEl.style) { canvasEl.style.touchAction = "none"; canvasEl.style.userSelect = "none"; }
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

      // Test/debug hook so automated checks can inspect the live game.
      try { if (window.__PD_TEST__) window.__penguinDiner = { get G() { return G; }, get save() { return save; }, get screen() { return screen; }, get view() { return { scale: scale, offX: offX, offY: offY }; }, regions: hitRegions, set paused(v) { paused = v; }, get D() { return D; } }; } catch (e) {}

      render();
      try { ctx.platform.ready(); } catch (e) {}

      function tick(dtMs) { update(Math.min(0.05, (dtMs || 16) / 1000)); }
      if (ctx.game && ctx.game.loop) ctx.game.loop({ update: tick, render: render });
      else ctx.onFrame(function (dtMs) { tick(dtMs); render(); });

      ctx.onDestroy(function () {
        persist();
        try { ctx.music.stop({ fadeOutMs: 400 }); } catch (e) {}
      });
    }
  };
})();
