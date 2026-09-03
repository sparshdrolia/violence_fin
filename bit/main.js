// Frosty's Dinner Rush — a penguin restaurant time-management bit.
// Seat penguin diners, read their order bubble, tap the matching dishes
// in the kitchen tray in order, and plate the meal before their patience
// (an ice cube) melts away. Inspired by classic "penguin diner" style
// restaurant games; entirely procedural, no packaged assets.

window.plethoraBit = {
  meta: {
    name: "Frosty's Dinner Rush"
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
    const TABLE_COUNT = 3;
    const MAX_QUEUE = 3;
    const SHIFT_SECONDS = 90;
    const START_LIVES = 3;

    let bestScore = 0;
    try {
      const stored = await ctx.storage.get("bestScore");
      if (typeof stored === "number" && isFinite(stored)) bestScore = stored;
    } catch (e) {
      // storage unavailable — play without a remembered best score
    }

    function rand(min, max) { return min + Math.random() * (max - min); }
    function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
    function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

    // Manual rounded-rect path (avoids relying on ctx.roundRect, which
    // isn't available in every webview) — builds the path, caller fills/strokes.
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

    // ---------------------------------------------------------------
    // Game state
    // ---------------------------------------------------------------
    const S = {
      screen: "title", // "title" | "playing" | "gameover"
      score: 0,
      lives: START_LIVES,
      timeLeft: SHIFT_SECONDS,
      elapsed: 0,
      served: 0,
      selectedTable: -1,
      floaters: [], // floating "+N" text
      snow: [],
      shakeTable: -1,
      shakeTimer: 0,
      tables: [],
      queue: []
    };

    for (let i = 0; i < 40; i++) {
      S.snow.push({ x: Math.random(), y: Math.random(), r: rand(1, 2.6), s: rand(6, 22) });
    }

    function freshTables() {
      const arr = [];
      for (let i = 0; i < TABLE_COUNT; i++) {
        arr.push({ occupied: false, customer: null, x: 0, y: 0, w: 0, h: 0 });
      }
      return arr;
    }

    function resetGame() {
      S.screen = "playing";
      S.score = 0;
      S.lives = START_LIVES;
      S.timeLeft = SHIFT_SECONDS;
      S.elapsed = 0;
      S.served = 0;
      S.selectedTable = -1;
      S.floaters = [];
      S.tables = freshTables();
      S.queue = [];
      S.spawnTimer = 1.2;
    }

    function difficultySeqLen() {
      return clamp(1 + Math.floor(S.served / 5), 1, 3);
    }
    function difficultyPatience() {
      return clamp(12 - Math.floor(S.served / 6), 6, 12);
    }
    function difficultySpawn() {
      return clamp(3.4 - S.elapsed / 45, 1.4, 3.4);
    }

    function makeCustomer() {
      const len = difficultySeqLen();
      const order = [];
      for (let i = 0; i < len; i++) order.push(pick(DISHES).id);
      return {
        order,
        progress: 0,
        patience: 1,
        patienceMax: difficultyPatience(),
        mood: "ok", // ok | happy | angry
        settleT: 0, // seating animation 0..1
        eatT: -1, // >=0 while eating/leaving
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

    // ---------------------------------------------------------------
    // Layout (computed each frame so it adapts to container size)
    // ---------------------------------------------------------------
    const L = {};
    function layout() {
      const w = ctx.width, h = ctx.height;
      const safeBottom = (ctx.safeArea && ctx.safeArea.bottom) || 0;
      L.w = w; L.h = h;
      L.hudH = h * 0.09;
      L.kitchenY = L.hudH;
      L.kitchenH = h * 0.13;
      L.tableAreaY = L.kitchenY + L.kitchenH;
      L.tableAreaH = h * 0.42;
      L.queueY = L.tableAreaY + L.tableAreaH;
      L.queueH = h - L.queueY - safeBottom - h * 0.02;

      const tw = w / TABLE_COUNT;
      for (let i = 0; i < S.tables.length; i++) {
        const t = S.tables[i];
        t.x = tw * i + tw / 2;
        t.y = L.tableAreaY + L.tableAreaH * 0.62;
        t.w = tw * 0.62;
        t.h = L.tableAreaH * 0.34;
      }

      L.dishSize = Math.min(w / (DISHES.length + 1), L.kitchenH * 0.8);
      L.dishGap = w / DISHES.length;
    }

    // ---------------------------------------------------------------
    // Drawing helpers
    // ---------------------------------------------------------------
    function drawBackground(dt) {
      const grad = g.createLinearGradient(0, 0, 0, L.h);
      grad.addColorStop(0, "#bfe3ff");
      grad.addColorStop(1, "#eaf6ff");
      g.fillStyle = grad;
      g.fillRect(0, 0, L.w, L.h);

      // ice floor for tables / queue area
      g.fillStyle = "#eafcff";
      g.fillRect(0, L.tableAreaY, L.w, L.h - L.tableAreaY);
      g.strokeStyle = "rgba(120,190,220,0.35)";
      g.lineWidth = 2;
      for (let i = 1; i < TABLE_COUNT; i++) {
        const x = (L.w / TABLE_COUNT) * i;
        g.beginPath();
        g.moveTo(x, L.tableAreaY);
        g.lineTo(x, L.h);
        g.stroke();
      }

      // snow
      g.fillStyle = "rgba(255,255,255,0.9)";
      for (const flake of S.snow) {
        flake.y += (flake.s * dt) / L.h;
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
      g.font = `bold ${Math.round(L.hudH * 0.42)}px sans-serif`;
      g.textAlign = "left";
      g.textBaseline = "middle";
      g.fillText("Score " + S.score, L.w * 0.03, L.hudH * 0.5);

      g.textAlign = "right";
      g.fillText(Math.max(0, Math.ceil(S.timeLeft)) + "s", L.w * 0.97, L.hudH * 0.5);

      g.textAlign = "center";
      for (let i = 0; i < START_LIVES; i++) {
        const cx = L.w * 0.5 + (i - (START_LIVES - 1) / 2) * L.hudH * 0.55;
        drawHeart(cx, L.hudH * 0.5, L.hudH * 0.22, i < S.lives ? "#e05c6e" : "rgba(150,150,150,0.35)");
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

      // plate
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

      // feet
      g.fillStyle = "#f2a33c";
      g.beginPath();
      g.ellipse(-size * 0.16, size * 0.58, size * 0.12, size * 0.06, 0, 0, Math.PI * 2);
      g.ellipse(size * 0.16, size * 0.58, size * 0.12, size * 0.06, 0, 0, Math.PI * 2);
      g.fill();

      // body
      g.fillStyle = "#2b3a4a";
      g.beginPath();
      g.ellipse(0, 0, size * 0.34, size * 0.5, 0, 0, Math.PI * 2);
      g.fill();

      // belly
      g.fillStyle = "#eef3f6";
      g.beginPath();
      g.ellipse(0, size * 0.08, size * 0.22, size * 0.36, 0, 0, Math.PI * 2);
      g.fill();

      // wings
      g.fillStyle = "#2b3a4a";
      g.beginPath();
      g.ellipse(-size * 0.34, size * 0.02, size * 0.09, size * 0.26, -0.3, 0, Math.PI * 2);
      g.ellipse(size * 0.34, size * 0.02, size * 0.09, size * 0.26, 0.3, 0, Math.PI * 2);
      g.fill();

      // head
      g.fillStyle = "#2b3a4a";
      g.beginPath();
      g.arc(0, -size * 0.46, size * 0.24, 0, Math.PI * 2);
      g.fill();

      // beak
      g.fillStyle = "#f2a33c";
      g.beginPath();
      g.moveTo(-size * 0.08, -size * 0.44);
      g.lineTo(size * 0.08, -size * 0.44);
      g.lineTo(0, -size * 0.34);
      g.closePath();
      g.fill();

      // eyes
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

    function drawIceCube(x, y, w, h, fill) {
      g.fillStyle = "rgba(255,255,255,0.6)";
      g.fillRect(x, y, w, h);
      g.fillStyle = "#7fd4e0";
      g.fillRect(x, y, w * clamp(fill, 0, 1), h);
      g.strokeStyle = "rgba(60,120,140,0.5)";
      g.lineWidth = 1.5;
      g.strokeRect(x, y, w, h);
    }

    function drawTable(t, index) {
      const selected = S.selectedTable === index;
      // table surface
      g.fillStyle = selected ? "#ffe9a8" : "#dff2ff";
      g.strokeStyle = selected ? "#e0a83c" : "#9fd3e8";
      g.lineWidth = selected ? 4 : 2;
      roundRectPath(t.x - t.w / 2, t.y - t.h / 2, t.w, t.h, t.h * 0.25);
      g.fill();
      g.stroke();

      const c = t.customer;
      if (!c) return;

      // seating pop-in animation
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

      // order bubble
      const bw = t.w * 0.92;
      const bh = t.h * 0.5;
      const bx = t.x - bw / 2;
      const by = t.y - t.h * 0.98 - bh;
      const shakeDx = (S.shakeTable === index && S.shakeTimer > 0)
        ? Math.sin(S.shakeTimer * 60) * 4 : 0;

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

      // patience meter
      const pw = t.w * 0.8;
      const ph = t.h * 0.1;
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
      for (let i = 0; i < DISHES.length; i++) {
        const cx = L.dishGap * i + L.dishGap / 2;
        const cy = L.kitchenY + L.kitchenH / 2;
        g.fillStyle = "rgba(255,255,255,0.85)";
        roundRectPath(cx - L.dishSize * 0.55, L.kitchenY + L.kitchenH * 0.08,
          L.dishSize * 1.1, L.kitchenH * 0.84, L.kitchenH * 0.18);
        g.fill();
        drawDishIcon(DISHES[i].id, cx, cy, L.dishSize * 0.8);
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
      let titleSize = pw * 0.11;
      g.font = `bold ${Math.round(titleSize)}px sans-serif`;
      const maxTitleWidth = pw * 0.9;
      while (g.measureText(title).width > maxTitleWidth && titleSize > pw * 0.04) {
        titleSize -= pw * 0.006;
        g.font = `bold ${Math.round(titleSize)}px sans-serif`;
      }
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
      g.font = `bold ${Math.round(pw * 0.065)}px sans-serif`;
      g.fillText(buttonText, L.w / 2, by + bh / 2);

      return { x: px + pw * 0.15, y: by, w: pw * 0.7, h: bh };
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

        c.patience -= dtSec / c.patienceMax;
        if (c.patience <= 0) {
          c.mood = "angry";
          c.eatT = 0;
          S.lives -= 1;
          if (S.selectedTable === i) S.selectedTable = -1;
          if (S.lives <= 0) {
            endShift();
            return;
          }
        }
      }

      if (S.timeLeft <= 0) {
        endShift();
      }
    }

    async function endShift() {
      S.screen = "gameover";
      if (S.score > bestScore) {
        bestScore = S.score;
        try { await ctx.storage.set("bestScore", bestScore); } catch (e) { /* ignore */ }
      }
      try { ctx.platform.setScore(S.score); } catch (e) { /* optional API */ }
      try { ctx.platform.complete(); } catch (e) { /* optional API */ }
    }

    // ---------------------------------------------------------------
    // Input
    // ---------------------------------------------------------------
    function pointInRect(px, py, r) {
      return px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h;
    }

    function handleTap(x, y) {
      if (S.screen === "title") {
        resetGame();
        try { ctx.platform.start(); } catch (e) { /* optional API */ }
        return;
      }
      if (S.screen === "gameover") {
        S.screen = "title";
        return;
      }

      // kitchen dish buttons
      if (y >= L.kitchenY && y <= L.kitchenY + L.kitchenH) {
        const idx = clamp(Math.floor(x / L.dishGap), 0, DISHES.length - 1);
        feedDish(DISHES[idx].id);
        return;
      }

      // tables — select a seated, non-eating customer
      for (let i = 0; i < S.tables.length; i++) {
        const t = S.tables[i];
        const within = x >= t.x - t.w * 0.6 && x <= t.x + t.w * 0.6 &&
          y >= t.y - t.h * 2.2 && y <= t.y + t.h * 0.7;
        if (within && t.customer && t.customer.settleT >= 1 && t.customer.eatT < 0) {
          S.selectedTable = i;
          return;
        }
      }
    }

    function feedDish(dishId) {
      if (S.selectedTable < 0) return;
      const t = S.tables[S.selectedTable];
      const c = t && t.customer;
      if (!c || c.eatT >= 0) return;

      const need = c.order[c.progress];
      if (need === dishId) {
        c.progress += 1;
        try { ctx.platform.haptic("light"); } catch (e) { /* optional API */ }
        if (c.progress >= c.order.length) {
          const tip = 1 + c.patience; // faster service, bigger tip
          const points = Math.round(10 * c.order.length * tip);
          S.score += points;
          S.served += 1;
          c.mood = "happy";
          c.eatT = 0;
          addFloater(t.x, t.y - t.h * 1.4, "+" + points, "#3fae5c");
          try { ctx.platform.haptic("light"); } catch (e) { /* optional API */ }
        }
      } else {
        S.shakeTable = S.selectedTable;
        S.shakeTimer = 0.3;
        c.patience = Math.max(0.05, c.patience - 0.08);
        try { ctx.platform.haptic("light"); } catch (e) { /* optional API */ }
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
        drawPenguin(L.w / 2, L.h * 0.4, Math.min(L.w, L.h) * 0.28, { mood: "happy" });
        drawCenteredPanel(
          "Frosty's Dinner Rush",
          ["Seat penguins, match their order,", "and serve it up before they melt!",
            bestScore > 0 ? "Best score: " + bestScore : ""],
          "Tap to start your shift"
        );
        return;
      }

      if (S.screen === "gameover") {
        drawKitchen();
        for (let i = 0; i < S.tables.length; i++) drawTable(S.tables[i], i);
        drawQueue();
        drawHUD();
        drawCenteredPanel(
          S.lives <= 0 ? "Shift over — too many walkouts!" : "Shift complete!",
          ["Score: " + S.score, "Best: " + bestScore],
          "Tap to play again"
        );
        return;
      }

      // playing
      updatePlaying(dtSec);
      drawKitchen();
      for (let i = 0; i < S.tables.length; i++) drawTable(S.tables[i], i);
      drawQueue();
      drawHUD();
      drawFloaters(dtSec);

      try { ctx.platform.setProgress(clamp(1 - S.timeLeft / SHIFT_SECONDS, 0, 1)); } catch (e) { /* optional API */ }
    }

    ctx.onFrame((dtMs) => {
      const dtSec = Math.min(0.05, dtMs / 1000);
      render(dtSec);
    });

    layout();
    render(0);
    ctx.platform.ready();
  }
};
