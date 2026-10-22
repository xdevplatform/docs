(function () {
  'use strict';

  /* ---------- constants ---------- */
  var W = 480, H = 480;
  var L = 12, R = 468, T = 56, B = 462; // pitch bounds
  var GL = 190, GR = 290, GD = 14; // goal mouth x-range and depth
  var PR = 11, BR = 5; // player / ball radius
  var MATCH_SECONDS = 90;
  var HUMAN_SPEED = 128, AI_SPEED = 114, GK_SPEED = 100;
  var BALL_DAMP = 0.42; // velocity multiplier per second
  var DT = 1 / 60;

  var canvas = document.getElementById('c');
  var ctx = canvas.getContext('2d');
  var dpr = Math.min(window.devicePixelRatio || 1, 3);
  canvas.width = W * dpr;
  canvas.height = H * dpr;

  /* ---------- helpers ---------- */
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function len(x, y) { return Math.sqrt(x * x + y * y); }
  function hash(str) {
    var h = 2166136261;
    for (var i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }
  var seed = hash(String(window.ROOM || 'lobby'));
  var rng = (function (s) {
    return function () {
      s |= 0; s = (s + 0x6d2b79f5) | 0;
      var t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  })(seed);

  var KITS = [
    ['#e64678', '#ffffff'], ['#2f7de1', '#ffffff'], ['#f2b632', '#222222'],
    ['#7b4fd6', '#ffffff'], ['#18a999', '#ffffff'], ['#e8572a', '#ffffff']
  ];
  var kitA = KITS[0];
  var kitB = KITS[1 + (seed % (KITS.length - 1))];
  var SKIN = ['#f1c9a5', '#d9a273', '#a86b43', '#7a4a2d', '#f6d7bd'];
  var HAIR = ['#2a1a12', '#5a3a22', '#c8892b', '#171717', '#8a2d2d'];

  /* ---------- audio (tiny synth, original) ---------- */
  var audio = null;
  function beep(freq, dur, type, vol) {
    try {
      if (!audio) audio = new (window.AudioContext || window.webkitAudioContext)();
      if (audio.state === 'suspended') audio.resume();
      var o = audio.createOscillator(), g = audio.createGain();
      o.type = type || 'square'; o.frequency.value = freq;
      g.gain.value = vol || 0.04;
      g.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + dur);
      o.connect(g); g.connect(audio.destination);
      o.start(); o.stop(audio.currentTime + dur);
    } catch (e) { /* audio is optional */ }
  }

  /* ---------- state ---------- */
  var state = {
    mode: 'menu', // menu | play | goal | over
    time: MATCH_SECONDS,
    score: [0, 0],
    banner: '',
    bannerT: 0,
    t: 0,
    ball: { x: 0, y: 0, vx: 0, vy: 0, spin: 0 },
    players: [],
    controlled: null,
    charge: 0,
    switchCd: 0
  };

  function mkPlayer(team, role, hx, hy, idx) {
    return {
      team: team, role: role, hx: hx, hy: hy,
      x: hx, y: hy, vx: 0, vy: 0,
      fx: 0, fy: team === 0 ? -1 : 1,
      kickCd: 0, phase: 0,
      skin: SKIN[Math.floor(rng() * SKIN.length)],
      hair: HAIR[Math.floor(rng() * HAIR.length)],
      idx: idx
    };
  }

  function setupTeams() {
    var cx = (L + R) / 2;
    state.players = [
      mkPlayer(0, 'gk', cx, B - 26, 0),
      mkPlayer(0, 'fw', cx - 70, 320, 1),
      mkPlayer(0, 'fw', cx + 70, 320, 2),
      mkPlayer(1, 'gk', cx, T + 26, 3),
      mkPlayer(1, 'fw', cx - 70, 200, 4),
      mkPlayer(1, 'fw', cx + 70, 200, 5)
    ];
    state.controlled = state.players[1];
  }

  function kickoff() {
    var b = state.ball;
    b.x = (L + R) / 2; b.y = (T + B) / 2; b.vx = b.vy = 0;
    state.players.forEach(function (p) {
      p.x = p.hx; p.y = p.hy; p.vx = p.vy = 0;
      p.fx = 0; p.fy = p.team === 0 ? -1 : 1; p.kickCd = 0;
    });
    state.charge = 0;
  }

  function newMatch() {
    setupTeams();
    kickoff();
    state.score = [0, 0];
    state.time = MATCH_SECONDS;
    state.mode = 'play';
    state.banner = 'KICK OFF';
    state.bannerT = 1;
    beep(660, 0.25, 'triangle', 0.06);
  }

  /* ---------- input ---------- */
  var keys = {};
  var touch = { stick: null, shoot: false, switchTap: false, active: false };
  var stickVec = { x: 0, y: 0 };

  function onKey(e, down) {
    var k = e.key;
    var map = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
      w: 'up', W: 'up', s: 'down', S: 'down', a: 'left', A: 'left', d: 'right', D: 'right',
      ' ': 'shoot', j: 'shoot', J: 'shoot', z: 'shoot', Z: 'shoot',
      k: 'switch', K: 'switch', x: 'switch', X: 'switch', Shift: 'switch', Enter: 'start' };
    var a = map[k];
    if (!a) return;
    e.preventDefault();
    if (down && !keys[a]) {
      if (a === 'switch') state.switchTap = true;
      if (a === 'start' || a === 'shoot') startIfIdle();
    }
    keys[a] = down;
  }
  window.addEventListener('keydown', function (e) { onKey(e, true); });
  window.addEventListener('keyup', function (e) { onKey(e, false); });
  window.addEventListener('blur', function () { keys = {}; touch.shoot = false; touch.stick = null; });

  function startIfIdle() {
    if (state.mode === 'menu' || state.mode === 'over') newMatch();
  }

  var BTN_SHOOT = { x: 414, y: 408, r: 40 };
  var BTN_SWITCH = { x: 340, y: 432, r: 26 };

  function toCanvas(e) {
    var r = canvas.getBoundingClientRect();
    return { x: (e.clientX - r.left) * W / r.width, y: (e.clientY - r.top) * H / r.height };
  }
  function inBtn(p, b) { return len(p.x - b.x, p.y - b.y) <= b.r + 10; }

  canvas.addEventListener('pointerdown', function (e) {
    canvas.focus();
    var p = toCanvas(e);
    if (e.pointerType !== 'mouse') touch.active = true;
    if (state.mode === 'menu' || state.mode === 'over') { startIfIdle(); }
    if (e.pointerType === 'mouse') {
      // mouse: click-and-hold anywhere shoots
      touch.shoot = true; touch.shootId = e.pointerId;
    } else if (inBtn(p, BTN_SHOOT)) {
      touch.shoot = true; touch.shootId = e.pointerId;
    } else if (inBtn(p, BTN_SWITCH)) {
      state.switchTap = true;
    } else if (p.x < W * 0.6 && !touch.stick) {
      touch.stick = { id: e.pointerId, ox: p.x, oy: p.y, x: p.x, y: p.y };
    }
    try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
    e.preventDefault();
  });
  canvas.addEventListener('pointermove', function (e) {
    if (touch.stick && touch.stick.id === e.pointerId) {
      var p = toCanvas(e);
      touch.stick.x = p.x; touch.stick.y = p.y;
    }
  });
  function pointerEnd(e) {
    if (touch.stick && touch.stick.id === e.pointerId) touch.stick = null;
    if (touch.shoot && touch.shootId === e.pointerId) touch.shoot = false;
  }
  canvas.addEventListener('pointerup', pointerEnd);
  canvas.addEventListener('pointercancel', pointerEnd);
  canvas.addEventListener('contextmenu', function (e) { e.preventDefault(); });

  function readMove() {
    var x = 0, y = 0;
    if (keys.left) x -= 1;
    if (keys.right) x += 1;
    if (keys.up) y -= 1;
    if (keys.down) y += 1;
    if (touch.stick) {
      var dx = touch.stick.x - touch.stick.ox, dy = touch.stick.y - touch.stick.oy;
      var d = len(dx, dy);
      if (d > 8) { x = dx / d * Math.min(1, d / 40); y = dy / d * Math.min(1, d / 40); }
    }
    var m = len(x, y);
    if (m > 1) { x /= m; y /= m; }
    stickVec.x = x; stickVec.y = y;
    return stickVec;
  }
  function shootHeld() { return !!(keys.shoot || touch.shoot); }

  /* ---------- game logic ---------- */
  function goalDir(team) { return team === 0 ? -1 : 1; } // y direction of the goal being attacked
  function goalY(team) { return team === 0 ? T - GD / 2 : B + GD / 2; }

  function kick(p, power, aimX, aimY) {
    var b = state.ball;
    var d = len(aimX, aimY) || 1;
    var sp = 190 + 270 * power;
    b.vx = aimX / d * sp;
    b.vy = aimY / d * sp;
    p.kickCd = 0.28;
    beep(180 + power * 120, 0.08, 'square', 0.05);
  }

  function aimWithAssist(p, ax, ay) {
    var gy = goalY(p.team), gx = (GL + GR) / 2;
    var tx = gx - p.x, ty = gy - p.y, td = len(tx, ty) || 1;
    var d = len(ax, ay) || 1;
    ax /= d; ay /= d;
    if (td < 260 && (ax * tx + ay * ty) / td > 0.45) {
      ax = ax * 0.4 + tx / td * 0.6;
      ay = ay * 0.4 + ty / td * 0.6;
    }
    return [ax, ay];
  }

  function nearestOutfielder(team, exclude) {
    var best = null, bd = 1e9, b = state.ball;
    state.players.forEach(function (p) {
      if (p.team !== team || p.role === 'gk' || p === exclude) return;
      var d = len(p.x - b.x, p.y - b.y);
      if (d < bd) { bd = d; best = p; }
    });
    return best;
  }

  function moveToward(p, tx, ty, speed, dt) {
    var dx = tx - p.x, dy = ty - p.y, d = len(dx, dy);
    var want = d > 3 ? Math.min(speed, d * 6) : 0;
    var vx = d > 0 ? dx / d * want : 0, vy = d > 0 ? dy / d * want : 0;
    p.vx += (vx - p.vx) * Math.min(1, dt * 10);
    p.vy += (vy - p.vy) * Math.min(1, dt * 10);
  }

  function aiThink(p, dt) {
    var b = state.ball;
    var dBall = len(b.x - p.x, b.y - p.y);
    var dir = goalDir(p.team);
    var ownGoalY = p.team === 0 ? B : T;

    if (p.role === 'gk') {
      var depth = 24;
      var homeY = p.team === 0 ? B - depth : T + depth;
      var tx = clamp(b.x, GL + 8, GR - 8);
      var ty = homeY;
      var threat = Math.abs(b.y - ownGoalY) < 110;
      if (threat) ty = homeY + (b.y - homeY) * 0.35;
      if (dBall < 70 && Math.abs(b.y - ownGoalY) < 130) { tx = b.x; ty = b.y; }
      moveToward(p, tx, ty, GK_SPEED, dt);
      if (dBall < PR + BR + 6 && p.kickCd <= 0) {
        var ax = (b.x < 240 ? 1 : -1) * 0.5, ay = -dir * -1;
        ay = p.team === 0 ? -1 : 1;
        kick(p, 0.8, ax, ay);
      }
      return;
    }

    var chaser = nearestOutfielder(p.team, p.team === 0 ? state.controlled : null);
    if (p === chaser) {
      // get behind the ball, then drive at goal and shoot when close
      var tgx = (GL + GR) / 2, tgy = goalY(p.team);
      var bgx = tgx - b.x, bgy = tgy - b.y, bgd = len(bgx, bgy) || 1;
      bgx /= bgd; bgy /= bgd;
      var behind = dBall > 0 ? ((b.x - p.x) * bgx + (b.y - p.y) * bgy) / dBall : 1;
      if (dBall < PR + BR + 5 && behind > 0.35) {
        var gx = (GL + GR) / 2 + (p.x < 240 ? 28 : -28) * (p.idx % 2 ? 1 : -1);
        var gy = goalY(p.team);
        var dx = gx - p.x, dy = gy - p.y, dd = len(dx, dy) || 1;
        // steer around the closest opponent in front
        var opp = null, od = 1e9;
        state.players.forEach(function (o) {
          if (o.team === p.team) return;
          var d2 = len(o.x - p.x, o.y - p.y);
          if (d2 < od && (o.y - p.y) * dir > 0) { od = d2; opp = o; }
        });
        var sx = dx / dd, sy = dy / dd;
        if (opp && od < 55) {
          var side = p.x < opp.x ? -1 : 1;
          sx += side * 1.1;
          var sl = len(sx, sy) || 1; sx /= sl; sy /= sl;
        }
        moveToward(p, p.x + sx * 100, p.y + sy * 100, AI_SPEED, dt);
        if (dd < 150 && p.kickCd <= 0 && Math.abs(p.x - gx) < 120) {
          p.aiWind = (p.aiWind || 0) + dt;
          if (p.aiWind > 0.18) { kick(p, 0.95, dx, dy); p.aiWind = 0; }
        }
      } else {
        p.aiWind = 0;
        var tx2 = b.x + b.vx * 0.15, ty2 = b.y + b.vy * 0.15;
        if (behind < 0.35 && dBall < 70) { tx2 -= bgx * 18; ty2 -= bgy * 18; }
        moveToward(p, tx2, ty2, AI_SPEED, dt);
      }
    } else {
      var advance = clamp((b.y - T) / (B - T), 0, 1);
      var hy = p.team === 0 ? lerp(T + 120, B - 80, advance) : lerp(T + 80, B - 120, advance);
      var hx = p.hx + (b.x - 240) * 0.35;
      moveToward(p, hx, hy, AI_SPEED * 0.85, dt);
    }
  }
  function lerp(a, b, t) { return a + (b - a) * t; }

  function humanThink(p, dt, dtReal) {
    var mv = readMove();
    var moving = len(mv.x, mv.y) > 0.05;
    var tvx = mv.x * HUMAN_SPEED, tvy = mv.y * HUMAN_SPEED;
    p.vx += (tvx - p.vx) * Math.min(1, dt * 12);
    p.vy += (tvy - p.vy) * Math.min(1, dt * 12);
    if (moving) { p.fx = mv.x; p.fy = mv.y; }

    var b = state.ball;
    var near = len(b.x - p.x, b.y - p.y) < PR + BR + 12;
    if (shootHeld()) state.charge = Math.min(1, state.charge + dt / 0.55);
    else if (state.charge > 0) {
      if (near && p.kickCd <= 0) {
        var power = 0.35 + 0.65 * state.charge;
        var a = aimWithAssist(p, p.fx, p.fy);
        kick(p, power, a[0], a[1]);
      }
      state.charge = 0;
    }
  }

  function updatePlayers(dt) {
    var b = state.ball;
    // control switching
    state.switchCd = Math.max(0, state.switchCd - dt);
    var hum = state.players.filter(function (p) { return p.team === 0 && p.role !== 'gk'; });
    if (state.switchTap) {
      state.switchTap = false;
      var other = hum[0] === state.controlled ? hum[1] : hum[0];
      state.controlled = other; state.switchCd = 0.6;
    } else if (state.switchCd <= 0 && !shootHeld()) {
      var n = nearestOutfielder(0, null);
      var cd = len(b.x - state.controlled.x, b.y - state.controlled.y);
      var nd = len(b.x - n.x, b.y - n.y);
      if (n !== state.controlled && cd > nd + 30) { state.controlled = n; state.switchCd = 0.5; }
    }

    state.players.forEach(function (p) {
      p.kickCd = Math.max(0, p.kickCd - dt);
      if (p === state.controlled) humanThink(p, dt);
      else aiThink(p, dt);

      p.x += p.vx * dt; p.y += p.vy * dt;
      var minY = T + PR, maxY = B - PR;
      p.x = clamp(p.x, L + PR, R - PR);
      p.y = clamp(p.y, minY, maxY);
      var sp = len(p.vx, p.vy);
      if (sp > 12) {
        if (p !== state.controlled) { p.fx = p.vx / sp; p.fy = p.vy / sp; }
        p.phase += sp * dt * 0.09;
      }
    });

    // player-player separation
    var ps = state.players;
    for (var i = 0; i < ps.length; i++) for (var j = i + 1; j < ps.length; j++) {
      var a = ps[i], c = ps[j];
      var dx = c.x - a.x, dy = c.y - a.y, d = len(dx, dy), min = PR * 2 - 2;
      if (d > 0 && d < min) {
        var push = (min - d) / 2;
        a.x -= dx / d * push; a.y -= dy / d * push;
        c.x += dx / d * push; c.y += dy / d * push;
      }
    }
  }

  function updateBall(dt) {
    var b = state.ball;
    b.x += b.vx * dt; b.y += b.vy * dt;
    var damp = Math.pow(BALL_DAMP, dt);
    b.vx *= damp; b.vy *= damp;
    if (Math.abs(b.vx) < 2) b.vx = 0;
    if (Math.abs(b.vy) < 2) b.vy = 0;
    b.spin += len(b.vx, b.vy) * dt * 0.12;

    // player contact: dribble / block
    state.players.forEach(function (p) {
      var dx = b.x - p.x, dy = b.y - p.y, d = len(dx, dy), min = PR + BR;
      if (d < min) {
        var nx = d ? dx / d : p.fx, ny = d ? dy / d : p.fy;
        b.x = p.x + nx * min; b.y = p.y + ny * min;
        // never trap the ball against a wall: push the player out instead
        var gx2 = b.x > GL && b.x < GR;
        var cbx = clamp(b.x, L + BR, R - BR);
        var cby = gx2 ? b.y : clamp(b.y, T + BR, B - BR);
        if (cbx !== b.x || cby !== b.y) {
          b.x = cbx; b.y = cby;
          var ex = p.x - b.x, ey = p.y - b.y, ed = len(ex, ey) || 1;
          if (ed < min) { p.x = b.x + ex / ed * min; p.y = b.y + ey / ed * min; }
        }
        var psp = len(p.vx, p.vy);
        var rel = (b.vx - p.vx) * nx + (b.vy - p.vy) * ny;
        if (rel < 0) {
          b.vx -= (1.35) * rel * nx; b.vy -= 1.35 * rel * ny;
        }
        if (psp > 20 && p.kickCd <= 0.12) {
          // carry the ball ahead of the dribbler
          var tx = p.vx * 1.18, ty = p.vy * 1.18;
          b.vx += (tx - b.vx) * 0.5; b.vy += (ty - b.vy) * 0.5;
        }
      }
    });

    // walls & goals
    var inGoalX = b.x > GL + BR && b.x < GR - BR;
    if (b.x < L + BR && b.y >= T && b.y <= B) { b.x = L + BR; b.vx = Math.abs(b.vx) * 0.6; }
    if (b.x > R - BR && b.y >= T && b.y <= B) { b.x = R - BR; b.vx = -Math.abs(b.vx) * 0.6; }

    if (b.y < T) { // top goal pocket / wall
      if (inGoalX || b.y < T - BR) {
        b.x = clamp(b.x, GL + BR, GR - BR);
        if (b.y < T - GD + BR) { b.y = T - GD + BR; b.vy = Math.abs(b.vy) * 0.2; }
      }
    }
    if (b.y > B) {
      if (inGoalX || b.y > B + BR) {
        b.x = clamp(b.x, GL + BR, GR - BR);
        if (b.y > B + GD - BR) { b.y = B + GD - BR; b.vy = -Math.abs(b.vy) * 0.2; }
      }
    }
    if (b.y < T + BR && !inGoalX && b.y < T + BR) { b.y = T + BR; b.vy = Math.abs(b.vy) * 0.6; }
    if (b.y > B - BR && !inGoalX && b.y > B - BR) { b.y = B - BR; b.vy = -Math.abs(b.vy) * 0.6; }
    b.x = clamp(b.x, L + BR, R - BR);

    // anti-stall: if the ball hasn't travelled anywhere for a while, pop it back into play
    state.stall = state.stall || { x: b.x, y: b.y, t: 0 };
    if (len(b.x - state.stall.x, b.y - state.stall.y) > 14) {
      state.stall.x = b.x; state.stall.y = b.y; state.stall.t = 0;
    } else if ((state.stall.t += dt) > 1.6) {
      // drop ball: move it toward the middle and shove the crowd back
      var cxm = 240 - b.x, cym = (T + B) / 2 - b.y, cd = len(cxm, cym) || 1;
      var ox = b.x, oy = b.y;
      b.x += cxm / cd * 70; b.y += cym / cd * 70; b.vx = b.vy = 0;
      state.players.forEach(function (q) {
        var qx = q.x - ox, qy = q.y - oy, qd = len(qx, qy) || 1;
        if (qd < 60) { q.x += (qx / qd) * 30 + cxm / cd * -10; q.y += (qy / qd) * 30 + cym / cd * -10; q.vx = q.vy = 0; }
      });
      state.stall.x = b.x; state.stall.y = b.y; state.stall.t = 0;
      beep(300, 0.06, 'square', 0.03);
    }

    if (b.y < T - BR - 2 && inGoalX) scored(0);
    else if (b.y > B + BR + 2 && inGoalX) scored(1);
  }

  function scored(team) {
    state.score[team]++;
    state.mode = 'goal';
    state.banner = team === 0 ? 'GOAL!' : 'GOAL... them';
    state.bannerT = 1.6;
    beep(523, 0.15, 'triangle', 0.07);
    setTimeout(function () { beep(659, 0.15, 'triangle', 0.07); }, 150);
    setTimeout(function () { beep(784, 0.3, 'triangle', 0.07); }, 300);
  }

  function step(dt) {
    state.t += dt;
    if (state.mode === 'play') {
      state.time -= dt;
      updatePlayers(dt);
      updateBall(dt);
      if (state.bannerT > 0) state.bannerT -= dt;
      if (state.time <= 0) {
        state.time = 0; state.mode = 'over';
        beep(440, 0.5, 'triangle', 0.07);
      }
    } else if (state.mode === 'goal') {
      state.bannerT -= dt;
      var b = state.ball;
      b.vx *= 0.9; b.vy *= 0.9;
      if (state.bannerT <= 0) { kickoff(); state.mode = 'play'; state.banner = ''; }
    } else if (state.mode === 'menu') {
      // idle ball roll for the attract screen
      var m = state.ball;
      m.x = 240 + Math.cos(state.t * 0.9) * 90; m.y = 260 + Math.sin(state.t * 1.8) * 30;
      m.spin += dt * 4;
    }
  }

  /* ---------- rendering ---------- */
  function drawPitch() {
    ctx.fillStyle = '#0c1f14'; ctx.fillRect(0, 0, W, H);
    // grass stripes
    for (var i = 0; i < 9; i++) {
      ctx.fillStyle = i % 2 ? '#2e9850' : '#2a8e4a';
      ctx.fillRect(L, T + i * ((B - T) / 9), R - L, (B - T) / 9 + 1);
    }
    ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = 2;
    ctx.strokeRect(L, T, R - L, B - T);
    ctx.beginPath(); ctx.moveTo(L, (T + B) / 2); ctx.lineTo(R, (T + B) / 2); ctx.stroke();
    ctx.beginPath(); ctx.arc(240, (T + B) / 2, 42, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.beginPath(); ctx.arc(240, (T + B) / 2, 3, 0, Math.PI * 2); ctx.fill();
    // boxes
    ctx.strokeRect(150, T, 180, 62);
    ctx.strokeRect(150, B - 62, 180, 62);
    ctx.strokeRect(GL, T, GR - GL, 26);
    ctx.strokeRect(GL, B - 26, GR - GL, 26);
    // goals (nets)
    drawGoal(T - GD, GD, true);
    drawGoal(B, GD, false);
  }
  function drawGoal(y, h, top) {
    ctx.fillStyle = 'rgba(15,30,20,0.9)';
    ctx.fillRect(GL, y, GR - GL, h);
    ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 1;
    ctx.beginPath();
    for (var x = GL; x <= GR; x += 8) { ctx.moveTo(x, y); ctx.lineTo(x, y + h); }
    for (var yy = y; yy <= y + h; yy += 7) { ctx.moveTo(GL, yy); ctx.lineTo(GR, yy); }
    ctx.stroke();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(GL, top ? y + h : y); ctx.lineTo(GL, top ? y : y + h);
    ctx.lineTo(GR, top ? y : y + h); ctx.lineTo(GR, top ? y + h : y);
    ctx.stroke();
  }

  function drawPlayer(p) {
    var kit = p.team === 0 ? kitA : kitB;
    var gk = p.role === 'gk';
    var body = gk ? (p.team === 0 ? '#6fd6cf' : '#8bd44a') : kit[0];
    var ang = Math.atan2(p.fy, p.fx);
    var bob = Math.sin(p.phase * 2) * 1.5;
    // shadow
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath(); ctx.ellipse(p.x, p.y + 8, 11, 5, 0, 0, Math.PI * 2); ctx.fill();
    // feet
    var fx = Math.cos(ang + Math.PI / 2), fy = Math.sin(ang + Math.PI / 2);
    var sw = Math.sin(p.phase * 2) * 5;
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(p.x + fx * 5 + Math.cos(ang) * sw, p.y + fy * 5 + Math.sin(ang) * sw, 3.2, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.arc(p.x - fx * 5 - Math.cos(ang) * sw, p.y - fy * 5 - Math.sin(ang) * sw, 3.2, 0, 7); ctx.fill();
    // ponytail swinging behind
    var back = ang + Math.PI;
    var tx = p.x + Math.cos(back) * 11 + Math.cos(back + Math.PI / 2) * Math.sin(p.phase * 2) * 3;
    var ty = p.y - 6 + bob + Math.sin(back) * 11 + Math.sin(back + Math.PI / 2) * Math.sin(p.phase * 2) * 3;
    ctx.strokeStyle = p.hair; ctx.lineWidth = 4; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(p.x, p.y - 6 + bob); ctx.lineTo(tx, ty); ctx.stroke();
    // torso
    ctx.fillStyle = body;
    ctx.beginPath(); ctx.arc(p.x, p.y + bob, PR - 1, 0, 7); ctx.fill();
    ctx.strokeStyle = gk ? '#333' : kit[1]; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(p.x, p.y + bob, PR - 2, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke();
    // head + hair cap
    ctx.fillStyle = p.skin;
    ctx.beginPath(); ctx.arc(p.x + Math.cos(ang) * 1.5, p.y - 5 + bob + Math.sin(ang) * 1.5, 5.2, 0, 7); ctx.fill();
    ctx.fillStyle = p.hair;
    ctx.beginPath(); ctx.arc(p.x + Math.cos(back) * 1.2, p.y - 5.8 + bob + Math.sin(back) * 1.2, 5, 0, 7); ctx.fill();
  }

  function drawBall() {
    var b = state.ball;
    ctx.fillStyle = 'rgba(0,0,0,0.28)';
    ctx.beginPath(); ctx.ellipse(b.x + 1, b.y + 4, 5, 2.6, 0, 0, 7); ctx.fill();
    ctx.save(); ctx.translate(b.x, b.y - 1);
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(0, 0, BR + 0.5, 0, 7); ctx.fill();
    ctx.rotate(b.spin); ctx.fillStyle = '#222';
    ctx.beginPath();
    for (var i = 0; i < 5; i++) {
      var a = i * Math.PI * 2 / 5;
      ctx.lineTo(Math.cos(a) * 2.2, Math.sin(a) * 2.2);
    }
    ctx.fill();
    ctx.fillRect(3, -0.6, 1.8, 1.4); ctx.fillRect(-4.8, -0.6, 1.8, 1.4);
    ctx.restore();
    ctx.strokeStyle = '#444'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(b.x, b.y - 1, BR + 0.5, 0, 7); ctx.stroke();
  }

  function text(str, x, y, size, color, align) {
    ctx.font = '700 ' + size + 'px system-ui, -apple-system, "Segoe UI", sans-serif';
    ctx.textAlign = align || 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = color || '#fff';
    ctx.fillText(str, x, y);
  }

  function drawHud() {
    ctx.fillStyle = '#0c1f14'; ctx.fillRect(0, 0, W, 40);
    ctx.fillStyle = kitA[0]; ctx.fillRect(130, 10, 20, 20);
    ctx.fillStyle = kitB[0]; ctx.fillRect(330, 10, 20, 20);
    text(String(state.score[0]), 175, 21, 26, '#fff');
    text(String(state.score[1]), 305, 21, 26, '#fff');
    var s = Math.ceil(state.time);
    text(Math.floor(s / 60) + ':' + ('0' + (s % 60)).slice(-2), 240, 21, 22, s <= 10 ? '#ffd166' : '#fff');
    text('YOU', 100, 21, 12, '#bfe8cb'); text('CPU', 380, 21, 12, '#bfe8cb');
  }

  function drawControlled() {
    var p = state.controlled;
    if (state.mode === 'menu') return;
    ctx.strokeStyle = '#ffd166'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(p.x, p.y + 2, PR + 3, 0, 7); ctx.stroke();
    // charge bar
    if (state.charge > 0) {
      ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(p.x - 14, p.y - 26, 28, 5);
      ctx.fillStyle = state.charge > 0.85 ? '#ff5a5a' : '#ffd166';
      ctx.fillRect(p.x - 13, p.y - 25, 26 * state.charge, 3);
    }
    // aim chevron
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    var a = Math.atan2(p.fy, p.fx);
    ctx.save(); ctx.translate(p.x + Math.cos(a) * 22, p.y + Math.sin(a) * 22); ctx.rotate(a);
    ctx.beginPath(); ctx.moveTo(4, 0); ctx.lineTo(-3, -3.5); ctx.lineTo(-3, 3.5); ctx.fill();
    ctx.restore();
  }

  function drawTouchUi() {
    if (!touch.active) return;
    ctx.globalAlpha = 0.55;
    if (touch.stick) {
      var s = touch.stick, dx = s.x - s.ox, dy = s.y - s.oy, d = len(dx, dy);
      var k = d > 40 ? 40 / d : 1;
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(s.ox, s.oy, 40, 0, 7); ctx.stroke();
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(s.ox + dx * k, s.oy + dy * k, 18, 0, 7); ctx.fill();
    } else {
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.setLineDash([4, 6]);
      ctx.beginPath(); ctx.arc(80, 410, 40, 0, 7); ctx.stroke(); ctx.setLineDash([]);
    }
    ctx.fillStyle = touch.shoot ? '#ffd166' : '#e64678';
    ctx.beginPath(); ctx.arc(BTN_SHOOT.x, BTN_SHOOT.y, BTN_SHOOT.r, 0, 7); ctx.fill();
    ctx.fillStyle = '#2f7de1';
    ctx.beginPath(); ctx.arc(BTN_SWITCH.x, BTN_SWITCH.y, BTN_SWITCH.r, 0, 7); ctx.fill();
    ctx.globalAlpha = 1;
    text('KICK', BTN_SHOOT.x, BTN_SHOOT.y, 15, '#fff');
    text('SWAP', BTN_SWITCH.x, BTN_SWITCH.y, 12, '#fff');
  }

  function overlay(title, sub, sub2) {
    ctx.fillStyle = 'rgba(8,20,14,0.72)'; ctx.fillRect(0, 40, W, H - 40);
    text(title, 240, 170, 38, '#fff');
    if (sub) text(sub, 240, 222, 18, '#ffd166');
    if (sub2) text(sub2, 240, 262, 14, '#bfe8cb');
  }

  function render() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawPitch();
    var all = state.players.slice().sort(function (a, b) { return a.y - b.y; });
    var ballDrawn = false;
    all.forEach(function (p) {
      if (!ballDrawn && state.ball.y < p.y) { drawBall(); ballDrawn = true; }
      drawPlayer(p);
    });
    if (!ballDrawn) drawBall();
    drawControlled();
    drawHud();

    if (state.mode === 'menu') {
      overlay("Pitch Perfect", 'Tap or press Space to kick off',
        'Move: WASD / arrows   Kick: hold Space   Swap: K');
      text('Room ' + (window.ROOM || 'solo'), 240, 300, 12, '#7fb08f');
    } else if (state.mode === 'goal' || (state.mode === 'play' && state.bannerT > 0)) {
      text(state.banner, 240, 250, 44, '#ffd166');
    } else if (state.mode === 'over') {
      var r = state.score[0] > state.score[1] ? 'You win!' : state.score[0] < state.score[1] ? 'CPU wins' : 'Draw';
      overlay('Full time', r + '   ' + state.score[0] + ' - ' + state.score[1], 'Tap or press Space to play again');
    }
    drawTouchUi();
  }

  /* ---------- loop ---------- */
  var last = performance.now(), acc = 0;
  function frame(now) {
    acc += Math.min(0.1, (now - last) / 1000);
    last = now;
    while (acc >= DT) { step(DT); acc -= DT; }
    render();
    requestAnimationFrame(frame);
  }

  setupTeams();
  kickoff();
  render();
  requestAnimationFrame(frame);

  // Test/debug hook.
  window.__game = { state: state, step: step, newMatch: newMatch, keys: keys, render: render };
})();
