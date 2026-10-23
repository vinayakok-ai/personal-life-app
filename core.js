// 8-ball core: table geometry, physics, rules and the computer opponent.
// No DOM here so it can be exercised headless (see games/test-core.js).
(function (root) {
  'use strict';

  // Table units: playfield is W x L (portrait), ball radius R.
  const W = 500, L = 1000, R = 11.5;
  const CG = 32;   // corner-pocket opening measured along each rail from the corner
  const SG = 22;   // half-width of side-pocket opening
  const HEAD_Y = 750, FOOT_Y = 250;
  const MAXV = 2700, DECEL = 150, DRAG = 0.28, MINV = 5;
  const E_BALL = 0.95, E_RAIL = 0.78, E_JAW = 0.6;
  const DT = 1 / 60, SUB = 10;

  const POCKETS = [
    { x: -2, y: -2, r: 28, corner: true, ax: 2, ay: 2 },
    { x: W + 2, y: -2, r: 28, corner: true, ax: W - 2, ay: 2 },
    { x: -14, y: L / 2, r: 23, corner: false, ax: -6, ay: L / 2 },
    { x: W + 14, y: L / 2, r: 23, corner: false, ax: W + 6, ay: L / 2 },
    { x: -2, y: L + 2, r: 28, corner: true, ax: 2, ay: L - 2 },
    { x: W + 2, y: L + 2, r: 28, corner: true, ax: W - 2, ay: L - 2 },
  ];
  const JAWS = [
    [CG, 0], [W - CG, 0], [CG, L], [W - CG, L],
    [0, CG], [0, L - CG], [W, CG], [W, L - CG],
    [0, L / 2 - SG], [0, L / 2 + SG], [W, L / 2 - SG], [W, L / 2 + SG],
  ];
  const SOLIDS = [1, 2, 3, 4, 5, 6, 7];
  const STRIPES = [9, 10, 11, 12, 13, 14, 15];

  const groupOf = (id) => (id >= 1 && id <= 7 ? 'solids' : id >= 9 && id <= 15 ? 'stripes' : null);
  const groupIds = (g) => (g === 'solids' ? SOLIDS : STRIPES);
  const otherGroup = (g) => (g === 'solids' ? 'stripes' : 'solids');

  function shuffle(a, rnd) {
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(rnd() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function rack(rnd = Math.random) {
    const balls = [];
    for (let id = 0; id < 16; id++) balls.push({ id, x: 0, y: 0, vx: 0, vy: 0, on: true });
    balls[0].x = W / 2; balls[0].y = L * 0.8;
    const spots = [];
    const g = R + 0.15;
    for (let r = 0; r < 5; r++)
      for (let k = 0; k <= r; k++)
        spots.push([W / 2 + (k - r / 2) * 2 * g, FOOT_Y - r * Math.sqrt(3) * g]);
    // apex = 1, centre = 8, back corners = one of each group, rest random
    const solids = shuffle([2, 3, 4, 5, 6, 7], rnd);
    const stripes = shuffle([9, 10, 11, 12, 13, 14, 15], rnd);
    const corners = rnd() < 0.5 ? [solids.pop(), stripes.pop()] : [stripes.pop(), solids.pop()];
    const rest = shuffle(solids.concat(stripes), rnd);
    const order = [];
    for (let i = 0; i < 15; i++) {
      if (i === 0) order.push(1);
      else if (i === 4) order.push(8);
      else if (i === 10) order.push(corners[0]);
      else if (i === 14) order.push(corners[1]);
      else order.push(rest.pop());
    }
    order.forEach((id, i) => {
      balls[id].x = spots[i][0] + (rnd() - 0.5) * 0.1;
      balls[id].y = spots[i][1] + (rnd() - 0.5) * 0.1;
    });
    return balls;
  }

  function newEvents(onSound) {
    return { first: null, railAfter: false, pocketed: [], onSound: onSound || null };
  }

  function pocketBall(b, ev) {
    b.on = false; b.vx = 0; b.vy = 0;
    if (ev) { ev.pocketed.push(b.id); if (ev.onSound) ev.onSound('pocket', 1); }
  }

  function step(balls, dt, ev) {
    const n = balls.length, R2 = 4 * R * R;
    for (const b of balls) {
      if (b.on && (b.vx !== 0 || b.vy !== 0)) { b.x += b.vx * dt; b.y += b.vy * dt; }
    }
    for (let i = 0; i < n; i++) {
      const a = balls[i];
      if (!a.on) continue;
      const am = a.vx !== 0 || a.vy !== 0;
      for (let j = i + 1; j < n; j++) {
        const b = balls[j];
        if (!b.on || (!am && b.vx === 0 && b.vy === 0)) continue;
        const dx = b.x - a.x, dy = b.y - a.y, d2 = dx * dx + dy * dy;
        if (d2 >= R2) continue;
        let d = Math.sqrt(d2), nx = 1, ny = 0;
        if (d > 1e-6) { nx = dx / d; ny = dy / d; } else d = 0;
        const ov = (2 * R - d) / 2;
        a.x -= nx * ov; a.y -= ny * ov; b.x += nx * ov; b.y += ny * ov;
        const rel = (a.vx - b.vx) * nx + (a.vy - b.vy) * ny;
        if (rel > 0) {
          const k = rel * (1 + E_BALL) / 2;
          a.vx -= k * nx; a.vy -= k * ny; b.vx += k * nx; b.vy += k * ny;
          if (ev) {
            if (ev.first === null && a.id === 0) ev.first = b.id;
            if (ev.onSound) ev.onSound('ball', rel);
          }
        }
      }
    }
    for (const b of balls) {
      if (!b.on) continue;
      let hit = 0;
      if (b.x > CG && b.x < W - CG) {
        if (b.y < R) { b.y = R; if (b.vy < 0) { hit = -b.vy; b.vy = -b.vy * E_RAIL; b.vx *= 0.95; } }
        else if (b.y > L - R) { b.y = L - R; if (b.vy > 0) { hit = b.vy; b.vy = -b.vy * E_RAIL; b.vx *= 0.95; } }
      }
      if ((b.y > CG && b.y < L / 2 - SG) || (b.y > L / 2 + SG && b.y < L - CG)) {
        if (b.x < R) { b.x = R; if (b.vx < 0) { hit = Math.max(hit, -b.vx); b.vx = -b.vx * E_RAIL; b.vy *= 0.95; } }
        else if (b.x > W - R) { b.x = W - R; if (b.vx > 0) { hit = Math.max(hit, b.vx); b.vx = -b.vx * E_RAIL; b.vy *= 0.95; } }
      }
      for (let k = 0; k < JAWS.length; k++) {
        const jx = JAWS[k][0], jy = JAWS[k][1];
        const dx = b.x - jx, dy = b.y - jy, d2 = dx * dx + dy * dy;
        if (d2 < R * R && d2 > 1e-9) {
          const d = Math.sqrt(d2), nx = dx / d, ny = dy / d;
          b.x = jx + nx * R; b.y = jy + ny * R;
          const vn = b.vx * nx + b.vy * ny;
          if (vn < 0) {
            b.vx -= (1 + E_JAW) * vn * nx; b.vy -= (1 + E_JAW) * vn * ny;
            hit = Math.max(hit, -vn);
          }
        }
      }
      if (hit > 0 && ev) {
        if (ev.first !== null) ev.railAfter = true;
        if (ev.onSound) ev.onSound('rail', hit);
      }
      for (const p of POCKETS) {
        const dx = b.x - p.x, dy = b.y - p.y;
        if (dx * dx + dy * dy < p.r * p.r) { pocketBall(b, ev); break; }
      }
      if (b.on && (b.x < -R || b.x > W + R || b.y < -R || b.y > L + R)) pocketBall(b, ev);
      if (!b.on) continue;
      const s = Math.hypot(b.vx, b.vy);
      if (s > 0) {
        const ns = s - (DECEL + DRAG * s) * dt;
        if (ns <= MINV) { b.vx = 0; b.vy = 0; } else { const f = ns / s; b.vx *= f; b.vy *= f; }
      }
    }
  }

  const anyMoving = (balls) => balls.some((b) => b.on && (b.vx !== 0 || b.vy !== 0));
  const stopAll = (balls) => balls.forEach((b) => { b.vx = 0; b.vy = 0; });

  function strike(balls, angle, power) {
    const v = MAXV * Math.max(0, Math.min(1, power));
    balls[0].vx = Math.cos(angle) * v;
    balls[0].vy = Math.sin(angle) * v;
  }

  const cloneBalls = (balls) => balls.map((b) => ({ id: b.id, x: b.x, y: b.y, vx: 0, vy: 0, on: b.on }));

  // Advance one display frame (DT) of physics.
  function frame(balls, ev) {
    const dt = DT / SUB;
    for (let s = 0; s < SUB; s++) step(balls, dt, ev);
  }

  function simulate(balls, angle, power) {
    const bs = cloneBalls(balls);
    strike(bs, angle, power);
    const ev = newEvents();
    for (let f = 0; f < 1800; f++) {
      frame(bs, ev);
      if (!anyMoving(bs)) break;
    }
    stopAll(bs);
    return { balls: bs, ev };
  }

  // Rules. `before` = on-table flags by id at the start of the shot.
  function judge(groups, isBreak, before, ev, sh) {
    const op = 1 - sh, g = groups[sh];
    const onEight = g !== null && groupIds(g).every((id) => !before[id]);
    const pk = ev.pocketed;
    const cueIn = pk.includes(0), eightIn = pk.includes(8);
    let foul = null;
    if (cueIn) foul = 'Scratch';
    else if (ev.first === null) foul = 'No ball hit';
    else if (!isBreak) {
      if (!g) { if (ev.first === 8) foul = 'Hit the 8-ball first'; }
      else if (onEight) { if (ev.first !== 8) foul = 'Must hit the 8-ball first'; }
      else if (groupOf(ev.first) !== g) foul = 'Hit the wrong group first';
    }
    if (!foul && !isBreak && pk.length === 0 && !ev.railAfter) foul = 'No rail after contact';
    const obj = pk.filter((id) => id !== 0 && id !== 8);
    let winner = null, why = '';
    if (eightIn && !isBreak) {
      if (onEight && !foul) { winner = sh; why = 'sank the 8-ball'; }
      else { winner = op; why = foul ? '8-ball went in on a foul' : '8-ball went in too early'; }
    }
    let assign = null;
    if (!g && !isBreak && !foul && obj.length) assign = groupOf(obj[0]);
    const g2 = g || assign;
    const cont = !foul && winner === null && (g2 ? obj.some((id) => groupOf(id) === g2) : obj.length > 0);
    return { foul, cueIn, eightIn, winner, why, assign, cont, obj, onEight };
  }

  function targetsFor(balls, groups, isBreak, pl) {
    if (isBreak) return [];
    const g = groups[pl];
    if (!g) return balls.filter((b) => b.on && b.id !== 0 && b.id !== 8).map((b) => b.id);
    const r = groupIds(g).filter((id) => balls[id].on);
    return r.length ? r : [8];
  }

  function validCuePos(balls, x, y, kitchen) {
    if (x < R || x > W - R || y < R || y > L - R) return false;
    if (kitchen && y < HEAD_Y) return false;
    for (const b of balls) {
      if (!b.on || b.id === 0) continue;
      if ((b.x - x) ** 2 + (b.y - y) ** 2 < (2 * R + 0.5) ** 2) return false;
    }
    for (const p of POCKETS) if ((p.x - x) ** 2 + (p.y - y) ** 2 < (p.r + R) ** 2) return false;
    return true;
  }

  function freeSpot(balls, x, y, dir, skipId) {
    for (let i = 0; i < 400; i++) {
      const yy = y + dir * i * 2;
      if (yy < R || yy > L - R) break;
      if (balls.every((b) => !b.on || b.id === skipId || (b.x - x) ** 2 + (b.y - yy) ** 2 >= (2 * R + 0.5) ** 2))
        return { x, y: yy };
    }
    return freeSpot(balls, x + 3 * R, y, dir, skipId);
  }

  // ---- Aim helper (also used to draw the guide line) ----
  function rayCast(balls, ang) {
    const c = balls[0], dx = Math.cos(ang), dy = Math.sin(ang);
    let best = Infinity, hit = null;
    for (const b of balls) {
      if (!b.on || b.id === 0) continue;
      const fx = c.x - b.x, fy = c.y - b.y;
      const B = fx * dx + fy * dy, C = fx * fx + fy * fy - 4 * R * R;
      const disc = B * B - C;
      if (disc < 0) continue;
      const t = -B - Math.sqrt(disc);
      if (t > 0 && t < best) { best = t; hit = b; }
    }
    const tx = dx > 0 ? (W - R - c.x) / dx : dx < 0 ? (R - c.x) / dx : Infinity;
    const ty = dy > 0 ? (L - R - c.y) / dy : dy < 0 ? (R - c.y) / dy : Infinity;
    const tw = Math.max(0, Math.min(tx, ty));
    if (hit && best <= tw) return { t: best, x: c.x + dx * best, y: c.y + dy * best, ball: hit };
    return { t: tw, x: c.x + dx * tw, y: c.y + dy * tw, ball: null, wallX: tx < ty };
  }

  // ---- Computer opponent ----
  function segClear(balls, ax, ay, bx, by, excl, rad) {
    const dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy || 1;
    for (const b of balls) {
      if (!b.on || excl.includes(b.id)) continue;
      let t = ((b.x - ax) * dx + (b.y - ay) * dy) / l2;
      t = t < 0 ? 0 : t > 1 ? 1 : t;
      const px = ax + t * dx - b.x, py = ay + t * dy - b.y;
      if (px * px + py * py < rad * rad) return false;
    }
    return true;
  }

  // Cue speed needed to cover distance d and still be moving at vEnd.
  function startSpeed(d, vEnd) {
    let v = Math.max(vEnd, MINV + 1);
    for (let s = 0; s < d; s += 4) v += ((DECEL + DRAG * v) / v) * 4;
    return v;
  }

  function potShots(balls, cx, cy, targets) {
    const out = [];
    for (const t of targets) {
      const B = balls[t];
      for (const p of POCKETS) {
        const ex = p.ax - B.x, ey = p.ay - B.y, d2 = Math.hypot(ex, ey);
        const ux = ex / d2, uy = ey / d2;
        if (!p.corner && Math.abs(ux) < 0.5) continue;
        const gx = B.x - ux * 2 * R, gy = B.y - uy * 2 * R;
        if (gx < R - 0.5 || gx > W - R + 0.5 || gy < R - 0.5 || gy > L - R + 0.5) continue;
        const vx = gx - cx, vy = gy - cy, d1 = Math.hypot(vx, vy);
        if (d1 < 1) continue;
        const cos = (vx * ux + vy * uy) / d1;
        if (cos < 0.17) continue;
        if (!segClear(balls, cx, cy, gx, gy, [0, t], 2 * R - 0.5)) continue;
        if (!segClear(balls, B.x, B.y, p.ax, p.ay, [0, t], 2 * R - 0.5)) continue;
        const vObj = startSpeed(d2, 160);
        const vCue = startSpeed(d1, vObj / (0.975 * cos));
        out.push({
          t, angle: Math.atan2(vy, vx), power: Math.min(1, vCue / MAXV), cos,
          quality: 2 * cos * cos - d1 / 1500 - d2 / 1200,
        });
      }
    }
    return out;
  }

  function gauss(rnd) {
    const u = rnd() || 1e-9, v = rnd();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }

  const LEVELS = [
    { name: 'Easy', top: 4, aim: 0.009, pow: 0.12, position: false },
    { name: 'Medium', top: 8, aim: 0.0035, pow: 0.07, position: true },
    { name: 'Hard', top: 14, aim: 0.0012, pow: 0.03, position: true },
  ];

  // game: {balls, groups, isBreak, ballInHand, kitchen}
  function aiPlan(game, pl, level, rnd = Math.random) {
    const lv = LEVELS[level];
    const balls = game.balls;
    if (game.isBreak) {
      const pos = game.ballInHand ? { x: W / 2 + (rnd() - 0.5) * 140, y: L * 0.8 } : { x: balls[0].x, y: balls[0].y };
      const apex = balls[1];
      return { pos, angle: Math.atan2(apex.y - pos.y, apex.x - pos.x) + gauss(rnd) * 0.004, power: 1 };
    }
    const before = balls.map((b) => b.on);
    const tg = targetsFor(balls, game.groups, false, pl);

    function score(res) {
      const j = judge(game.groups, false, before, res.ev, pl);
      if (j.winner === pl) return 1e6;
      if (j.winner !== null) return -1e6;
      if (j.foul) return -1000;
      const groups2 = j.assign ? (pl === 0 ? [j.assign, otherGroup(j.assign)] : [otherGroup(j.assign), j.assign]) : game.groups;
      const c = res.balls[0];
      if (j.cont) {
        let s = 1000 + j.obj.length * 30;
        if (lv.position) {
          const nx = potShots(res.balls, c.x, c.y, targetsFor(res.balls, groups2, false, pl));
          s += Math.min(4, nx.length) * 40 + (nx.length ? Math.max(...nx.map((n) => n.quality)) * 80 : -60);
        }
        return s;
      }
      if (!lv.position) return 0;
      const opp = potShots(res.balls, c.x, c.y, targetsFor(res.balls, groups2, false, 1 - pl));
      return -Math.min(4, opp.length) * 30 - (opp.length ? Math.max(...opp.map((n) => n.quality)) * 50 : 0);
    }

    const positions = [{ x: balls[0].x, y: balls[0].y }];
    if (game.ballInHand) {
      positions.length = 0;
      for (const t of tg) {
        const B = balls[t];
        for (const p of POCKETS) {
          const ex = p.ax - B.x, ey = p.ay - B.y, d = Math.hypot(ex, ey), ux = ex / d, uy = ey / d;
          for (const D of [55, 120, 210]) {
            const x = B.x - ux * (2 * R + D), y = B.y - uy * (2 * R + D);
            if (validCuePos(balls, x, y, game.kitchen)) positions.push({ x, y });
          }
        }
      }
      if (!positions.length) {
        for (let i = 0; i < 200 && positions.length < 1; i++) {
          const x = R + rnd() * (W - 2 * R), y = (game.kitchen ? HEAD_Y : R) + rnd() * (L - R - (game.kitchen ? HEAD_Y : R));
          if (validCuePos(balls, x, y, game.kitchen)) positions.push({ x, y });
        }
        if (!positions.length) positions.push({ x: balls[0].x, y: balls[0].y });
      }
    }

    const withCue = (pos) => { const bs = cloneBalls(balls); bs[0].x = pos.x; bs[0].y = pos.y; bs[0].on = true; return bs; };
    let cands = [];
    for (const pos of positions) {
      const bs = withCue(pos);
      for (const s of potShots(bs, pos.x, pos.y, tg)) cands.push({ ...s, pos, bs });
    }
    cands.sort((a, b) => b.quality - a.quality);
    cands = cands.slice(0, lv.top);

    let best = null;
    const tryShot = (pos, bs, angle, power) => {
      const sc = score(simulate(bs, angle, power));
      if (!best || sc > best.score) best = { pos, angle, power, score: sc };
    };
    for (const c of cands)
      for (const m of [1, 1.35, 1.8]) tryShot(c.pos, c.bs, c.angle, Math.min(1, c.power * m));

    if (!best || best.score < 900) {
      const pos = positions[0], bs = withCue(pos);
      for (const t of tg) {
        const B = bs[t], a = Math.atan2(B.y - pos.y, B.x - pos.x);
        for (const off of [-0.6, 0, 0.6]) {
          const dist = Math.hypot(B.x - pos.x, B.y - pos.y);
          const da = Math.asin(Math.max(-1, Math.min(1, (off * 2 * R) / Math.max(dist, 2 * R))));
          for (const pw of [0.3, 0.55]) tryShot(pos, bs, a + da, pw);
        }
      }
      for (let i = 0; i < 24; i++) tryShot(pos, bs, rnd() * Math.PI * 2, 0.35 + rnd() * 0.4);
    }
    return {
      pos: best.pos,
      angle: best.angle + gauss(rnd) * lv.aim,
      power: Math.max(0.05, Math.min(1, best.power * (1 + gauss(rnd) * lv.pow))),
      expected: best.score,
    };
  }

  // ---- Game flow (shared by the UI and the headless test) ----
  function newGame(breaker, rnd = Math.random) {
    return {
      balls: rack(rnd), groups: [null, null], turn: breaker, isBreak: true,
      ballInHand: true, kitchen: true, winner: null, why: '', before: null, ev: null,
    };
  }

  function beginShot(game, angle, power, onSound) {
    game.before = game.balls.map((b) => b.on);
    game.ev = newEvents(onSound);
    game.ballInHand = false;
    game.kitchen = false;
    strike(game.balls, angle, power);
  }

  // Apply the rules once the balls stop. Returns the judge result plus a message.
  function endShot(game) {
    const sh = game.turn, op = 1 - sh;
    stopAll(game.balls);
    const j = judge(game.groups, game.isBreak, game.before, game.ev, sh);
    if (j.winner !== null) { game.winner = j.winner; game.why = j.why; return j; }
    const b = game.balls;
    if (j.eightIn) {
      b[8].on = true;
      Object.assign(b[8], freeSpot(b, W / 2, FOOT_Y, -1, 8));
    }
    if (j.assign) { game.groups[sh] = j.assign; game.groups[op] = otherGroup(j.assign); }
    if (j.cueIn) {
      b[0].on = true;
      Object.assign(b[0], freeSpot(b, W / 2, L * 0.8, 1, 0));
    }
    game.isBreak = false;
    if (j.foul) { game.turn = op; game.ballInHand = true; }
    else if (!j.cont) game.turn = op;
    return j;
  }

  root.Pool = {
    W, L, R, CG, SG, HEAD_Y, FOOT_Y, MAXV, DT, SUB, POCKETS, JAWS, SOLIDS, STRIPES, LEVELS,
    groupOf, groupIds, otherGroup, rack, newEvents, step, frame, anyMoving, stopAll, strike,
    cloneBalls, simulate, judge, targetsFor, validCuePos, freeSpot, rayCast, aiPlan,
    newGame, beginShot, endShot,
  };
})(typeof window !== 'undefined' ? window : globalThis);
