import { LEAGUES, JERSEYS, COURTS, STARTER_PLAYERS, CARD_POOL, RANKS, LEADERBOARD_SEED, SCHOOLS } from './data.js';

const KEY = 'ada_super_league_v1';
const DAY = 86400000;

function clone(v) { return JSON.parse(JSON.stringify(v)); }

function defaultState() {
  const leagueProgress = {};
  LEAGUES.forEach((l) => { leagueProgress[l.id] = { results: {}, wins: 0 }; });
  return {
    version: 1,
    profile: null,
    coins: 220,
    xp: 0,
    totalWins: 0,
    totalGames: 0,
    leagueIndex: 0,
    leagueProgress,
    players: clone(STARTER_PLAYERS),
    unlockedJerseys: ['training'],
    equippedJersey: 'training',
    unlockedCourts: ['school'],
    equippedCourt: 'school',
    cardPacks: 1,
    lastDaily: null,
    streak: 0,
    claimedTrials: [],
    pendingChampion: null,
    settings: { sound: true },
    stats: { shots: 0, makes: 0, steals: 0, blocks: 0 }
  };
}

function mergeState(base, saved) {
  if (!saved || typeof saved !== 'object') return base;
  const out = { ...base, ...saved };
  out.settings = { ...base.settings, ...(saved.settings || {}) };
  out.stats = { ...base.stats, ...(saved.stats || {}) };
  out.leagueProgress = { ...base.leagueProgress, ...(saved.leagueProgress || {}) };
  LEAGUES.forEach((l) => {
    const b = base.leagueProgress[l.id];
    const s = out.leagueProgress[l.id] || {};
    out.leagueProgress[l.id] = { ...b, ...s, results: { ...(s.results || {}) } };
  });
  if (!Array.isArray(out.players) || out.players.length !== 5) out.players = clone(STARTER_PLAYERS);
  out.players = out.players.map((p, i) => ({
    ...clone(STARTER_PLAYERS[i]),
    ...p,
    stats: { ...clone(STARTER_PLAYERS[i].stats), ...(p.stats || {}) }
  }));
  if (!Array.isArray(out.unlockedJerseys)) out.unlockedJerseys = ['training'];
  if (!out.unlockedJerseys.includes('training')) out.unlockedJerseys.push('training');
  if (!Array.isArray(out.unlockedCourts)) out.unlockedCourts = ['school'];
  if (!out.unlockedCourts.includes('school')) out.unlockedCourts.push('school');
  if (!out.unlockedJerseys.includes(out.equippedJersey)) out.equippedJersey = 'training';
  if (!out.unlockedCourts.includes(out.equippedCourt)) out.equippedCourt = 'school';
  return out;
}

export let state = (() => {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? mergeState(defaultState(), JSON.parse(raw)) : defaultState();
  } catch (e) {
    return defaultState();
  }
})();

export function save() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* storage blocked */ }
}

export function resetProgress() {
  state = defaultState();
  save();
}

export function addCoins(n) {
  state.coins = Math.max(0, Math.round(state.coins + n));
  save();
}

export function addXp(n) {
  state.xp = Math.max(0, Math.round(state.xp + n));
  save();
}

export function levelInfo() {
  const level = Math.floor(state.xp / 300) + 1;
  const into = state.xp % 300;
  return { level, into, need: 300, rank: RANKS[Math.min(RANKS.length - 1, Math.floor((level - 1) / 2))] };
}

export function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function yesterdayKey() {
  const d = new Date(Date.now() - DAY);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function dailyAvailable() {
  return state.lastDaily !== todayKey();
}

export function dailyReward() {
  const streak = state.lastDaily === yesterdayKey() ? state.streak + 1 : 1;
  return { coins: 100 + Math.min(4, streak - 1) * 25, packs: 1, streak };
}

export function claimDaily() {
  if (!dailyAvailable()) return null;
  const r = dailyReward();
  state.streak = r.streak;
  state.lastDaily = todayKey();
  state.coins += r.coins;
  state.cardPacks += r.packs;
  save();
  return r;
}

export function currentLeague() {
  return LEAGUES[Math.min(LEAGUES.length - 1, state.leagueIndex)];
}

export function leaguePoints(league) {
  const p = state.leagueProgress[league.id];
  return (p?.wins || 0) * 3;
}

export function leagueComplete(league) {
  return (state.leagueProgress[league.id]?.wins || 0) >= 2;
}

export function nextOpponent(league) {
  const results = state.leagueProgress[league.id]?.results || {};
  return league.teams.find((t) => results[t.id] !== 'win') || league.teams[0];
}

export function teamOverall() {
  const sum = state.players.reduce((acc, p) => {
    const s = p.stats;
    return acc + (s.speed + s.shoot + s.dribble + s.defense) / 4;
  }, 0);
  return Math.round(sum / state.players.length);
}

export function upgradeCost(value) {
  return Math.max(20, Math.round((value - 30) * 2.2 / 5) * 5);
}

export function upgradeStat(playerIndex, stat) {
  const p = state.players[playerIndex];
  if (!p || !(stat in p.stats)) return { ok: false, reason: 'invalid' };
  if (p.stats[stat] >= 99) return { ok: false, reason: 'max' };
  const cost = upgradeCost(p.stats[stat]);
  if (state.coins < cost) return { ok: false, reason: 'coins', cost };
  state.coins -= cost;
  p.stats[stat] = Math.min(99, p.stats[stat] + 2);
  save();
  return { ok: true, cost, value: p.stats[stat] };
}

export function jerseyById(id) { return JERSEYS.find((j) => j.id === id) || JERSEYS[0]; }
export function courtById(id) { return COURTS.find((c) => c.id === id) || COURTS[0]; }

export function equipJersey(id) {
  if (!state.unlockedJerseys.includes(id)) return false;
  state.equippedJersey = id; save(); return true;
}
export function equipCourt(id) {
  if (!state.unlockedCourts.includes(id)) return false;
  state.equippedCourt = id; save(); return true;
}
export function buyJersey(id) {
  const j = JERSEYS.find((x) => x.id === id);
  if (!j) return { ok: false };
  if (state.unlockedJerseys.includes(id)) { equipJersey(id); return { ok: true, equipped: true }; }
  if (state.coins < j.price) return { ok: false, reason: 'coins' };
  state.coins -= j.price;
  state.unlockedJerseys.push(id);
  state.equippedJersey = id;
  save();
  return { ok: true, bought: true };
}
export function buyCourt(id) {
  const c = COURTS.find((x) => x.id === id);
  if (!c) return { ok: false };
  if (state.unlockedCourts.includes(id)) { equipCourt(id); return { ok: true, equipped: true }; }
  if (state.coins < c.price) return { ok: false, reason: 'coins' };
  state.coins -= c.price;
  state.unlockedCourts.push(id);
  state.equippedCourt = id;
  save();
  return { ok: true, bought: true };
}

export function recordMatch(leagueIndex, opponentId, win, score, oppScore, extra = {}) {
  const league = LEAGUES[leagueIndex] || LEAGUES[0];
  state.totalGames += 1;
  let coins = 0, xp = 0, leveledLeague = false;

  if (win) {
    coins = Math.round((league.coinReward + score * 4) / 5) * 5;
    xp = league.xpReward + score * 3;
    state.totalWins += 1;
    const prog = state.leagueProgress[league.id];
    if (leagueIndex === state.leagueIndex && prog.results[opponentId] !== 'win') {
      prog.results[opponentId] = 'win';
      prog.wins = Object.values(prog.results).filter((r) => r === 'win').length;
      // Only celebrate the moment a league is first completed. The final
      // league keeps leagueIndex at 4, so `>= 2` would replay the champion
      // popup after every extra friendly win.
      if (prog.wins === 2) {
        leveledLeague = true;
        state.pendingChampion = league.id;
        if (state.leagueIndex < LEAGUES.length - 1) state.leagueIndex += 1;
      }
    }
  } else {
    coins = 15;
    xp = 18;
    if (leagueIndex === state.leagueIndex) {
      const prog = state.leagueProgress[league.id];
      if (prog.results[opponentId] !== 'win') prog.results[opponentId] = 'loss';
    }
  }

  state.coins += coins;
  state.xp += xp;
  state.stats.shots += extra.shots || 0;
  state.stats.makes += extra.makes || 0;
  state.stats.steals += extra.steals || 0;
  state.stats.blocks += extra.blocks || 0;
  save();
  return { coins, xp, leveledLeague, league };
}

export function openCardPack() {
  if (state.cardPacks <= 0) return null;
  state.cardPacks -= 1;
  const total = CARD_POOL.reduce((a, c) => a + c.weight, 0);
  let roll = Math.random() * total;
  let pick = CARD_POOL[CARD_POOL.length - 1];
  for (const c of CARD_POOL) { roll -= c.weight; if (roll <= 0) { pick = c; break; } }

  const result = { ...pick };
  if (pick.type === 'coins') { state.coins += pick.amount; result.amount = pick.amount; }
  else if (pick.type === 'xp') { state.xp += pick.amount; result.amount = pick.amount; }
  else if (pick.type === 'boost') {
    const p = state.players[Math.floor(Math.random() * state.players.length)];
    const keys = ['speed', 'shoot', 'dribble', 'defense'];
    const k = keys[Math.floor(Math.random() * keys.length)];
    p.stats[k] = Math.min(99, p.stats[k] + pick.amount);
    result.player = p.name;
    result.stat = k;
    result.icon = '💪';
    result.name = `${p.name} +${pick.amount} ${statLabel(k)}`;
  } else if (pick.type === 'jersey') {
    if (state.unlockedJerseys.includes(pick.id)) { state.coins += 120; result.duplicate = true; result.coins = 120; result.name = 'Duplikat → 120 Koin'; }
    else { state.unlockedJerseys.push(pick.id); }
  } else if (pick.type === 'court') {
    if (state.unlockedCourts.includes(pick.id)) { state.coins += 150; result.duplicate = true; result.coins = 150; result.name = 'Duplikat → 150 Koin'; }
    else { state.unlockedCourts.push(pick.id); }
  }
  save();
  return result;
}

export function statLabel(k) {
  return ({ speed: 'Kecepatan', shoot: 'Tembakan', dribble: 'Dribble', defense: 'Bertahan' })[k] || k;
}

export function leaderboard(kind = 'global', ageGroup = '8-11') {
  const base = LEADERBOARD_SEED.map((e) => ({ ...e, you: false }));
  if (state.profile) {
    base.push({
      name: state.profile.name,
      age: state.profile.age,
      school: state.profile.school,
      xp: state.xp,
      you: true
    });
    // friendly local rivals for the "school" board so it never feels empty
    if (kind === 'school' && !base.some((e) => e.school === state.profile.school && !e.you)) {
      const names = ['Arya', 'Salsa', 'Kevin', 'Nadia'];
      names.forEach((n, i) => {
        base.push({
          name: n,
          age: Math.min(15, Math.max(8, state.profile.age + (i % 3) - 1)),
          school: state.profile.school,
          xp: Math.max(60, state.xp - 90 + i * 130),
          you: false
        });
      });
    }
  }
  let list = base;
  if (kind === 'school' && state.profile) list = list.filter((e) => e.school === state.profile.school);
  if (kind === 'age') {
    list = list.filter((e) => (ageGroup === '8-11' ? e.age <= 11 : e.age >= 12));
  }
  list = list.slice().sort((a, b) => b.xp - a.xp);
  return list.map((e, i) => ({ ...e, rank: i + 1 }));
}

export function playerRank(kind, ageGroup) {
  const list = leaderboard(kind, ageGroup);
  const me = list.find((e) => e.you);
  return me ? me.rank : null;
}

export function ensureProfile(data) {
  state.profile = { ...data, joined: new Date().toISOString() };
  save();
}

export { SCHOOLS };
