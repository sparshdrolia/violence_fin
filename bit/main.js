// Penguin Diner — a penguin-run restaurant time-management bit.
// You run a penguin waitress: greet newly seated customers before their
// patience runs out, walk her to the kitchen counter to build each order
// ingredient-by-ingredient, then carry the finished tray back to serve.
// Earn coins across days and spend them on upgrades between shifts.
// Entirely procedural graphics — no packaged assets.

window.plethoraBit = {
  meta: {
    name: "Penguin Diner"
  },

  async init(ctx) {
    // ---------------------------------------------------------------
    // Setup
    // ---------------------------------------------------------------
    const canvas = ctx.createCanvas2D();
    const g = canvas.getContext("2d");

    const DISHES = [
      { id: "fish", color: "#6fa8dc", accent: "#3d6ea5" },
      { id: "sushi", color: "#f6f2e9", accent: "#e05c6e" },
      { id: "soda", color: "#e05c5c", accent: "#ffffff" },
      { id: "cake", color: "#c98a52", accent: "#7a3b8f" }
    ];
    const MAX_QUEUE = 3;
    const SHIFT_SECONDS = 90;
    const START_STARS = 3;
    const PRE_ORDER_SECONDS = 12;
    const BASE_SPEED = 0.62; // fraction of width per second

    const UPGRADES = [
      { id: "speed", name: "Faster Waddle", max: 3, baseCost: 25, costGrow: 1.6 },
      { id: "tables", name: "Extra Table", max: 2, baseCost: 70, costGrow: 1.8 },
      { id: "tips", name: "Big Tips", max: 3, baseCost: 35, costGrow: 1.6 }
    ];

    function rand(min, max) { return min + Math.random() * (max - min); }
    function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
    function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

    function roundRectPath(x, y, w, h, r) {
      r = Math.min(r, w / 2, h / 2);
      g.beginPath();
      g.moveTo(x + r, y);
      g.lineTo(x + w - r, y);
      g.arcTo(x + w, y, x + w, y + r, r);
      g.lineTo(x + w, y + h - r);
      g.arcTo(x + w, y + h, x + w - r, y + h, r);
      g.lineTo(x + r, y + h);
      g.arcTo(x, y + h, x, y + h - r, r);
      g.lineTo(x, y + r);
      g.arcTo(x, y, x + r, y, r);
      g.closePath();
    }

    function upgradeCost(def, level) {
      return Math.round(def.baseCost * Math.pow(def.costGrow, level));
    }

    // ---------------------------------------------------------------
    // Persistent save (coins, upgrades, day, best score)
    // ---------------------------------------------------------------
    let save = { day: 1, coinsBank: 0, bestScore: 0, upgrades: { speed: 0, tables: 0, tips: 0 } };
    try {
      const stored = await ctx.storage.get("save");
      if (stored && typeof stored === "object") {
        save.day = stored.day || 1;
        save.coinsBank = stored.coinsBank || 0;
        save.bestScore = stored.bestScore || 0;
        save.upgrades = Object.assign(save.upgrades, stored.upgrades || {});
      }
    } catch (e) {
      // storage unavailable — play as a fresh career
    }
    async function persistSave() {
      try { await ctx.storage.set("save", save); } catch (e) { /* best effort */ }
    }

    function tableCount() { return 3 + save.upgrades.tables; }
    function waitressSpeed() { return BASE_SPEED * (1 + 0.25 * save.upgrades.speed); }
    function tipBonus() { return save.upgrades.tips * 0.15; }

    // ---------------------------------------------------------------
    // Game state
    // ---------------------------------------------------------------
    const S = {
      screen: "title", // "title" | "playing" | "shop"
      coinsEarned: 0,
      stars: START_STARS,
      timeLeft: SHIFT_SECONDS,
      elapsed: 0,
      served: 0,
      selectedTable: -1,
      floaters: [],
      snow: [],
      shakeTable: -1,
      shakeTimer: 0,
      tables: [],
      queue: [],
      shopRects: {},
      waitress: { x: 0, targetX: 0, moving: false, onArrive: null, carrying: -1, bounce: 0 }
    };

    for (let i = 0; i < 40; i++) {
      S.snow.push({ x: Math.random(), y: Math.random(), r: rand(1, 2.6), s: rand(6, 22) });
    }

    function freshTables() {
      const arr = [];
      for (let i = 0; i < tableCount(); i++) {
        arr.push({ occupied: false, customer: null, x: 0, y: 0, w: 0, h: 0 });
      }
      return arr;
    }

    function resetShift() {
      S.screen = "playing";
      S.coinsEarned = 0;
      S.stars = START_STARS;
      S.timeLeft = SHIFT_SECONDS;
      S.elapsed = 0;
      S.served = 0;
      S.selectedTable = -1;
      S.floaters = [];
      S.tables = freshTables();
      S.queue = [];
      S.spawnTimer = 1.2;
      S.waitress.x = 0.5;
      S.waitress.targetX = 0.5;
      S.waitress.moving = false;
      S.waitress.onArrive = null;
      S.waitress.carrying = -1;
    }

    function difficultySeqLen() {
      return clamp(1 + Math.floor(save.day / 2) + Math.floor(S.served / 6), 1, 4);
    }
    function difficultyPatience() {
      return clamp(13 - save.day * 0.6 - S.served * 0.15, 6, 13);
    }
    function difficultySpawn() {
      return clamp(3.2 - save.day * 0.15 - S.elapsed / 50, 1.2, 3.2);
    }

    function makeCustomer() {
      const len = difficultySeqLen();
      const order = [];
      for (let i = 0; i < len; i++) order.push(pick(DISHES).id);
      return {
        order,
        progress: 0,
        stage: "waiting_order", // waiting_order | ordered
        preOrderPatience: 1,
        patience: 1,
        patienceMax: difficultyPatience(),
        mood: "ok",
        settleT: 0,
        eatT: -1,
        bounce: Math.random() * Math.PI * 2
      };
    }

    function trySeatQueue() {
      if (S.queue.length === 0) return;
      for (let i = 0; i < S.tables.length; i++) {
        const t = S.tables[i];
        if (!t.occupied) {
          t.occupied = true;
          t.customer = S.queue.shift();
          break;
        }
      }
    }

    function addFloater(x, y, text, color) {
      S.floaters.push({ x, y, text, color, t: 1.1 });
    }

    function loseStar() {
      S.stars -= 1;
      if (S.stars <= 0) endShift();
    }

    // ---------------------------------------------------------------
    // Layout (fractions of container size, recomputed every frame)
    // ---------------------------------------------------------------
    const L = {};
    function layout() {
      const w = ctx.width, h = ctx.height;
      const safeBottom = (ctx.safeArea && ctx.safeArea.bottom) || 0;
      L.w = w; L.h = h;
      L.hudH = h * 0.09;
      L.kitchenY = L.hudH;
      L.kitchenH = h * 0.13;
      L.aisleY = L.kitchenY + L.kitchenH;
      L.aisleH = h * 0.1;
      L.tableAreaY = L.aisleY + L.aisleH;
      L.tableAreaH = h * 0.38;
      L.queueY = L.tableAreaY + L.tableAreaH;
      L.queueH = h - L.queueY - safeBottom - h * 0.02;

      const tw = w / S.tables.length;
      for (let i = 0; i < S.tables.length; i++) {
        const t = S.tables[i];
        t.x = tw * i + tw / 2;
        t.y = L.tableAreaY + L.tableAreaH * 0.62;
        t.w = tw * 0.62;
        t.h = L.tableAreaH * 0.34;
      }

      L.dishSize = Math.min(w / (DISHES.length + 1), L.kitchenH * 0.8);
      L.dishGap = w / DISHES.length;
      L.kitchenDockX = w * 0.5;
      L.waitressY = L.aisleY + L.aisleH * 0.5;
      L.waitressSize = Math.min(L.aisleH * 1.5, w * 0.14);
    }

    function xFrac(px) { return px / L.w; }
    function fracX(f) { return f * L.w; }

    // ---------------------------------------------------------------
    // Waitress movement
    // ---------------------------------------------------------------
    function moveWaitressTo(targetXFrac, onArrive) {
      const W = S.waitress;
      if (Math.abs(W.x - targetXFrac) < 0.01) {
        W.moving = false;
        W.onArrive = null;
        if (onArrive) onArrive();
        return;
      }
      W.targetX = targetXFrac;
      W.moving = true;
      W.onArrive = onArrive || null;
    }

    function updateWaitress(dtSec) {
      const W = S.waitress;
      W.bounce += dtSec * (W.moving ? 6 : 1.5);
      if (!W.moving) return;
      const speed = waitressSpeed();
      const dx = W.targetX - W.x;
      const step = speed * dtSec;
      if (Math.abs(dx) <= step) {
        W.x = W.targetX;
        W.moving = false;
        const cb = W.onArrive;
        W.onArrive = null;
        if (cb) cb();
      } else {
        W.x += Math.sign(dx) * step;
      }
    }

    // ---------------------------------------------------------------
    // Drawing helpers
    // ---------------------------------------------------------------
    function drawBackground(dtMs) {
      const grad = g.createLinearGradient(0, 0, 0, L.h);
      grad.addColorStop(0, "#bfe3ff");
      grad.addColorStop(1, "#eaf6ff");
      g.fillStyle = grad;
      g.fillRect(0, 0, L.w, L.h);

      g.fillStyle = "#eafcff";
      g.fillRect(0, L.aisleY, L.w, L.h - L.aisleY);
      g.strokeStyle = "rgba(120,190,220,0.35)";
      g.lineWidth = 2;
      for (let i = 1; i < S.tables.length; i++) {
        const x = (L.w / S.tables.length) * i;
        g.beginPath();
        g.moveTo(x, L.tableAreaY);
        g.lineTo(x, L.h);
        g.stroke();
      }

      g.fillStyle = "rgba(255,255,255,0.9)";
      for (const flake of S.snow) {
        flake.y += (flake.s * dtMs) / L.h;
        if (flake.y > 1) { flake.y = 0; flake.x = Math.random(); }
        g.beginPath();
        g.arc(flake.x * L.w, flake.y * L.h, flake.r, 0, Math.PI * 2);
        g.fill();
      }
    }

    function drawHUD() {
      g.fillStyle = "rgba(255,255,255,0.55)";
      g.fillRect(0, 0, L.w, L.hudH);

      g.fillStyle = "#2c3e50";
      g.font = `bold ${Math.round(L.hudH * 0.4)}px sans-serif`;
      g.textAlign = "left";
      g.textBaseline = "middle";
      g.fillText("Day " + save.day + " · " + S.coinsEarned + "c", L.w * 0.03, L.hudH * 0.5);

      g.textAlign = "right";
      g.fillText(Math.max(0, Math.ceil(S.timeLeft)) + "s", L.w * 0.97, L.hudH * 0.5);

      g.textAlign = "center";
      for (let i = 0; i < START_STARS; i++) {
        const cx = L.w * 0.5 + (i - (START_STARS - 1) / 2) * L.hudH * 0.55;
        drawHeart(cx, L.hudH * 0.5, L.hudH * 0.22, i < S.stars ? "#e05c6e" : "rgba(150,150,150,0.35)");
      }
    }

    function drawHeart(x, y, r, color) {
      g.fillStyle = color;
      g.beginPath();
      g.moveTo(x, y + r * 0.3);
      g.bezierCurveTo(x - r * 1.3, y - r * 0.9, x - r * 0.2, y - r * 1.5, x, y - r * 0.5);
      g.bezierCurveTo(x + r * 0.2, y - r * 1.5, x + r * 1.3, y - r * 0.9, x, y + r * 0.3);
      g.fill();
    }

    function drawDishIcon(type, x, y, size, opts) {
      opts = opts || {};
      const d = DISHES.find(d => d.id === type);
      g.save();
      g.translate(x, y);
      if (opts.scale) g.scale(opts.scale, opts.scale);

      g.fillStyle = "rgba(255,255,255,0.85)";
      g.beginPath();
      g.ellipse(0, size * 0.32, size * 0.46, size * 0.14, 0, 0, Math.PI * 2);
      g.fill();

      if (type === "fish") {
        g.fillStyle = d.color;
        g.beginPath();
        g.ellipse(0, 0, size * 0.34, size * 0.18, 0, 0, Math.PI * 2);
        g.fill();
        g.beginPath();
        g.moveTo(size * 0.3, 0);
        g.lineTo(size * 0.48, -size * 0.16);
        g.lineTo(size * 0.48, size * 0.16);
        g.closePath();
        g.fillStyle = d.accent;
        g.fill();
        g.fillStyle = "#1c2733";
        g.beginPath();
        g.arc(-size * 0.16, -size * 0.03, size * 0.035, 0, Math.PI * 2);
        g.fill();
      } else if (type === "sushi") {
        g.fillStyle = d.color;
        roundRectPath(-size * 0.28, -size * 0.16, size * 0.56, size * 0.28, size * 0.08);
        g.fill();
        g.fillStyle = d.accent;
        g.beginPath();
        g.ellipse(0, -size * 0.1, size * 0.24, size * 0.08, 0, 0, Math.PI * 2);
        g.fill();
        g.fillStyle = "#2f5233";
        g.fillRect(-size * 0.28, -size * 0.03, size * 0.08, size * 0.16);
      } else if (type === "soda") {
        g.fillStyle = d.color;
        g.beginPath();
        g.moveTo(-size * 0.18, -size * 0.24);
        g.lineTo(size * 0.18, -size * 0.24);
        g.lineTo(size * 0.14, size * 0.2);
        g.lineTo(-size * 0.14, size * 0.2);
        g.closePath();
        g.fill();
        g.strokeStyle = d.accent;
        g.lineWidth = size * 0.05;
        g.beginPath();
        g.moveTo(size * 0.02, -size * 0.4);
        g.lineTo(-size * 0.06, -size * 0.05);
        g.stroke();
      } else if (type === "cake") {
        g.fillStyle = d.color;
        g.beginPath();
        g.moveTo(-size * 0.3, size * 0.14);
        g.lineTo(0, -size * 0.26);
        g.lineTo(size * 0.3, size * 0.14);
        g.closePath();
        g.fill();
        g.fillStyle = "#f6f2e9";
        g.fillRect(-size * 0.3, size * 0.02, size * 0.6, size * 0.05);
        g.fillStyle = d.accent;
        g.beginPath();
        g.arc(0, -size * 0.3, size * 0.06, 0, Math.PI * 2);
        g.fill();
      }
      g.restore();
    }

    function drawPenguin(x, y, size, opts) {
      opts = opts || {};
      const mood = opts.mood || "ok";
      const bob = opts.bob || 0;
      g.save();
      g.translate(x, y + bob);
      if (opts.scale) g.scale(opts.scale, opts.scale);

      g.fillStyle = "rgba(70,110,140,0.25)";
      g.beginPath();
      g.ellipse(0, size * 0.62, size * 0.42, size * 0.1, 0, 0, Math.PI * 2);
      g.fill();

      g.fillStyle = "#f2a33c";
      g.beginPath();
      g.ellipse(-size * 0.16, size * 0.58, size * 0.12, size * 0.06, 0, 0, Math.PI * 2);
      g.ellipse(size * 0.16, size * 0.58, size * 0.12, size * 0.06, 0, 0, Math.PI * 2);
      g.fill();

      g.fillStyle = "#2b3a4a";
      g.beginPath();
      g.ellipse(0, 0, size * 0.34, size * 0.5, 0, 0, Math.PI * 2);
      g.fill();

      g.fillStyle = "#eef3f6";
      g.beginPath();
      g.ellipse(0, size * 0.08, size * 0.22, size * 0.36, 0, 0, Math.PI * 2);
      g.fill();

      g.fillStyle = "#2b3a4a";
      g.beginPath();
      g.ellipse(-size * 0.34, size * 0.02, size * 0.09, size * 0.26, -0.3, 0, Math.PI * 2);
      g.ellipse(size * 0.34, size * 0.02, size * 0.09, size * 0.26, 0.3, 0, Math.PI * 2);
      g.fill();

      g.fillStyle = "#2b3a4a";
      g.beginPath();
      g.arc(0, -size * 0.46, size * 0.24, 0, Math.PI * 2);
      g.fill();

      g.fillStyle = "#f2a33c";
      g.beginPath();
      g.moveTo(-size * 0.08, -size * 0.44);
      g.lineTo(size * 0.08, -size * 0.44);
      g.lineTo(0, -size * 0.34);
      g.closePath();
      g.fill();

      if (opts.waitress) {
        g.fillStyle = "#e05c6e";
        g.beginPath();
        g.moveTo(0, -size * 0.28);
        g.lineTo(-size * 0.1, -size * 0.18);
        g.lineTo(size * 0.1, -size * 0.18);
        g.closePath();
        g.fill();
      }

      g.fillStyle = "#ffffff";
      g.beginPath();
      g.arc(-size * 0.09, -size * 0.5, size * 0.06, 0, Math.PI * 2);
      g.arc(size * 0.09, -size * 0.5, size * 0.06, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = "#1c2733";
      const eyeDy = mood === "angry" ? size * 0.01 : -size * 0.01;
      g.beginPath();
      g.arc(-size * 0.09, -size * 0.5 + eyeDy, size * 0.03, 0, Math.PI * 2);
      g.arc(size * 0.09, -size * 0.5 + eyeDy, size * 0.03, 0, Math.PI * 2);
      g.fill();

      if (mood === "angry") {
        g.strokeStyle = "#c0392b";
        g.lineWidth = size * 0.035;
        g.beginPath();
        g.moveTo(-size * 0.16, -size * 0.58);
        g.lineTo(-size * 0.03, -size * 0.55);
        g.moveTo(size * 0.16, -size * 0.58);
        g.lineTo(size * 0.03, -size * 0.55);
        g.stroke();
      } else if (mood === "happy") {
        g.strokeStyle = "#e08b2c";
        g.lineWidth = size * 0.03;
        g.beginPath();
        g.arc(0, -size * 0.62, size * 0.1, 0.15 * Math.PI, 0.85 * Math.PI);
        g.stroke();
      }

      g.restore();
    }

    function drawWaitress() {
      const W = S.waitress;
      const x = fracX(W.x);
      const bob = Math.sin(W.bounce) * L.waitressSize * 0.03;
      drawPenguin(x, L.waitressY, L.waitressSize, { mood: "ok", bob, waitress: true });

      if (W.carrying >= 0) {
        const t = S.tables[W.carrying];
        const c = t && t.customer;
        if (c) {
          const trayY = L.waitressY - L.waitressSize * 0.75;
          g.fillStyle = "rgba(255,255,255,0.9)";
          g.strokeStyle = "#bcd8e8";
          g.lineWidth = 2;
          const trayW = L.waitressSize * 0.7;
          roundRectPath(x - trayW / 2, trayY - L.waitressSize * 0.12, trayW, L.waitressSize * 0.24, L.waitressSize * 0.06);
          g.fill();
          g.stroke();
          const n = c.order.length;
          for (let i = 0; i < n; i++) {
            drawDishIcon(c.order[i], x - trayW / 2 + trayW / (n + 1) * (i + 1), trayY, L.waitressSize * 0.22);
          }
        }
      }
    }

    function drawIceCube(x, y, w, h, fill) {
      g.fillStyle = "rgba(255,255,255,0.6)";
      g.fillRect(x, y, w, h);
      g.fillStyle = "#7fd4e0";
      g.fillRect(x, y, w * clamp(fill, 0, 1), h);
      g.strokeStyle = "rgba(60,120,140,0.5)";
      g.lineWidth = 1.5;
      g.strokeRect(x, y, w, h);
    }

    function drawKitchenDock() {
      g.fillStyle = "rgba(255,255,255,0.4)";
      g.fillRect(0, L.aisleY, L.w, L.aisleH);
      const x = fracX(0.5);
      g.strokeStyle = "rgba(120,190,220,0.6)";
      g.lineWidth = 2;
      g.setLineDash([4, 4]);
      g.beginPath();
      g.moveTo(x, L.aisleY);
      g.lineTo(x, L.aisleY + L.aisleH);
      g.stroke();
      g.setLineDash([]);
    }

    function drawTable(t, index) {
      const selected = S.selectedTable === index;
      g.fillStyle = selected ? "#ffe9a8" : "#dff2ff";
      g.strokeStyle = selected ? "#e0a83c" : "#9fd3e8";
      g.lineWidth = selected ? 4 : 2;
      roundRectPath(t.x - t.w / 2, t.y - t.h / 2, t.w, t.h, t.h * 0.25);
      g.fill();
      g.stroke();

      const c = t.customer;
      if (!c) return;

      const scale = 0.5 + 0.5 * Math.min(1, c.settleT);
      const bob = Math.sin(c.bounce) * (t.h * 0.03);
      const size = t.w * 0.62;

      let mood = "ok";
      if (c.eatT >= 0) mood = "happy";
      else if (c.mood === "angry") mood = "angry";

      drawPenguin(t.x, t.y - t.h * 0.35, size * scale, { mood, bob });

      if (c.settleT < 1) return;

      if (c.eatT >= 0) {
        g.font = `${Math.round(size * 0.4)}px sans-serif`;
        g.textAlign = "center";
        g.textBaseline = "middle";
        g.fillText(c.mood === "angry" ? "😤" : "😋", t.x, t.y - t.h * 1.05);
        return;
      }

      const bw = t.w * 0.92;
      const bh = t.h * 0.5;
      const bx = t.x - bw / 2;
      const by = t.y - t.h * 0.98 - bh;
      const shakeDx = (S.shakeTable === index && S.shakeTimer > 0)
        ? Math.sin(S.shakeTimer * 60) * 4 : 0;

      if (c.stage === "waiting_order") {
        g.fillStyle = "rgba(255,255,255,0.95)";
        g.strokeStyle = "#bcd8e8";
        g.lineWidth = 2;
        roundRectPath(bx + bw * 0.3, by, bw * 0.4, bh, bh * 0.3);
        g.fill();
        g.stroke();
        g.font = `${Math.round(bh * 0.55)}px sans-serif`;
        g.textAlign = "center";
        g.textBaseline = "middle";
        g.fillText("?", t.x, by + bh / 2);

        const pw = t.w * 0.8, ph = t.h * 0.1;
        drawIceCube(t.x - pw / 2, by - ph - 4, pw, ph, c.preOrderPatience);
        return;
      }

      g.fillStyle = "rgba(255,255,255,0.95)";
      g.strokeStyle = "#bcd8e8";
      g.lineWidth = 2;
      roundRectPath(bx + shakeDx, by, bw, bh, bh * 0.25);
      g.fill();
      g.stroke();
      g.beginPath();
      g.moveTo(t.x - 6 + shakeDx, by + bh);
      g.lineTo(t.x + 6 + shakeDx, by + bh);
      g.lineTo(t.x + shakeDx, by + bh + 8);
      g.closePath();
      g.fillStyle = "#ffffff";
      g.fill();

      const n = c.order.length;
      const iconSize = Math.min(bh * 0.78, bw / (n + 0.6));
      for (let i = 0; i < n; i++) {
        const ix = bx + bw / (n + 1) * (i + 1) + shakeDx;
        const iy = by + bh / 2;
        drawDishIcon(c.order[i], ix, iy, iconSize, { scale: i < c.progress ? 1.15 : 1 });
        if (i < c.progress) {
          g.strokeStyle = "#3fae5c";
          g.lineWidth = 3;
          g.beginPath();
          g.arc(ix, iy, iconSize * 0.55, 0, Math.PI * 2);
          g.stroke();
        }
      }

      const pw = t.w * 0.8, ph = t.h * 0.1;
      drawIceCube(t.x - pw / 2, by - ph - 4, pw, ph, c.patience);
    }

    function drawQueue() {
      const size = Math.min(L.queueH * 0.9, L.w * 0.16);
      for (let i = 0; i < S.queue.length; i++) {
        const x = L.w * 0.12 + i * size * 1.15;
        const y = L.queueY + L.queueH * 0.55;
        drawPenguin(x, y, size, { mood: "ok" });
      }
      if (S.queue.length === 0) return;
      g.fillStyle = "#5c7a8c";
      g.font = `${Math.round(size * 0.2)}px sans-serif`;
      g.textAlign = "left";
      g.fillText("waiting to be seated…", L.w * 0.12, L.queueY + L.queueH * 0.95);
    }

    function drawKitchen() {
      g.fillStyle = "rgba(255,255,255,0.5)";
      g.fillRect(0, L.kitchenY, L.w, L.kitchenH);
      const atKitchen = Math.abs(S.waitress.x - 0.5) < 0.01;
      for (let i = 0; i < DISHES.length; i++) {
        const cx = L.dishGap * i + L.dishGap / 2;
        const cy = L.kitchenY + L.kitchenH / 2;
        g.globalAlpha = atKitchen ? 1 : 0.55;
        g.fillStyle = "rgba(255,255,255,0.85)";
        roundRectPath(cx - L.dishSize * 0.55, L.kitchenY + L.kitchenH * 0.08,
          L.dishSize * 1.1, L.kitchenH * 0.84, L.kitchenH * 0.18);
        g.fill();
        drawDishIcon(DISHES[i].id, cx, cy, L.dishSize * 0.8);
        g.globalAlpha = 1;
      }
    }

    function drawFloaters(dt) {
      g.textAlign = "center";
      g.textBaseline = "middle";
      for (let i = S.floaters.length - 1; i >= 0; i--) {
        const f = S.floaters[i];
        f.t -= dt;
        f.y -= 24 * dt;
        if (f.t <= 0) { S.floaters.splice(i, 1); continue; }
        g.globalAlpha = clamp(f.t / 1.1, 0, 1);
        g.fillStyle = f.color;
        g.font = `bold ${Math.round(L.w * 0.05)}px sans-serif`;
        g.fillText(f.text, f.x, f.y);
        g.globalAlpha = 1;
      }
    }

    function fitFont(text, basePx, maxWidth, weight) {
      let size = basePx;
      g.font = `${weight} ${Math.round(size)}px sans-serif`;
      while (g.measureText(text).width > maxWidth && size > basePx * 0.35) {
        size -= basePx * 0.05;
        g.font = `${weight} ${Math.round(size)}px sans-serif`;
      }
      return size;
    }

    function drawCenteredPanel(title, lines, buttonText) {
      g.fillStyle = "rgba(20,40,55,0.55)";
      g.fillRect(0, 0, L.w, L.h);
      const pw = L.w * 0.82, ph = L.h * 0.5;
      const px = (L.w - pw) / 2, py = (L.h - ph) / 2;
      g.fillStyle = "#ffffff";
      roundRectPath(px, py, pw, ph, pw * 0.06);
      g.fill();

      g.fillStyle = "#2c3e50";
      g.textAlign = "center";
      g.textBaseline = "middle";
      fitFont(title, pw * 0.11, pw * 0.9, "bold");
      g.fillText(title, L.w / 2, py + ph * 0.24);

      g.font = `${Math.round(pw * 0.06)}px sans-serif`;
      lines.forEach((line, i) => {
        g.fillText(line, L.w / 2, py + ph * 0.48 + i * pw * 0.09);
      });

      const bh = ph * 0.18;
      const by = py + ph - bh - ph * 0.08;
      g.fillStyle = "#3fae5c";
      roundRectPath(px + pw * 0.15, by, pw * 0.7, bh, bh * 0.3);
      g.fill();
      g.fillStyle = "#ffffff";
      fitFont(buttonText, pw * 0.065, pw * 0.65, "bold");
      g.fillText(buttonText, L.w / 2, by + bh / 2);

      return { x: px + pw * 0.15, y: by, w: pw * 0.7, h: bh };
    }

    function drawShop() {
      g.fillStyle = "rgba(20,40,55,0.55)";
      g.fillRect(0, 0, L.w, L.h);
      const pw = L.w * 0.86, ph = L.h * 0.78;
      const px = (L.w - pw) / 2, py = (L.h - ph) / 2;
      g.fillStyle = "#ffffff";
      roundRectPath(px, py, pw, ph, pw * 0.05);
      g.fill();

      g.fillStyle = "#2c3e50";
      g.textAlign = "center";
      g.textBaseline = "middle";
      g.font = `bold ${Math.round(pw * 0.08)}px sans-serif`;
      g.fillText("Day " + save.day + " complete!", L.w / 2, py + ph * 0.08);

      g.font = `${Math.round(pw * 0.05)}px sans-serif`;
      g.fillText("Earned " + S.coinsEarned + "c  ·  Bank: " + save.coinsBank + "c", L.w / 2, py + ph * 0.15);

      S.shopRects = {};
      const rowH = ph * 0.15;
      UPGRADES.forEach((def, i) => {
        const level = save.upgrades[def.id];
        const rowY = py + ph * 0.23 + i * rowH;
        const maxed = level >= def.max;
        const cost = maxed ? null : upgradeCost(def, level);

        g.textAlign = "left";
        g.font = `bold ${Math.round(pw * 0.045)}px sans-serif`;
        g.fillStyle = "#2c3e50";
        g.fillText(def.name, px + pw * 0.06, rowY + rowH * 0.35);
        g.font = `${Math.round(pw * 0.035)}px sans-serif`;
        g.fillStyle = "#7a8ea0";
        g.fillText("Level " + level + " / " + def.max, px + pw * 0.06, rowY + rowH * 0.7);

        const bw = pw * 0.28, bh = rowH * 0.55;
        const bx = px + pw * 0.98 - bw, by = rowY + rowH * 0.5 - bh / 2;
        g.fillStyle = maxed ? "rgba(150,150,150,0.25)" : (save.coinsBank >= cost ? "#3fae5c" : "rgba(150,150,150,0.4)");
        roundRectPath(bx, by, bw, bh, bh * 0.3);
        g.fill();
        g.fillStyle = "#ffffff";
        g.textAlign = "center";
        g.font = `bold ${Math.round(pw * 0.035)}px sans-serif`;
        g.fillText(maxed ? "MAX" : cost + "c", bx + bw / 2, by + bh / 2);

        if (!maxed) S.shopRects[def.id] = { x: bx, y: by, w: bw, h: bh };
      });

      const cbh = ph * 0.12;
      const cby = py + ph - cbh - ph * 0.05;
      g.fillStyle = "#3fae5c";
      roundRectPath(px + pw * 0.15, cby, pw * 0.7, cbh, cbh * 0.3);
      g.fill();
      g.fillStyle = "#ffffff";
      g.textAlign = "center";
      const label = "Start Day " + (save.day + 1);
      fitFont(label, pw * 0.05, pw * 0.65, "bold");
      g.fillText(label, L.w / 2, cby + cbh / 2);
      S.shopRects.continue = { x: px + pw * 0.15, y: cby, w: pw * 0.7, h: cbh };
    }

    // ---------------------------------------------------------------
    // Update
    // ---------------------------------------------------------------
    function updatePlaying(dtSec) {
      S.elapsed += dtSec;
      S.timeLeft -= dtSec;
      if (S.shakeTimer > 0) S.shakeTimer -= dtSec;

      S.spawnTimer -= dtSec;
      if (S.spawnTimer <= 0 && S.queue.length < MAX_QUEUE) {
        S.queue.push(makeCustomer());
        S.spawnTimer = difficultySpawn();
      }
      trySeatQueue();
      updateWaitress(dtSec);

      for (let i = 0; i < S.tables.length; i++) {
        const t = S.tables[i];
        const c = t.customer;
        if (!c) continue;
        c.bounce += dtSec * 2;

        if (c.settleT < 1) {
          c.settleT = Math.min(1, c.settleT + dtSec * 2.2);
          continue;
        }

        if (c.eatT >= 0) {
          c.eatT += dtSec;
          if (c.eatT > 1.1) {
            t.occupied = false;
            t.customer = null;
            if (S.selectedTable === i) S.selectedTable = -1;
          }
          continue;
        }

        if (c.stage === "waiting_order") {
          c.preOrderPatience -= dtSec / PRE_ORDER_SECONDS;
          if (c.preOrderPatience <= 0) {
            c.mood = "angry";
            c.eatT = 0;
            loseStar();
          }
          continue;
        }

        c.patience -= dtSec / c.patienceMax;
        if (c.patience <= 0) {
          c.mood = "angry";
          c.eatT = 0;
          if (S.selectedTable === i) S.selectedTable = -1;
          if (S.waitress.carrying === i) S.waitress.carrying = -1;
          loseStar();
        }
      }

      if (S.timeLeft <= 0 && S.screen === "playing") {
        endShift();
      }
    }

    async function endShift() {
      if (S.screen !== "playing") return;
      S.screen = "shop";
      save.coinsBank += S.coinsEarned;
      save.bestScore = Math.max(save.bestScore, S.coinsEarned);
      await persistSave();
      try { ctx.platform.setScore(S.coinsEarned); } catch (e) { /* optional API */ }
      try { ctx.platform.complete(); } catch (e) { /* optional API */ }
    }

    // ---------------------------------------------------------------
    // Input
    // ---------------------------------------------------------------
    function pointInRect(px, py, r) {
      return px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h;
    }

    function takeOrder(i) {
      const t = S.tables[i];
      const c = t && t.customer;
      if (!c || c.stage !== "waiting_order") return;
      c.stage = "ordered";
      c.patience = 1;
      try { ctx.platform.haptic("light"); } catch (e) { /* optional API */ }
    }

    function deliver(i) {
      const t = S.tables[i];
      const c = t && t.customer;
      if (!c || c.eatT >= 0) { S.waitress.carrying = -1; S.selectedTable = -1; return; }
      const tip = (1 + c.patience) * (1 + tipBonus());
      const points = Math.round(8 * c.order.length * tip);
      S.coinsEarned += points;
      S.served += 1;
      c.mood = "happy";
      c.eatT = 0;
      addFloater(t.x, t.y - t.h * 1.4, "+" + points + "c", "#3fae5c");
      try { ctx.platform.haptic("light"); } catch (e) { /* optional API */ }
      S.waitress.carrying = -1;
      S.selectedTable = -1;
    }

    function feedDish(dishId) {
      if (S.selectedTable < 0) return;
      const t = S.tables[S.selectedTable];
      const c = t && t.customer;
      if (!c || c.stage !== "ordered" || c.eatT >= 0 || S.waitress.carrying >= 0) return;

      const need = c.order[c.progress];
      if (need === dishId) {
        c.progress += 1;
        try { ctx.platform.haptic("light"); } catch (e) { /* optional API */ }
        if (c.progress >= c.order.length) {
          S.waitress.carrying = S.selectedTable;
        }
      } else {
        S.shakeTable = S.selectedTable;
        S.shakeTimer = 0.3;
        c.patience = Math.max(0.05, c.patience - 0.08);
        try { ctx.platform.haptic("light"); } catch (e) { /* optional API */ }
      }
    }

    function handleTapPlaying(x, y) {
      if (y >= L.kitchenY && y <= L.kitchenY + L.kitchenH) {
        if (S.selectedTable < 0 || S.waitress.carrying >= 0) return;
        const idx = clamp(Math.floor(x / L.dishGap), 0, DISHES.length - 1);
        const dish = DISHES[idx].id;
        moveWaitressTo(0.5, () => feedDish(dish));
        return;
      }

      for (let i = 0; i < S.tables.length; i++) {
        const t = S.tables[i];
        const within = x >= t.x - t.w * 0.6 && x <= t.x + t.w * 0.6 &&
          y >= t.y - t.h * 2.2 && y <= t.y + t.h * 0.7;
        if (!within) continue;
        const c = t.customer;
        if (!c || c.eatT >= 0) return;

        if (c.stage === "waiting_order" && S.waitress.carrying < 0) {
          moveWaitressTo(xFrac(t.x), () => takeOrder(i));
        } else if (c.stage === "ordered" && S.waitress.carrying === i) {
          moveWaitressTo(xFrac(t.x), () => deliver(i));
        } else if (c.stage === "ordered" && S.waitress.carrying < 0 && S.selectedTable < 0) {
          S.selectedTable = i;
        }
        return;
      }
    }

    function handleTap(x, y) {
      if (S.screen === "title") {
        resetShift();
        try { ctx.platform.start(); } catch (e) { /* optional API */ }
        return;
      }
      if (S.screen === "shop") {
        for (const id in S.shopRects) {
          if (!pointInRect(x, y, S.shopRects[id])) continue;
          if (id === "continue") {
            save.day += 1;
            persistSave();
            resetShift();
          } else {
            const def = UPGRADES.find(d => d.id === id);
            const level = save.upgrades[id];
            if (!def || level >= def.max) continue;
            const cost = upgradeCost(def, level);
            if (save.coinsBank >= cost) {
              save.coinsBank -= cost;
              save.upgrades[id] += 1;
              persistSave();
            }
          }
          return;
        }
        return;
      }
      if (S.screen === "playing") {
        handleTapPlaying(x, y);
      }
    }

    ctx.listen(canvas, "pointerdown", event => {
      event.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const scaleX = L.w / rect.width;
      const scaleY = L.h / rect.height;
      const x = (event.clientX - rect.left) * scaleX;
      const y = (event.clientY - rect.top) * scaleY;
      handleTap(x, y);
    }, { passive: false });

    // ---------------------------------------------------------------
    // Main loop
    // ---------------------------------------------------------------
    function render(dtSec) {
      layout();
      drawBackground(dtSec * 1000);

      if (S.screen === "title") {
        g.fillStyle = "#eaf6ff";
        g.fillRect(0, 0, L.w, L.h);
        for (const flake of S.snow) {
          g.fillStyle = "rgba(255,255,255,0.9)";
          g.beginPath();
          g.arc(flake.x * L.w, flake.y * L.h, flake.r, 0, Math.PI * 2);
          g.fill();
        }
        drawPenguin(L.w / 2, L.h * 0.15, Math.min(L.w, L.h) * 0.2, { mood: "happy", waitress: true });
        const startLabel = save.day > 1 || save.coinsBank > 0 ? "Continue — Day " + save.day : "Tap to start Day 1";
        drawCenteredPanel(
          "Penguin Diner",
          ["Greet diners before they lose patience,", "build each order in the kitchen, and",
            "carry the tray back before it melts!",
            save.bestScore > 0 ? "Best day: " + save.bestScore + "c" : ""],
          startLabel
        );
        return;
      }

      if (S.screen === "shop") {
        drawKitchenDock();
        drawKitchen();
        for (let i = 0; i < S.tables.length; i++) drawTable(S.tables[i], i);
        drawQueue();
        drawHUD();
        drawShop();
        return;
      }

      updatePlaying(dtSec);
      drawKitchenDock();
      drawKitchen();
      for (let i = 0; i < S.tables.length; i++) drawTable(S.tables[i], i);
      drawWaitress();
      drawQueue();
      drawHUD();
      drawFloaters(dtSec);

      try { ctx.platform.setProgress(clamp(1 - S.timeLeft / SHIFT_SECONDS, 0, 1)); } catch (e) { /* optional API */ }
    }

    ctx.onFrame((dtMs) => {
      const dtSec = Math.min(0.05, dtMs / 1000);
      render(dtSec);
    });

    S.tables = freshTables();
    layout();
    render(0);
    ctx.platform.ready();
  }
};
