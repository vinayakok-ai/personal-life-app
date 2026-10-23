// Headless check: computer vs computer games. Run with `node games/test-core.js [games] [level]`.
require('./core.js');
const P = globalThis.Pool;

const N = +process.argv[2] || 20, LEVEL = process.argv[3] !== undefined ? +process.argv[3] : 1;
let seed = 12345;
const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);

const stats = { games: 0, shots: 0, fouls: 0, pots: 0, wins: [0, 0], stuck: 0, maxShots: 0, ms: 0, reasons: {} };
for (let g = 0; g < N; g++) {
  const game = P.newGame(g % 2, rnd);
  let shots = 0;
  while (game.winner === null && shots < 400) {
    const t0 = Date.now();
    const plan = P.aiPlan(game, game.turn, LEVEL, rnd);
    stats.ms += Date.now() - t0;
    if (game.ballInHand) {
      if (!P.validCuePos(game.balls, plan.pos.x, plan.pos.y, game.kitchen)) throw new Error('AI placed cue badly ' + JSON.stringify(plan.pos));
      game.balls[0].x = plan.pos.x; game.balls[0].y = plan.pos.y;
    }
    P.beginShot(game, plan.angle, plan.power);
    let f = 0;
    while (P.anyMoving(game.balls) && f < 1800) { P.frame(game.balls, game.ev); f++; }
    for (const b of game.balls) if (!Number.isFinite(b.x) || !Number.isFinite(b.y)) throw new Error('NaN');
    const j = P.endShot(game);
    shots++;
    if (j.foul) { stats.fouls++; stats.reasons[j.foul] = (stats.reasons[j.foul] || 0) + 1; }
    stats.pots += j.obj.length;
    // overlap sanity
    const on = game.balls.filter((b) => b.on);
    for (let a = 0; a < on.length; a++) for (let b = a + 1; b < on.length; b++) {
      const d = Math.hypot(on[a].x - on[b].x, on[a].y - on[b].y);
      if (d < 2 * P.R - 0.5) throw new Error(`overlap ${on[a].id}/${on[b].id} d=${d.toFixed(2)}`);
    }
  }
  if (game.winner === null) stats.stuck++; else { stats.wins[game.winner]++; stats.reasons['WIN: ' + game.why] = (stats.reasons['WIN: ' + game.why] || 0) + 1; }
  stats.games++; stats.shots += shots; stats.maxShots = Math.max(stats.maxShots, shots);
}
console.log({ level: P.LEVELS[LEVEL].name, ...stats, avgShots: (stats.shots / stats.games).toFixed(1), msPerPlan: (stats.ms / stats.shots).toFixed(1) });
