import { MESSAGES } from './data.js';

const W = 600;
const H = 900;
const TOP_HOOP = { x: 300, y: 92 };
const BOTTOM_HOOP = { x: 300, y: 808 };
const RIM_R = 22;
const THREE_R = 225;
const PAD_TOP = 72;
const PAD_BOTTOM = 146;

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const norm = (x, y) => { const l = Math.hypot(x, y) || 1; return { x: x / l, y: y / l }; };
const rand = (a, b) => a + Math.random() * (b - a);
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

function roundRect(ctx, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

export class Game {
  constructor(canvas, opts = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.opts = opts;
    this.onHud = opts.onHud || (() => {});
    this.onEnd = opts.onEnd || (() => {});
    this.audio = opts.audio || null;
    this.jersey = opts.jersey;
    this.court = opts.court;
    this.opp = opts.opponent;
    this.league = opts.league;
    this.difficulty = opts.difficulty || 1;
    this.state = 'idle';
    this.move = { x: 0, y: 0 };
    this.players = [];
    this.particles = [];
    this.floaters = [];
    this.scorers = {};
    this.shots = 0;
    this.makes = 0;
    this.steals = 0;
    this.blocks = 0;
    this.score = [0, 0];
    this.time = 120;
    this.shotClock = 14;
    this.overtime = false;
    this.freeze = 0;
    this.pendingPossession = 0;
    this.endTimer = 0;
    this.reported = false;
    this.messageData = null;
    this.shakeTime = 0;
    this.shakeMag = 0;
    this.flash = 0;
    this.rimFlash = 0;
    this.elapsed = 0;
    this.hudClock = 0;
    this.active = null;
    this.activeSwitchClock = 0;
    this.ball = { pos: { x: 300, y: 640 }, vel: { x: 0, y: 0 }, z: 0, vz: 0, carrier: null, flight: null, pickupCd: 0, dead: false };
    this.cw = 0; this.ch = 0; this.dpr = 1;
    this.scale = 1; this.ox = 0; this.oy = 0; this.camY = 0; this.viewH = H;
    this._raf = null;
    this._last = 0;
    this._boundResize = () => this.resize();
    this._boundPointerDown = (e) => this.pointerDown(e);
    this._boundPointerUp = (e) => this.pointerUp(e);
    this._boundVisibility = () => {
      if (document.hidden && this.state === 'live') {
        this.pause();
        this.opts.onAutoPause?.();
      }
    };
  }

  /* ---------------- setup ---------------- */

  start() {
    this.buildTeams();
    this.setupPossession(0);
    this.state = 'intro';
    this.intro = 3.1;
    this.time = 120;
    this.shotClock = 14;
    this.overtime = false;
    this.freeze = 0;
    this.score = [0, 0];
    this.elapsed = 0;
    this.messageData = null;
    this.reported = false;
    this.particles = [];
    this.floaters = [];
    this.resize();
    window.addEventListener('resize', this._boundResize);
    window.addEventListener('orientationchange', this._boundResize);
    if (window.ResizeObserver) {
      this._ro = new ResizeObserver(() => this.resize());
      this._ro.observe(this.canvas.parentElement);
    }
    this.canvas.addEventListener('pointerdown', this._boundPointerDown);
    this.canvas.addEventListener('pointerup', this._boundPointerUp);
    document.addEventListener('visibilitychange', this._boundVisibility);
    this.last = performance.now();
    this.loop(this.last);
  }

  destroy() {
    if (this._raf) cancelAnimationFrame(this._raf);
    this._raf = null;
    window.removeEventListener('resize', this._boundResize);
    window.removeEventListener('orientationchange', this._boundResize);
    this.canvas.removeEventListener('pointerdown', this._boundPointerDown);
    this.canvas.removeEventListener('pointerup', this._boundPointerUp);
    document.removeEventListener('visibilitychange', this._boundVisibility);
    if (this._ro) this._ro.disconnect();
    this.state = 'idle';
  }

  buildTeams() {
    const skins = ['#F2B27E', '#C98A5B', '#8D5524', '#E8A76B', '#F6C79C'];
    const hairs = ['#2B1B12', '#1B1210', '#24140D', '#3A2416', '#4A2C1A'];
    const roles = ['PG', 'SG', 'SF', 'PF', 'C'];
    const names1 = ['Rio', 'Bena', 'Kia', 'Jojo', 'Lala'];
    this.players = [];

    (this.opts.players || []).forEach((p, i) => {
      this.players.push({
        team: 0, idx: i, role: roles[i], name: p.name, number: p.number,
        stats: { ...p.stats }, skin: p.skin || skins[i], hair: p.hair || hairs[i],
        hairStyle: p.hairStyle || 'fade', pos: { x: 300, y: 650 }, vel: { x: 0, y: 0 },
        facing: { x: 0, y: -1 }, anim: Math.random() * 6, stun: 0, stealCd: 0, shootCd: 0,
        passCd: 0, aiTimer: 0, jump: 0, blockWindow: 0, dash: 0, dribble: 0, moving: false
      });
    });

    const base = this.opp?.rating || 60;
    const offsets = [
      { speed: 2, shoot: 0, dribble: 4, defense: -2 },
      { speed: 0, shoot: 4, dribble: 0, defense: 0 },
      { speed: 3, shoot: -2, dribble: 2, defense: -1 },
      { speed: -3, shoot: -1, dribble: -2, defense: 4 },
      { speed: -4, shoot: 0, dribble: -1, defense: 5 }
    ];
    offsets.forEach((o, i) => {
      const s = {
        speed: clamp(Math.round(base + o.speed + rand(-3, 3)), 30, 99),
        shoot: clamp(Math.round(base + o.shoot + rand(-3, 3)), 30, 99),
        dribble: clamp(Math.round(base + o.dribble + rand(-3, 3)), 30, 99),
        defense: clamp(Math.round(base + o.defense + rand(-3, 3)), 30, 99)
      };
      this.players.push({
        team: 1, idx: i, role: roles[i], name: names1[i], number: [4, 8, 12, 21, 33][i],
        stats: s, skin: skins[(i + 2) % skins.length], hair: hairs[(i + 1) % hairs.length],
        hairStyle: ['fade', 'curly', 'spiky', 'bun', 'pony'][i],
        pos: { x: 300, y: 250 }, vel: { x: 0, y: 0 }, facing: { x: 0, y: 1 },
        anim: Math.random() * 6, stun: 0, stealCd: 0, shootCd: 0, passCd: 0,
        aiTimer: 0, jump: 0, blockWindow: 0, dash: 0, dribble: 0, moving: false
      });
    });
  }

  maxSpeed(p) {
    return 146 + p.stats.speed * 0.6;
  }

  attackHoop(team) { return team === 0 ? TOP_HOOP : BOTTOM_HOOP; }
  ownHoop(team) { return team === 0 ? BOTTOM_HOOP : TOP_HOOP; }

  setupPossession(team) {
    const offense = this.players.filter((p) => p.team === team);
    const defense = this.players.filter((p) => p.team !== team);
    const offSpots = team === 0
      ? [{ x: 300, y: 655 }, { x: 165, y: 710 }, { x: 435, y: 710 }, { x: 175, y: 790 }, { x: 425, y: 790 }]
      : [{ x: 300, y: 245 }, { x: 165, y: 190 }, { x: 435, y: 190 }, { x: 175, y: 110 }, { x: 425, y: 110 }];
    const defSpots = team === 0
      ? [{ x: 300, y: 430 }, { x: 170, y: 385 }, { x: 430, y: 385 }, { x: 150, y: 310 }, { x: 450, y: 310 }]
      : [{ x: 300, y: 470 }, { x: 170, y: 515 }, { x: 430, y: 515 }, { x: 150, y: 590 }, { x: 450, y: 590 }];

    offense.forEach((p, i) => {
      p.pos.x = offSpots[i].x; p.pos.y = offSpots[i].y;
      p.vel.x = 0; p.vel.y = 0; p.stun = 0; p.jump = 0;
      p.facing = { x: 0, y: team === 0 ? -1 : 1 };
    });
    defense.forEach((p, i) => {
      p.pos.x = defSpots[i].x; p.pos.y = defSpots[i].y;
      p.vel.x = 0; p.vel.y = 0; p.stun = 0; p.jump = 0;
      p.facing = { x: 0, y: team === 0 ? 1 : -1 };
    });

    const carrier = offense[0];
    this.ball.carrier = carrier;
    this.ball.flight = null;
    this.ball.dead = false;
    this.ball.z = 0;
    this.ball.vz = 0;
    this.ball.vel = { x: 0, y: 0 };
    this.ball.pickupCd = 0;
    this.ball.pos = { x: carrier.pos.x, y: carrier.pos.y };
    this.possTeam = team;
    this.shotClock = 14;
    this.freeze = 0;
    this.pendingPossession = null;
    this.setActive(team === 0 ? carrier : this.nearestTeamPlayer(0, carrier.pos));
  }

  setActive(p) {
    if (!p) return;
    this.active = p;
    this.activeSwitchClock = 0;
  }

  nearestTeamPlayer(team, pos) {
    let best = null; let bd = Infinity;
    this.players.forEach((p) => {
      if (p.team !== team) return;
      const d = dist(p.pos, pos);
      if (d < bd) { bd = d; best = p; }
    });
    return best;
  }

  /* ---------------- loop ---------------- */

  loop = (ts) => {
    this._raf = requestAnimationFrame(this.loop);
    const dtRaw = Math.min(0.05, Math.max(0, (ts - this.last) / 1000));
    this.last = ts;
    if (this.state === 'idle') return;
    if (this.state !== 'paused') this.update(dtRaw);
    this.render();
    this.hudClock -= dtRaw;
    if (this.hudClock <= 0) {
      this.hudClock = 0.08;
      this.pushHud();
    }
  };

  pushHud() {
    const hasBall = this.ball.carrier && this.ball.carrier.team === 0;
    let label = 'STEAL';
    if (hasBall) label = 'DRIBBLE';
    else if (this.ball.flight?.type === 'shot') label = 'BLOK';
    this.onHud({
      score: [...this.score],
      time: Math.max(0, this.time),
      shotClock: Math.max(0, this.shotClock),
      state: this.state,
      label,
      overtime: this.overtime,
      possession: this.ball.carrier ? this.ball.carrier.team : (this.ball.flight ? this.ball.flight.team : null)
    });
  }

  update(dt) {
    this.elapsed += dt;
    if (this.state === 'ended') {
      this.endTimer -= dt;
      this.updateParticles(dt);
      this.updateEffects(dt);
      if (this.endTimer <= 0 && !this.reported) {
        this.reported = true;
        this.report();
      }
      return;
    }
    if (this.state === 'intro') {
      this.intro -= dt;
      this.updateEffects(dt);
      if (this.intro <= 0) {
        this.state = 'live';
        this.message('MULAI!', 1);
        this.sound('whistle');
      }
      return;
    }
    if (this.state !== 'live') return;

    this.updateEffects(dt);

    if (this.freeze > 0) {
      this.freeze -= dt;
      this.updateParticles(dt);
      if (this.freeze <= 0 && this.pendingPossession != null) {
        this.setupPossession(this.pendingPossession);
      }
      return;
    }

    this.time -= dt;
    this.shotClock -= dt;
    this.updatePlayers(dt);
    this.updateBall(dt);
    this.updateActiveLogic(dt);
    this.updateParticles(dt);

    if (this.shotClock <= 0) {
      this.message('SHOT CLOCK!', 0.9);
      this.sound('buzzer');
      this.setupPossession(1 - this.possTeam);
    }

    if (this.time <= 0) {
      this.time = 0;
      if (this.score[0] === this.score[1] && !this.overtime) {
        this.overtime = true;
        this.time = 20;
        this.message('OVERTIME!', 1.6);
        this.sound('whistle');
      } else {
        this.endMatch();
      }
    }
  }

  updateEffects(dt) {
    if (this.shakeTime > 0) this.shakeTime -= dt;
    if (this.flash > 0) this.flash = Math.max(0, this.flash - dt * 2.5);
    if (this.rimFlash > 0) this.rimFlash = Math.max(0, this.rimFlash - dt * 2.2);
    if (this.messageData) {
      this.messageData.t -= dt;
      if (this.messageData.t <= 0) this.messageData = null;
    }
  }

  /* ---------------- players ---------------- */

  updatePlayers(dt) {
    const b = this.ball;

    this.players.forEach((p) => {
      if (p.stun > 0) p.stun -= dt;
      if (p.stealCd > 0) p.stealCd -= dt;
      if (p.shootCd > 0) p.shootCd -= dt;
      if (p.passCd > 0) p.passCd -= dt;
      if (p.jump > 0) p.jump -= dt;
      if (p.blockWindow > 0) p.blockWindow -= dt;
      if (p.dash > 0) p.dash -= dt;

      if (p === this.active && p.team === 0) {
        this.updateUserPlayer(p, dt);
      } else {
        this.updateAI(p, dt);
      }
    });

    // separation
    for (let i = 0; i < this.players.length; i++) {
      for (let j = i + 1; j < this.players.length; j++) {
        const a = this.players[i]; const c = this.players[j];
        const dx = c.pos.x - a.pos.x; const dy = c.pos.y - a.pos.y;
        const d = Math.hypot(dx, dy);
        const min = 42;
        if (d > 0 && d < min) {
          const push = (min - d) / 2;
          const nx = dx / d; const ny = dy / d;
          const aw = a === this.active ? 0.35 : 1;
          const cw = c === this.active ? 0.35 : 1;
          a.pos.x -= nx * push * aw; a.pos.y -= ny * push * aw;
          c.pos.x += nx * push * cw; c.pos.y += ny * push * cw;
        }
      }
    }

    this.players.forEach((p) => {
      p.pos.x = clamp(p.pos.x, 26, W - 26);
      p.pos.y = clamp(p.pos.y, 28, H - 28);
      const sp = Math.hypot(p.vel.x, p.vel.y);
      p.moving = sp > 12;
      p.anim += dt * (p.moving ? 2 + sp / 40 : 0);
      if (p.moving) p.facing = norm(p.vel.x, p.vel.y);
      else if (b.carrier === p) {
        const h = this.attackHoop(p.team);
        p.facing = norm(h.x - p.pos.x, h.y - p.pos.y);
      }
      if (p.carrierDribble == null) p.carrierDribble = 0;
      if (b.carrier === p) p.dribble += dt * (p.moving ? 11 : 7);
    });
  }

  updateUserPlayer(p, dt) {
    let mx = this.move.x; let my = this.move.y;
    const len = Math.hypot(mx, my);
    if (len > 1) { mx /= len; my /= len; }
    const max = this.maxSpeed(p) * (p.dash > 0 ? 1.55 : 1) * (p.stun > 0 ? 0.15 : 1);
    const tvx = mx * max; const tvy = my * max;
    const k = Math.min(1, dt * 13);
    p.vel.x += (tvx - p.vel.x) * k;
    p.vel.y += (tvy - p.vel.y) * k;
    p.pos.x += p.vel.x * dt;
    p.pos.y += p.vel.y * dt;
  }

  updateAI(p, dt) {
    if (p.stun > 0) {
      p.vel.x *= 0.9; p.vel.y *= 0.9;
      p.pos.x += p.vel.x * dt; p.pos.y += p.vel.y * dt;
      return;
    }
    const b = this.ball;
    const carrier = b.carrier;
    const possTeam = carrier ? carrier.team : (b.flight ? b.flight.team : null);

    if (carrier === p) {
      this.aiCarrier(p, dt);
    } else if (possTeam === p.team) {
      this.aiOffense(p, dt);
    } else if (possTeam != null) {
      this.aiDefense(p, dt);
    } else {
      this.aiLoose(p, dt);
    }
  }

  aiCarrier(p, dt) {
    const hoop = this.attackHoop(p.team);
    const d = dist(p.pos, hoop);
    const opponents = this.players.filter((q) => q.team !== p.team);
    let nearest = null; let nd = Infinity;
    opponents.forEach((q) => { const dd = dist(p.pos, q.pos); if (dd < nd) { nd = dd; nearest = q; } });

    p.aiTimer -= dt;
    if (p.aiTimer <= 0) {
      p.aiTimer = 0.3 + Math.random() * 0.45;
      const pressured = nd < 65;
      const wantShot = d < 330 && (nd > 42 || this.shotClock < 8 || d < 120);
      if (wantShot && p.shootCd <= 0) {
        const chance = d < 140 ? 0.98 : nd > 60 ? 0.8 : 0.55;
        if (Math.random() < chance) { this.shoot(p, true); return; }
      }
      if (pressured && d > 280 && p.passCd <= 0 && Math.random() < 0.34) {
        this.pass(p, true);
        return;
      }
    }

    const toHoop = norm(hoop.x - p.pos.x, hoop.y - p.pos.y);
    const perp = { x: -toHoop.y, y: toHoop.x };
    let strafe = 0;
    if (nd < 78 && nearest) {
      const rel = (nearest.pos.x - p.pos.x) * perp.x + (nearest.pos.y - p.pos.y) * perp.y;
      strafe = rel > 0 ? -1 : 1;
    }
    let target;
    if (d < 145) {
      target = { x: hoop.x + Math.sin(this.elapsed * 1.4 + p.idx) * 26, y: hoop.y + (p.team === 0 ? 62 : -62) };
    } else {
      target = {
        x: p.pos.x + toHoop.x * 130 + perp.x * strafe * 52,
        y: p.pos.y + toHoop.y * 130 + perp.y * strafe * 52
      };
    }
    target.x = clamp(target.x, 52, W - 52);
    target.y = clamp(target.y, 52, H - 52);
    this.moveTo(p, target, this.maxSpeed(p) * (this.difficulty > 1 ? 1.02 : 1), dt);
  }

  aiOffense(p, dt) {
    const hoop = this.attackHoop(p.team);
    const spots = this.offenseSpots(p.team);
    const spot = spots[p.idx] || spots[0];
    const shot = this.ball.flight?.type === 'shot' && this.ball.flight.team === p.team;
    let target = spot;
    if (shot) {
      target = { x: hoop.x + (p.idx - 2) * 42, y: hoop.y + (p.team === 0 ? 50 : -50) };
    }
    this.moveTo(p, target, this.maxSpeed(p) * 0.92, dt);
  }

  aiDefense(p, dt) {
    const own = this.ownHoop(p.team);
    const carrier = this.ball.carrier;
    const threat = carrier ? carrier.pos : this.ball.pos;
    const inOurHalf = p.team === 0 ? threat.y > 440 : threat.y < 460;

    // Stay home when the ball is still in the opponent's backcourt. Chasing
    // full court here used to drag every defender away and let the carrier
    // stall in a corner instead of bringing the ball up.
    if (!inOurHalf) {
      const home = this.defenseSpots(p.team)[p.idx] || this.offenseSpots(p.team)[p.idx];
      this.moveTo(p, home, this.maxSpeed(p) * 0.86, dt);
      return;
    }

    const mates = this.players.filter((q) => q.team === p.team && q !== this.active);
    let closest = null; let cd = Infinity;
    mates.forEach((q) => { const d = dist(q.pos, threat); if (d < cd) { cd = d; closest = q; } });

    if (p === closest && carrier) {
      const toOwn = norm(own.x - carrier.pos.x, own.y - carrier.pos.y);
      const target = { x: carrier.pos.x + toOwn.x * 54, y: carrier.pos.y + toOwn.y * 54 };
      this.moveTo(p, target, this.maxSpeed(p) * 1.02, dt);
      if (dist(p.pos, carrier.pos) < 46 && p.stealCd <= 0 && Math.random() < dt * 0.22 * this.difficulty) {
        this.attemptSteal(p, carrier, true);
      }
      return;
    }

    const opps = this.players.filter((q) => q.team !== p.team);
    const mark = opps[p.idx] || opps[0];
    if (!mark) return;
    const toOwn = norm(own.x - mark.pos.x, own.y - mark.pos.y);
    const target = { x: mark.pos.x + toOwn.x * 52, y: mark.pos.y + toOwn.y * 52 };
    this.moveTo(p, target, this.maxSpeed(p) * 0.94, dt);

    if (this.ball.carrier && dist(p.pos, this.ball.carrier.pos) < 42 && p.stealCd <= 0 && Math.random() < dt * 0.07 * this.difficulty) {
      this.attemptSteal(p, this.ball.carrier, true);
    }
  }

  aiLoose(p, dt) {
    const ball = this.ball;
    const mates = this.players.filter((q) => q.team === p.team);
    const sorted = mates.slice().sort((a, b) => dist(a.pos, ball.pos) - dist(b.pos, ball.pos));
    const isChaser = sorted.indexOf(p) < 2;
    if (isChaser) {
      const lead = { x: ball.pos.x + ball.vel.x * 0.2, y: ball.pos.y + ball.vel.y * 0.2 };
      this.moveTo(p, lead, this.maxSpeed(p) * 1.06, dt);
    } else {
      const spot = this.defenseSpots(p.team)[p.idx] || this.offenseSpots(p.team)[p.idx];
      this.moveTo(p, spot, this.maxSpeed(p) * 0.8, dt);
    }
  }

  moveTo(p, target, speed, dt) {
    const dx = target.x - p.pos.x; const dy = target.y - p.pos.y;
    const d = Math.hypot(dx, dy);
    if (d > 3) {
      const tvx = (dx / d) * speed; const tvy = (dy / d) * speed;
      const k = Math.min(1, dt * 7);
      p.vel.x += (tvx - p.vel.x) * k;
      p.vel.y += (tvy - p.vel.y) * k;
    } else {
      p.vel.x *= 0.85; p.vel.y *= 0.85;
    }
    p.pos.x += p.vel.x * dt;
    p.pos.y += p.vel.y * dt;
  }

  offenseSpots(team) {
    if (team === 0) {
      return [{ x: 300, y: 345 }, { x: 118, y: 295 }, { x: 482, y: 295 }, { x: 195, y: 160 }, { x: 405, y: 160 }];
    }
    return [{ x: 300, y: 555 }, { x: 118, y: 605 }, { x: 482, y: 605 }, { x: 195, y: 740 }, { x: 405, y: 740 }];
  }

  defenseSpots(team) {
    if (team === 0) {
      return [{ x: 300, y: 680 }, { x: 170, y: 735 }, { x: 430, y: 735 }, { x: 150, y: 810 }, { x: 450, y: 810 }];
    }
    return [{ x: 300, y: 220 }, { x: 170, y: 165 }, { x: 430, y: 165 }, { x: 150, y: 90 }, { x: 450, y: 90 }];
  }

  updateActiveLogic(dt) {
    const b = this.ball;
    if (b.carrier && b.carrier.team === 0) {
      if (this.active !== b.carrier) this.setActive(b.carrier);
      return;
    }
    if (b.flight && b.flight.type === 'pass' && b.flight.target.team === 0) {
      if (this.active !== b.flight.target) this.setActive(b.flight.target);
      return;
    }
    if (!b.carrier && !b.flight && this.active && this.active.team === 0) {
      this.activeSwitchClock += dt;
      if (this.activeSwitchClock > 0.45) {
        this.activeSwitchClock = 0;
        const nearest = this.nearestTeamPlayer(0, b.pos);
        if (nearest && nearest !== this.active && dist(nearest.pos, b.pos) + 70 < dist(this.active.pos, b.pos)) {
          this.setActive(nearest);
        }
      }
    }
  }

  /* ---------------- ball ---------------- */

  updateBall(dt) {
    const b = this.ball;
    if (b.pickupCd > 0) b.pickupCd -= dt;

    if (b.carrier) {
      const c = b.carrier;
      const perp = { x: -c.facing.y, y: c.facing.x };
      b.pos.x = c.pos.x + c.facing.x * 14 + perp.x * 15;
      b.pos.y = c.pos.y + c.facing.y * 14 + perp.y * 15;
      b.z = c.moving ? Math.abs(Math.sin(c.dribble)) * 13 : 7;
      return;
    }

    if (b.flight) {
      const f = b.flight;
      f.t += dt / f.dur;
      const t = clamp(f.t, 0, 1);
      b.pos.x = f.from.x + (f.to.x - f.from.x) * t;
      b.pos.y = f.from.y + (f.to.y - f.from.y) * t;
      if (f.type === 'shot') {
        b.z = Math.sin(Math.PI * t) * f.apex + (1 - t) * 22;
        // mid-air block check for the user
        const act = this.active;
        if (act && act.team !== f.team && act.blockWindow > 0 && dist(act.pos, b.pos) < 46 && b.z > 30 && b.z < 120) {
          if (Math.random() < 0.5) { this.resolveBlock(act, f); return; }
        }
      } else {
        b.z = Math.sin(Math.PI * t) * f.apex;
        // interception
        const defenders = this.players.filter((q) => q.team !== f.team);
        for (const q of defenders) {
          if (dist(q.pos, b.pos) < 32 && Math.random() < dt * 0.55 * (q.team === 0 ? 1 : this.difficulty)) {
            this.intercept(q, f);
            return;
          }
        }
      }
      if (f.t >= 1) {
        if (f.type === 'pass') this.completePass(f);
        else this.resolveShot(f);
      }
      return;
    }

    // loose ball physics
    if (b.dead) return;
    b.pos.x += b.vel.x * dt;
    b.pos.y += b.vel.y * dt;
    const fr = Math.pow(0.985, dt * 60);
    b.vel.x *= fr; b.vel.y *= fr;
    b.z += b.vz * dt;
    b.vz -= 780 * dt;
    if (b.z < 0) {
      b.z = 0;
      if (Math.abs(b.vz) > 40) {
        b.vz = -b.vz * 0.55;
        if (this.audio && Math.random() < 0.7) this.sound('bounce');
      } else b.vz = 0;
    }
    if (b.pos.x < 30) { b.pos.x = 30; b.vel.x = Math.abs(b.vel.x) * 0.6; }
    if (b.pos.x > W - 30) { b.pos.x = W - 30; b.vel.x = -Math.abs(b.vel.x) * 0.6; }
    if (b.pos.y < 30) { b.pos.y = 30; b.vel.y = Math.abs(b.vel.y) * 0.6; }
    if (b.pos.y > H - 30) { b.pos.y = H - 30; b.vel.y = -Math.abs(b.vel.y) * 0.6; }

    if (b.pickupCd <= 0 && b.z < 26) {
      let best = null; let bd = 34;
      this.players.forEach((p) => {
        const d = dist(p.pos, b.pos);
        if (d < bd && p.stun <= 0) { bd = d; best = p; }
      });
      if (best) this.gainPossession(best);
    }
  }

  gainPossession(p) {
    const b = this.ball;
    b.carrier = p;
    b.flight = null;
    b.dead = false;
    b.z = 0; b.vz = 0;
    b.vel = { x: 0, y: 0 };
    this.possTeam = p.team;
    this.shotClock = 14;
    if (p.team === 0) {
      this.setActive(p);
      this.message('BOLA KITA!', 0.7);
    }
    p.dribble = 0;
    this.sound('bounce');
  }

  /* ---------------- actions ---------------- */

  setMove(x, y) {
    this.move.x = x; this.move.y = y;
  }

  action(name) {
    if (this.state !== 'live') return;
    const a = this.active;
    if (!a || a.team !== 0) return;
    const b = this.ball;
    const hasBall = b.carrier && b.carrier.team === 0;

    if (name === 'pass') {
      if (hasBall) this.pass(b.carrier, false);
      else this.switchDefender();
      return;
    }
    if (name === 'shoot') {
      if (hasBall) this.shoot(b.carrier, false);
      else this.jump(a);
      return;
    }
    if (name === 'steal') {
      if (hasBall) {
        if (a.dash <= 0) {
          a.dash = 0.34;
          a.stealCd = 1.2;
          this.sound('pop');
        }
      } else if (b.carrier && b.carrier.team === 1) {
        if (a.stealCd <= 0) this.attemptSteal(a, b.carrier, false);
      } else {
        this.jump(a);
      }
    }
  }

  jump(p) {
    if (p.jump > 0) return;
    p.jump = 0.42;
    p.blockWindow = 0.62;
    this.sound('pop');
  }

  switchDefender(dir) {
    const mates = this.players.filter((p) => p.team === 0 && p !== this.active);
    if (!mates.length) return;
    let target = null;
    if (dir === 'left' || dir === 'right') {
      const sign = dir === 'left' ? -1 : 1;
      const options = mates.filter((p) => (p.pos.x - this.active.pos.x) * sign > -20);
      target = (options.length ? options : mates).sort((a, b) => Math.abs(a.pos.x - this.active.pos.x) - Math.abs(b.pos.x - this.active.pos.x))[0];
    } else {
      target = mates.sort((a, b) => dist(a.pos, this.ball.pos) - dist(b.pos, this.ball.pos))[0];
    }
    if (target) { this.setActive(target); this.sound('click'); }
  }

  swipe(dir) {
    if (this.state !== 'live') return;
    if (dir === 'up') { this.action('shoot'); return; }
    if (this.ball.carrier && this.ball.carrier.team === 0) {
      this.pass(this.ball.carrier, false, dir);
    } else {
      this.switchDefender(dir);
    }
  }

  choosePassTarget(from, dir, isAI) {
    const mates = this.players.filter((p) => p.team === from.team && p !== from);
    const hoop = this.attackHoop(from.team);
    let best = mates[0]; let bestScore = -Infinity;
    mates.forEach((m) => {
      let score = 0;
      const openness = Math.min(1, (Math.min(...this.players.filter((o) => o.team !== from.team).map((o) => dist(o.pos, m.pos))) || 100) / 160);
      if (dir === 'left') score += (from.pos.x - m.pos.x) * 1.2;
      else if (dir === 'right') score += (m.pos.x - from.pos.x) * 1.2;
      else score += (from.team === 0 ? from.pos.y - m.pos.y : m.pos.y - from.pos.y) * 0.9;
      score += openness * 90;
      score -= dist(from.pos, m.pos) * 0.12;
      if (this.ball.carrier === m) score -= 500;
      if (score > bestScore) { bestScore = score; best = m; }
    });
    if (isAI) {
      const open = mates.slice().sort((a, b) => {
        const oa = Math.min(...this.players.filter((o) => o.team !== from.team).map((o) => dist(o.pos, a.pos)));
        const ob = Math.min(...this.players.filter((o) => o.team !== from.team).map((o) => dist(o.pos, b.pos)));
        return ob - oa;
      });
      if (open[0]) best = open[0];
    }
    return best;
  }

  pass(from, isAI = false, dir = null) {
    if (this.ball.carrier !== from) return;
    const target = this.choosePassTarget(from, dir, isAI);
    if (!target) return;
    const lead = { x: target.pos.x + target.vel.x * 0.12, y: target.pos.y + target.vel.y * 0.12 };
    const d = dist(from.pos, lead);
    this.ball.carrier = null;
    this.ball.flight = {
      type: 'pass', from: { x: from.pos.x, y: from.pos.y }, to: lead,
      target, team: from.team, t: 0, dur: clamp(d / 560, 0.24, 0.7), apex: 30
    };
    this.ball.pickupCd = 0.2;
    this.possTeam = from.team;
    from.passCd = 0.5;
    this.sound('pass');
    if (!isAI && from.team === 0) this.setActive(target);
  }

  completePass(f) {
    const b = this.ball;
    b.flight = null;
    const t = f.target;
    const d = dist(t.pos, b.pos);
    if (d < 95) {
      b.carrier = t;
      b.pos = { x: t.pos.x, y: t.pos.y };
      b.z = 0;
      this.possTeam = t.team;
      if (t.team === 0) { this.setActive(t); this.sound('bounce'); }
    } else {
      b.vel = { x: rand(-80, 80), y: rand(-80, 80) };
      b.z = 10; b.vz = 40; b.pickupCd = 0.25;
    }
  }

  intercept(defender, f) {
    const b = this.ball;
    b.flight = null;
    b.carrier = defender;
    b.z = 0; b.vz = 0;
    this.possTeam = defender.team;
    this.shotClock = 14;
    defender.dribble = 0;
    this.float('INTERCEPT!', b.pos.x, b.pos.y - 45, '#FFD166', 22);
    this.sound('steal');
    if (defender.team === 0) {
      this.setActive(defender);
      this.steals += 1;
    }
    this.shake(4, 0.2);
  }

  shoot(p, isAI = false) {
    if (this.ball.carrier !== p) return;
    const hoop = this.attackHoop(p.team);
    const d = dist(p.pos, hoop);
    const isDunk = d < 100;
    const opponents = this.players.filter((q) => q.team !== p.team);

    let contest = 0;
    opponents.forEach((q) => {
      const qd = dist(q.pos, p.pos);
      if (qd < 48) contest += 0.16;
      else if (qd < 78) contest += 0.08;
    });
    contest = Math.min(0.36, contest);

    let make = 0.95 - Math.max(0, d - 55) * 0.0022 + (p.stats.shoot - 60) * 0.0045 - contest;
    if (isDunk) make = Math.max(make, 0.82);
    if (isAI) make += (this.difficulty - 1) * 0.14;
    make = clamp(make, 0.07, 0.96);

    // block check at release
    let blocker = null;
    for (const q of opponents) {
      const qd = dist(q.pos, p.pos);
      if (qd > 70) continue;
      const activeBlock = q === this.active && q.blockWindow > 0 && Math.random() < 0.62;
      const aiBlock = q.team === 1 && Math.random() < 0.06 + Math.max(0, 1 - qd / 70) * 0.1;
      if (activeBlock || aiBlock) { blocker = q; break; }
    }
    if (blocker) {
      this.ball.carrier = null;
      this.ball.z = 24;
      this.ball.vz = 80;
      this.ball.vel = { x: rand(-120, 120), y: rand(-120, 120) };
      this.ball.pickupCd = 0.3;
      this.ball.flight = null;
      this.float('BLOK!', p.pos.x, p.pos.y - 50, '#FF4D5E', 24);
      this.sound('block');
      this.shake(6, 0.25);
      if (blocker.team === 0) this.blocks += 1;
      return;
    }

    const points = d > THREE_R ? 3 : 2;
    const success = Math.random() < make;
    const apex = isDunk ? 55 : clamp(d * 0.42, 70, 155);
    const dur = isDunk ? 0.5 : clamp(d / 320, 0.62, 1.05);
    this.ball.carrier = null;
    this.ball.flight = {
      type: 'shot', from: { x: p.pos.x, y: p.pos.y }, to: { x: hoop.x, y: hoop.y },
      team: p.team, shooter: p, success, points, isDunk, t: 0, dur, apex
    };
    this.ball.z = 22;
    this.possTeam = p.team;
    this.shotClock = Math.max(this.shotClock, 1.5);
    p.shootCd = 1.1;
    this.sound('pass');
    if (p.team === 0) this.shots += 1;
  }

  resolveShot(f) {
    const b = this.ball;
    b.flight = null;
    const shooter = f.shooter;
    if (f.success) {
      this.score[f.team] += f.points;
      if (f.team === 0) {
        this.makes += 1;
        this.scorers[shooter.name] = (this.scorers[shooter.name] || 0) + f.points;
        this.float(`+${f.points}`, TOP_HOOP.x + rand(-30, 30), (f.team === 0 ? TOP_HOOP.y : BOTTOM_HOOP.y) + 35, '#FFD166', 30);
        this.float(pick(MESSAGES.make), f.team === 0 ? 180 : 420, 380, '#FFFFFF', 24);
      }
      this.rimFlash = 1;
      this.flash = 0.55;
      this.shake(f.isDunk ? 10 : 5, f.isDunk ? 0.4 : 0.25);
      this.sound(f.isDunk ? 'dunk' : 'score');
      this.burst(f.team === 0 ? TOP_HOOP.x : BOTTOM_HOOP.x, f.team === 0 ? TOP_HOOP.y : BOTTOM_HOOP.y, f.isDunk ? 26 : 16);
      if (f.isDunk) this.float(pick(MESSAGES.dunk), f.team === 0 ? 260 : 340, f.team === 0 ? 170 : 730, '#FF6B1A', 30);
      b.dead = true;
      b.pos = { x: f.to.x, y: f.to.y };
      b.z = 0;
      this.freeze = 1.15;
      this.pendingPossession = 1 - f.team;
      this.message(f.team === 0 ? 'BASKET KAMU! 🏀' : 'LAWAN MENCETAK!', 1.1);
    } else {
      b.pos = { x: f.to.x + rand(-14, 14), y: f.to.y };
      b.z = 16;
      b.vz = 40;
      b.vel = { x: rand(-150, 150), y: f.team === 0 ? rand(60, 160) : rand(-160, -60) };
      b.pickupCd = 0.3;
      this.rimFlash = 1;
      this.sound('rim');
      this.shake(3, 0.18);
      if (f.team === 0) this.float(pick(MESSAGES.miss), f.to.x, f.to.y + 40, '#FFD166', 18);
    }
  }

  resolveBlock(defender, f) {
    const b = this.ball;
    b.flight = null;
    b.carrier = null;
    b.pos = { x: b.pos.x, y: b.pos.y };
    b.z = 26;
    b.vz = 70;
    b.vel = { x: rand(-130, 130), y: f.team === 0 ? rand(40, 130) : rand(-130, -40) };
    b.pickupCd = 0.3;
    this.float('BLOK!', b.pos.x, b.pos.y - 40, '#FF4D5E', 26);
    this.sound('block');
    this.shake(7, 0.3);
    if (defender.team === 0) this.blocks += 1;
  }

  attemptSteal(defender, carrier, isAI) {
    if (!carrier || this.ball.carrier !== carrier) return;
    defender.stealCd = isAI ? 1.6 : 1.25;
    let chance = 0.2 + (defender.stats.defense - carrier.stats.dribble) * 0.006;
    if (!isAI) chance += 0.14;
    chance = clamp(chance, 0.08, 0.62);
    if (Math.random() < chance) {
      this.ball.carrier = defender;
      this.ball.flight = null;
      this.ball.z = 0; this.ball.vz = 0;
      this.ball.vel = { x: 0, y: 0 };
      this.possTeam = defender.team;
      this.shotClock = 14;
      defender.dribble = 0;
      this.float(pick(MESSAGES.steal), defender.pos.x, defender.pos.y - 50, '#5CFFB0', 24);
      this.sound('steal');
      this.shake(4, 0.2);
      if (defender.team === 0) { this.setActive(defender); this.steals += 1; }
      carrier.stun = 0.35;
    } else {
      defender.stun = 0.3;
      this.sound('pop');
      if (!isAI) this.float('HAMPIR!', defender.pos.x, defender.pos.y - 45, '#FFD166', 18);
    }
  }

  endMatch() {
    this.state = 'ended';
    this.endTimer = 1.7;
    this.sound('buzzer');
    this.message(this.score[0] > this.score[1] ? 'MENANG! 🏆' : (this.score[0] < this.score[1] ? 'COBA LAGI!' : 'SERI!'), 1.6);
  }

  report() {
    const win = this.score[0] > this.score[1];
    const draw = this.score[0] === this.score[1];
    let topName = null; let topPts = 0;
    Object.entries(this.scorers).forEach(([n, p]) => { if (p > topPts) { topPts = p; topName = n; } });
    this.onEnd({
      win, draw,
      score: this.score[0], oppScore: this.score[1],
      shots: this.shots, makes: this.makes, steals: this.steals, blocks: this.blocks,
      topScorer: topName, topPoints: topPts,
      overtime: this.overtime
    });
  }

  pause() {
    if (this.state === 'live') { this.prevState = this.state; this.state = 'paused'; }
  }

  resume() {
    if (this.state === 'paused') { this.state = this.prevState || 'live'; this.last = performance.now(); }
  }

  quit() {
    this.destroy();
  }

  /* ---------------- effects ---------------- */

  sound(name) { if (this.audio) this.audio.play(name); }

  message(text, t = 1) { this.messageData = { text, t, max: t }; }

  float(text, x, y, color = '#FFFFFF', size = 22) {
    this.floaters.push({ text, x, y, color, size, life: 1.1, max: 1.1, vy: -38 });
  }

  burst(x, y, n = 16) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = rand(40, 190);
      this.particles.push({
        x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
        life: rand(0.4, 1), max: 1, size: rand(2, 6),
        color: pick(['#FFD166', '#FF6B1A', '#FFFFFF', '#5CC8FF'])
      });
    }
  }

  shake(mag, time) { this.shakeMag = mag; this.shakeTime = time; }

  updateParticles(dt) {
    this.particles.forEach((p) => {
      p.x += p.vx * dt; p.y += p.vy * dt;
      p.vx *= 0.97; p.vy *= 0.97;
      p.life -= dt;
    });
    this.particles = this.particles.filter((p) => p.life > 0);
    this.floaters.forEach((f) => { f.y += f.vy * dt; f.vy *= 0.96; f.life -= dt; });
    this.floaters = this.floaters.filter((f) => f.life > 0);
  }

  /* ---------------- input ---------------- */

  pointerDown(e) {
    this._pt = { x: e.clientX, y: e.clientY, t: performance.now() };
  }

  pointerUp(e) {
    if (!this._pt) return;
    const dx = e.clientX - this._pt.x;
    const dy = e.clientY - this._pt.y;
    const dt = performance.now() - this._pt.t;
    this._pt = null;
    if (dt > 700) return;
    if (Math.hypot(dx, dy) > 34) {
      if (Math.abs(dy) > Math.abs(dx)) {
        if (dy < 0) this.swipe('up');
        else this.swipe('down');
      } else {
        this.swipe(dx < 0 ? 'left' : 'right');
      }
    } else if (this.state === 'live') {
      this.tapAt(e.clientX, e.clientY);
    }
  }

  tapAt(clientX, clientY) {
    if (this.ball.carrier && this.ball.carrier.team === 0) return;
    const rect = this.canvas.getBoundingClientRect();
    const x = (clientX - rect.left - this.ox) / this.scale;
    const y = (clientY - rect.top - this.oy) / this.scale;
    const mates = this.players.filter((p) => p.team === 0);
    let best = null; let bd = 55;
    mates.forEach((p) => { const d = Math.hypot(p.pos.x - x, p.pos.y - y); if (d < bd) { bd = d; best = p; } });
    if (best && best !== this.active) { this.setActive(best); this.sound('click'); }
  }

  /* ---------------- rendering ---------------- */

  resize() {
    const parent = this.canvas.parentElement;
    if (!parent) return;
    const rect = parent.getBoundingClientRect();
    this.cw = Math.max(1, Math.round(rect.width));
    this.ch = Math.max(1, Math.round(rect.height));
    this.dpr = Math.min(2, window.devicePixelRatio || 1);
    this.canvas.width = Math.round(this.cw * this.dpr);
    this.canvas.height = Math.round(this.ch * this.dpr);
    this.canvas.style.width = `${this.cw}px`;
    this.canvas.style.height = `${this.ch}px`;
  }

  computeCamera() {
    const availH = Math.max(240, this.ch - PAD_TOP - PAD_BOTTOM);
    this.scale = Math.min(this.cw / W, availH / 620);
    this.viewH = availH / this.scale;
    if (this.viewH >= H) {
      this.camY = (H - this.viewH) / 2;
    } else {
      const focus = this.ball.carrier ? this.ball.carrier.pos.y : this.ball.pos.y;
      const target = clamp(focus - this.viewH / 2, 0, H - this.viewH);
      this.camY += (target - this.camY) * 0.12;
    }
    this.ox = (this.cw - W * this.scale) / 2;
    this.oy = PAD_TOP - this.camY * this.scale;
  }

  render() {
    const ctx = this.ctx;
    if (!ctx || !this.cw) return;
    this.computeCamera();
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, this.cw, this.ch);

    let sx = 0; let sy = 0;
    if (this.shakeTime > 0) {
      const m = this.shakeMag * (this.shakeTime / 0.4);
      sx = rand(-m, m); sy = rand(-m, m);
    }

    ctx.save();
    ctx.translate(this.ox + sx, this.oy + sy);
    ctx.scale(this.scale, this.scale);

    const vx0 = -this.ox / this.scale;
    const vx1 = (this.cw - this.ox) / this.scale;
    const vy0 = this.camY;
    const vy1 = this.camY + this.viewH;

    this.drawBackground(ctx, vx0, vx1, vy0, vy1);
    this.drawCourt(ctx);
    this.drawHoop(ctx, TOP_HOOP, 'top');
    this.drawHoop(ctx, BOTTOM_HOOP, 'bottom');

    const sorted = this.players.slice().sort((a, b) => a.pos.y - b.pos.y);
    sorted.forEach((p) => this.drawPlayer(ctx, p));

    this.drawBall(ctx);

    this.particles.forEach((p) => {
      ctx.globalAlpha = clamp(p.life / p.max, 0, 1);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1;

    this.floaters.forEach((f) => {
      const a = clamp(f.life / f.max, 0, 1);
      ctx.globalAlpha = a;
      ctx.font = `900 ${f.size}px "Trebuchet MS", system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.lineWidth = 5;
      ctx.strokeStyle = 'rgba(8,17,31,0.9)';
      ctx.strokeText(f.text, f.x, f.y);
      ctx.fillStyle = f.color;
      ctx.fillText(f.text, f.x, f.y);
    });
    ctx.globalAlpha = 1;
    ctx.restore();

    // screen-space effects
    if (this.flash > 0) {
      ctx.fillStyle = `rgba(255,255,255,${this.flash * 0.35})`;
      ctx.fillRect(0, 0, this.cw, this.ch);
    }

    if (this.state === 'intro') {
      const n = this.intro > 2.15 ? '3' : this.intro > 1.15 ? '2' : this.intro > 0.15 ? '1' : 'MULAI!';
      const frac = 1 - (this.intro % 1);
      const scale = n === 'MULAI!' ? 1 : 1.2 + Math.sin(frac * Math.PI) * 0.25;
      this.drawBigText(ctx, n, this.cw / 2, this.ch * 0.44, n === 'MULAI!' ? 46 : 92, scale, '#FFD166');
    }

    if (this.messageData) {
      const m = this.messageData;
      const a = clamp(m.t / 0.3, 0, 1) * clamp((m.max - m.t) / 0.15, 0, 1);
      ctx.globalAlpha = a;
      this.drawBigText(ctx, m.text, this.cw / 2, this.ch * 0.34, 30, 1, '#FFFFFF');
      ctx.globalAlpha = 1;
    }
  }

  drawBigText(ctx, text, x, y, size, scale = 1, color = '#FFF') {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    ctx.font = `900 ${size}px "Trebuchet MS", system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = Math.max(5, size * 0.12);
    ctx.strokeStyle = '#0E1B33';
    ctx.lineJoin = 'round';
    ctx.strokeText(text, 0, 0);
    ctx.fillStyle = color;
    ctx.fillText(text, 0, 0);
    ctx.restore();
  }

  drawBackground(ctx, x0, x1, y0, y1) {
    const t = this.court;
    const g = ctx.createLinearGradient(0, y0, 0, y1);
    if (t.style === 'arena') {
      g.addColorStop(0, '#050C18');
      g.addColorStop(0.5, '#0B1830');
      g.addColorStop(1, '#050C18');
    } else {
      g.addColorStop(0, t.bg);
      g.addColorStop(1, '#4F9A6A');
    }
    ctx.fillStyle = g;
    ctx.fillRect(x0, y0, x1 - x0, y1 - y0);

    if (t.style === 'arena') {
      // stands + crowd behind both baselines
      this.drawStands(ctx, y0, 0, 1);
      this.drawStands(ctx, H, y1, -1);
      // spotlights
      for (let i = 0; i < 4; i++) {
        const lx = 80 + i * 150;
        const rg = ctx.createRadialGradient(lx, 20, 10, lx, 20, 260);
        rg.addColorStop(0, 'rgba(255,240,190,0.18)');
        rg.addColorStop(1, 'rgba(255,240,190,0)');
        ctx.fillStyle = rg;
        ctx.beginPath(); ctx.arc(lx, 20, 260, 0, Math.PI * 2); ctx.fill();
      }
    } else {
      // grass texture + trees
      ctx.globalAlpha = 0.35;
      for (let i = 0; i < 70; i++) {
        const x = x0 + ((i * 137.5) % Math.max(1, x1 - x0));
        const y = y0 + ((i * 89.3) % Math.max(1, y1 - y0));
        ctx.fillStyle = i % 2 ? '#7CC98F' : '#3E8F5C';
        ctx.beginPath(); ctx.arc(x, y, 3 + (i % 4), 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 1;
      this.drawTrees(ctx, x0, x1, y0, y1);
    }
  }

  drawStands(ctx, y, edge, dir) {
    const bandH = 210;
    const top = dir === 1 ? y - bandH : edge;
    ctx.fillStyle = '#111E36';
    ctx.fillRect(-200, top, W + 400, bandH);
    ctx.fillStyle = '#1A2C4C';
    for (let r = 0; r < 6; r++) {
      ctx.fillRect(-200, top + r * 34, W + 400, 18);
    }
    const colors = this.court.crowd;
    for (let r = 0; r < 6; r++) {
      for (let i = 0; i < 34; i++) {
        const x = -180 + i * 28 + (r % 2) * 14;
        const yy = top + r * 34 + 9;
        ctx.fillStyle = colors[(i + r) % colors.length];
        ctx.globalAlpha = 0.7;
        ctx.beginPath(); ctx.arc(x, yy, 5, 0, Math.PI * 2); ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
    // railing
    ctx.fillStyle = '#FF6B1A';
    ctx.fillRect(-200, dir === 1 ? y - 8 : y + bandH - 4, W + 400, 6);
  }

  drawTrees(ctx, x0, x1, y0, y1) {
    const spots = [
      [-60, -40], [-130, 120], [-70, 300], [660, -20], [710, 160], [650, 330],
      [-40, 960], [120, 990], [470, 980], [680, 950], [-120, 760], [710, 700]
    ];
    spots.forEach(([x, y], i) => {
      if (x < x0 - 100 || x > x1 + 100 || y < y0 - 100 || y > y1 + 100) return;
      ctx.fillStyle = 'rgba(20,50,30,0.25)';
      ctx.beginPath(); ctx.ellipse(x + 8, y + 12, 34, 14, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#2F7A4B';
      ctx.beginPath(); ctx.arc(x, y, 30, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#46A566';
      ctx.beginPath(); ctx.arc(x - 9, y - 8, 19, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#63C27F';
      ctx.beginPath(); ctx.arc(x - 13, y - 13, 9, 0, Math.PI * 2); ctx.fill();
    });
    // fence
    ctx.strokeStyle = 'rgba(255,255,255,0.18)';
    ctx.lineWidth = 2;
    for (let x = -40; x < W + 40; x += 34) {
      ctx.beginPath(); ctx.moveTo(x, H + 2); ctx.lineTo(x + 30, H + 120); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x + 30, H + 2); ctx.lineTo(x, H + 120); ctx.stroke();
    }
  }

  drawCourt(ctx) {
    const t = this.court;
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.35)';
    ctx.shadowBlur = 24;
    ctx.shadowOffsetY = 10;
    ctx.fillStyle = t.floor;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();

    // planks / texture
    if (t.style === 'park') {
      ctx.fillStyle = 'rgba(255,255,255,0.035)';
      for (let i = 0; i < 260; i++) {
        const x = (i * 73.7) % W; const y = (i * 131.3) % H;
        ctx.fillRect(x, y, 3, 3);
      }
    } else {
      for (let y = 0; y < H; y += 34) {
        ctx.fillStyle = (y / 34) % 2 === 0 ? 'rgba(255,255,255,0.055)' : 'rgba(0,0,0,0.035)';
        ctx.fillRect(0, y, W, 34);
        ctx.strokeStyle = 'rgba(80,40,10,0.14)';
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
      }
      for (let i = 0; i < 40; i++) {
        const y = (i * 47.3) % H;
        ctx.strokeStyle = 'rgba(90,50,20,0.1)';
        ctx.beginPath(); ctx.moveTo(0, y); ctx.bezierCurveTo(180, y + 6, 400, y - 5, W, y + 2); ctx.stroke();
      }
    }

    // paint areas
    ctx.fillStyle = t.floor2;
    ctx.globalAlpha = 0.55;
    ctx.fillRect(205, 0, 190, 196);
    ctx.fillRect(205, H - 196, 190, 196);
    ctx.globalAlpha = 1;

    const lw = 5;
    ctx.strokeStyle = t.line;
    ctx.lineWidth = lw;
    ctx.lineJoin = 'round';

    // boundary
    ctx.strokeRect(10, 10, W - 20, H - 20);

    // half court
    ctx.beginPath(); ctx.moveTo(10, 450); ctx.lineTo(W - 10, 450); ctx.stroke();
    ctx.beginPath(); ctx.arc(300, 450, 68, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.arc(300, 450, 24, 0, Math.PI * 2); ctx.stroke();

    // keys
    ctx.strokeRect(205, 10, 190, 186);
    ctx.strokeRect(205, H - 196, 190, 186);
    ctx.beginPath(); ctx.arc(300, 196, 58, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.arc(300, H - 196, 58, 0, Math.PI * 2); ctx.stroke();

    // three point arcs
    ctx.beginPath(); ctx.arc(300, 92, THREE_R, 0, Math.PI); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(75, 92); ctx.lineTo(75, 10); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(525, 92); ctx.lineTo(525, 10); ctx.stroke();

    ctx.beginPath(); ctx.arc(300, H - 92, THREE_R, Math.PI, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(75, H - 92); ctx.lineTo(75, H - 10); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(525, H - 92); ctx.lineTo(525, H - 10); ctx.stroke();

    // restricted arcs
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(300, 92, 46, 0.15, Math.PI - 0.15); ctx.stroke();
    ctx.beginPath(); ctx.arc(300, H - 92, 46, Math.PI + 0.15, Math.PI * 2 - 0.15); ctx.stroke();

    // center logo
    ctx.save();
    ctx.translate(300, 450);
    ctx.fillStyle = 'rgba(14,27,51,0.1)';
    ctx.beginPath(); ctx.arc(0, 0, 58, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(14,27,51,0.32)';
    ctx.font = '900 36px "Trebuchet MS", system-ui, sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('ADA', 0, -6);
    ctx.font = '800 9px "Trebuchet MS", system-ui, sans-serif';
    ctx.letterSpacing = '2px';
    ctx.fillText('SUPER LEAGUE', 0, 22);
    ctx.restore();

    // court name
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.font = '800 10px "Trebuchet MS", system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(this.court.name.toUpperCase(), 300, H - 22);
  }

  drawHoop(ctx, hoop, side) {
    const dir = side === 'top' ? 1 : -1;
    const boardY = hoop.y - 36 * dir;
    ctx.save();
    // support
    ctx.fillStyle = '#1B2B45';
    ctx.fillRect(hoop.x - 4, side === 'top' ? 22 : H - 34, 8, 24);
    // backboard
    ctx.fillStyle = '#F7FBFF';
    ctx.strokeStyle = '#0E1B33';
    ctx.lineWidth = 3;
    ctx.fillRect(hoop.x - 52, boardY - 5, 104, 10);
    ctx.strokeRect(hoop.x - 52, boardY - 5, 104, 10);
    ctx.fillStyle = '#FF6B1A';
    ctx.fillRect(hoop.x - 20, boardY - 2, 40, 4);
    // rim
    ctx.strokeStyle = '#FF5200';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.ellipse(hoop.x, hoop.y, RIM_R, 8, 0, 0, Math.PI * 2);
    ctx.stroke();
    // net
    const wob = this.rimFlash > 0 ? Math.sin(this.elapsed * 40) * 3 * this.rimFlash : 0;
    const netBottom = hoop.y + 34 * dir;
    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    ctx.lineWidth = 1.6;
    for (let i = -2; i <= 2; i++) {
      const x = hoop.x + i * 8;
      ctx.beginPath();
      ctx.moveTo(hoop.x + i * 10, hoop.y + 2 * dir);
      ctx.lineTo(hoop.x + i * 5 + wob, netBottom);
      ctx.stroke();
    }
    for (let r = 1; r <= 2; r++) {
      ctx.beginPath();
      ctx.ellipse(hoop.x + wob * (r / 3), hoop.y + 12 * r * dir, RIM_R - r * 5, 3, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  drawPlayer(ctx, p) {
    const team0 = p.team === 0;
    const kit = team0 ? this.jersey : { primary: this.opp.color, secondary: '#0E1B33', accent: this.opp.color2 };
    const active = p === this.active && p.team === 0;
    const jump = p.jump > 0 ? Math.sin((1 - p.jump / 0.42) * Math.PI) * 22 : 0;
    const run = Math.sin(p.anim * 2) * (p.moving ? 3 : 0.5);
    const bob = p.moving ? Math.abs(Math.sin(p.anim * 2)) * 2.5 : Math.sin(this.elapsed * 2 + p.idx) * 1.2;

    ctx.save();
    ctx.translate(p.pos.x, p.pos.y);

    // shadow
    ctx.fillStyle = 'rgba(0,0,0,0.22)';
    ctx.beginPath();
    ctx.ellipse(0, 18, 20, 8, 0, 0, Math.PI * 2);
    ctx.fill();

    if (active) {
      const pulse = 1 + Math.sin(this.elapsed * 5) * 0.06;
      ctx.save();
      ctx.scale(pulse, pulse);
      ctx.strokeStyle = 'rgba(255,107,26,0.95)';
      ctx.lineWidth = 3.5;
      ctx.setLineDash([9, 7]);
      ctx.lineDashOffset = -this.elapsed * 26;
      ctx.beginPath();
      ctx.ellipse(0, 16, 27, 13, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
      // arrow
      ctx.fillStyle = '#FF6B1A';
      ctx.beginPath();
      ctx.moveTo(0, -56 - bob + Math.sin(this.elapsed * 5) * 2);
      ctx.lineTo(-8, -66 - bob);
      ctx.lineTo(8, -66 - bob);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#0E1B33';
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    ctx.translate(0, -jump - bob);

    // legs
    ctx.fillStyle = '#1B2B45';
    roundRect(ctx, -12, 8, 9, 18 + run, 4); ctx.fill();
    roundRect(ctx, 3, 8, 9, 18 - run, 4); ctx.fill();
    // shoes
    ctx.fillStyle = kit.accent;
    roundRect(ctx, -14, 24 + run, 13, 7, 3); ctx.fill();
    roundRect(ctx, 1, 24 - run, 13, 7, 3); ctx.fill();

    // body / jersey
    ctx.fillStyle = kit.primary;
    ctx.strokeStyle = '#0E1B33';
    ctx.lineWidth = 2.2;
    roundRect(ctx, -16, -14, 32, 29, 9);
    ctx.fill(); ctx.stroke();

    // jersey side trim
    ctx.fillStyle = kit.secondary;
    roundRect(ctx, -16, 6, 32, 9, 4); ctx.fill();
    ctx.fillStyle = kit.accent;
    ctx.fillRect(-15, 8, 30, 2);

    // arms
    const armY = jump > 2 ? -20 : -2;
    ctx.fillStyle = p.skin;
    ctx.strokeStyle = '#0E1B33';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(-19, armY, 5.5, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.arc(19, armY, 5.5, 0, Math.PI * 2); ctx.fill(); ctx.stroke();

    // number
    ctx.fillStyle = kit.accent;
    ctx.font = '900 12px "Trebuchet MS", system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(p.number), 0, -2);

    // head
    ctx.fillStyle = p.skin;
    ctx.strokeStyle = '#0E1B33';
    ctx.lineWidth = 2.2;
    ctx.beginPath(); ctx.arc(0, -27, 13, 0, Math.PI * 2); ctx.fill(); ctx.stroke();

    // hair
    ctx.fillStyle = p.hair;
    ctx.beginPath();
    if (p.hairStyle === 'bun' || p.hairStyle === 'pony') {
      ctx.arc(0, -30, 13.5, Math.PI * 1.02, Math.PI * 1.98);
      ctx.fill();
      ctx.beginPath(); ctx.arc(0, -40, 5, 0, Math.PI * 2); ctx.fill();
    } else if (p.hairStyle === 'curly') {
      ctx.arc(0, -31, 14, Math.PI, Math.PI * 2);
      ctx.fill();
      for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.arc(i * 5, -41, 4.5, 0, Math.PI * 2); ctx.fill(); }
    } else {
      ctx.arc(0, -30, 13.5, Math.PI * 1.02, Math.PI * 1.98);
      ctx.fill();
      if (p.hairStyle === 'spiky') {
        ctx.beginPath();
        ctx.moveTo(-12, -34); ctx.lineTo(-7, -45); ctx.lineTo(-2, -35);
        ctx.lineTo(3, -46); ctx.lineTo(8, -35); ctx.lineTo(13, -42); ctx.lineTo(12, -30);
        ctx.closePath(); ctx.fill();
      }
    }

    // eyes + smile
    ctx.fillStyle = '#0E1B33';
    ctx.beginPath(); ctx.arc(-4.5, -27, 1.5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(4.5, -27, 1.5, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#0E1B33';
    ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.arc(0, -23, 4, 0.2, Math.PI - 0.2); ctx.stroke();

    // headband for player team
    if (team0) {
      ctx.strokeStyle = kit.secondary;
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(0, -30, 12.5, Math.PI * 1.06, Math.PI * 1.94); ctx.stroke();
    }

    ctx.restore();
  }

  drawBall(ctx) {
    const b = this.ball;
    if (b.dead) return;
    const x = b.pos.x;
    const y = b.pos.y - b.z - 4;
    const shadowScale = clamp(1 - b.z / 220, 0.35, 1);

    ctx.fillStyle = `rgba(0,0,0,${0.2 * shadowScale})`;
    ctx.beginPath();
    ctx.ellipse(b.pos.x, b.pos.y + 12, 10 * shadowScale, 4 * shadowScale, 0, 0, Math.PI * 2);
    ctx.fill();

    // trail for shots
    if (b.flight?.type === 'shot') {
      ctx.fillStyle = 'rgba(255,107,26,0.18)';
      for (let i = 1; i <= 4; i++) {
        const tt = clamp(b.flight.t - i * 0.045, 0, 1);
        const px = b.flight.from.x + (b.flight.to.x - b.flight.from.x) * tt;
        const py = b.flight.from.y + (b.flight.to.y - b.flight.from.y) * tt - Math.sin(Math.PI * tt) * b.flight.apex;
        ctx.beginPath(); ctx.arc(px, py, 8 - i, 0, Math.PI * 2); ctx.fill();
      }
    }

    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = 'rgba(255,201,60,0.35)';
    ctx.beginPath(); ctx.arc(0, 0, 17, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#FF7A1A';
    ctx.strokeStyle = '#FFF6E8';
    ctx.lineWidth = 2.4;
    ctx.beginPath(); ctx.arc(0, 0, 13, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = '#14264A';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(0, 0, 13, -Math.PI / 2, Math.PI / 2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-13, 0); ctx.lineTo(13, 0); ctx.stroke();
    ctx.beginPath(); ctx.arc(0, 0, 13, Math.PI * 0.15, Math.PI * 0.85); ctx.stroke();
    ctx.beginPath(); ctx.arc(0, 0, 13, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke();
    ctx.restore();
  }
}
