import { LEAGUES, JERSEYS, COURTS, PLAYER_TEAM, ACADEMY_WA, MESSAGES } from './data.js';
import {
  state, save, levelInfo, dailyAvailable, dailyReward, claimDaily,
  currentLeague, leaguePoints, leagueComplete, nextOpponent, teamOverall,
  upgradeCost, upgradeStat, jerseyById, courtById, buyJersey, buyCourt,
  recordMatch, openCardPack, leaderboard, playerRank, ensureProfile, statLabel
} from './state.js';
import { Game } from './game.js';
import { audio } from './audio.js';

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmtClock = (s) => `${Math.floor(Math.max(0, s) / 60)}:${String(Math.floor(Math.max(0, s) % 60)).padStart(2, '0')}`;
const colorFor = (name) => ['#FF6B1A', '#2C9FE0', '#1FB98C', '#8B5CF6', '#E850A8', '#D9A514'][[...String(name)].reduce((a, c) => a + c.charCodeAt(0), 0) % 6];

/* ---------------- modal system ---------------- */
function openModal(html, opts = {}) {
  const root = $('#modal-root');
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = html;
  root.appendChild(overlay);
  const close = () => {
    overlay.remove();
    if (opts.onClose) opts.onClose();
  };
  overlay._close = close;
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay && opts.dismissible !== false) close();
  });
  $$('[data-close]', overlay).forEach((b) => b.addEventListener('click', close));
  return overlay;
}
function closeAllModals() { $('#modal-root').innerHTML = ''; }

function toast(msg) {
  const el = $('#toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => el.classList.remove('show'), 2300);
}

function confetti(count = 60) {
  const root = $('#confetti');
  root.innerHTML = '';
  const colors = ['#FF6B1A', '#FFC93C', '#5CC8FF', '#2ED3A6', '#FF5CA8', '#FFFFFF'];
  for (let i = 0; i < count; i++) {
    const s = document.createElement('span');
    s.style.left = `${Math.random() * 100}%`;
    s.style.background = colors[i % colors.length];
    s.style.animationDuration = `${1.6 + Math.random() * 1.6}s`;
    s.style.animationDelay = `${Math.random() * 0.5}s`;
    s.style.width = `${5 + Math.random() * 6}px`;
    s.style.height = `${8 + Math.random() * 9}px`;
    s.style.opacity = 0.85;
    root.appendChild(s);
  }
  clearTimeout(confetti._t);
  confetti._t = setTimeout(() => { root.innerHTML = ''; }, 3800);
}

/* ---------------- avatars / previews ---------------- */
function avatarSVG(p, kit, bg = '#FFE9CC') {
  const j = kit || jerseyById(state.equippedJersey);
  const skin = p.skin || '#F2B27E';
  const hair = p.hair || '#2B1B12';
  const style = p.hairStyle || 'fade';
  let hairBack = '';
  let fringe = '';
  if (style === 'bun' || style === 'pony') {
    hairBack = `<circle cx="50" cy="36" r="26" fill="${hair}"/><circle cx="50" cy="18" r="8" fill="${hair}"/>`;
    fringe = `<path d="M26 38 C27 22 40 17 50 17 C60 17 73 22 74 38 C66 30 58 28 50 30 C42 28 34 30 26 38Z" fill="${hair}"/>`;
  } else if (style === 'curly') {
    hairBack = `<circle cx="50" cy="36" r="26" fill="${hair}"/>`;
    fringe = `<path d="M25 38 C26 21 39 15 50 15 C61 15 74 21 75 38 C70 32 65 30 60 31 C58 26 52 26 50 30 C47 26 41 26 40 31 C35 30 30 32 25 38Z" fill="${hair}"/>`;
  } else if (style === 'spiky') {
    hairBack = `<circle cx="50" cy="36" r="25" fill="${hair}"/>`;
    fringe = `<path d="M26 36 L31 20 L37 30 L43 16 L49 29 L55 15 L61 29 L68 18 L72 34 C64 27 56 26 50 29 C42 27 34 29 26 36Z" fill="${hair}"/>`;
  } else {
    hairBack = `<circle cx="50" cy="37" r="25" fill="${hair}"/>`;
    fringe = `<path d="M26 38 C27 23 38 17 50 17 C62 17 73 23 74 38 C68 30 59 28 50 30 C41 28 32 30 26 38Z" fill="${hair}"/>`;
  }
  return `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <rect width="100" height="100" fill="${bg}"/>
    <circle cx="50" cy="52" r="46" fill="rgba(255,255,255,.35)"/>
    ${hairBack}
    <circle cx="50" cy="43" r="24" fill="${skin}" stroke="#0E1B33" stroke-width="3"/>
    ${fringe}
    <circle cx="41" cy="44" r="2.4" fill="#0E1B33"/>
    <circle cx="59" cy="44" r="2.4" fill="#0E1B33"/>
    <path d="M43 53 Q50 59 57 53" fill="none" stroke="#0E1B33" stroke-width="2.4" stroke-linecap="round"/>
    <path d="M14 100 C16 80 29 71 50 71 C71 71 84 80 86 100 Z" fill="${j.primary}" stroke="#0E1B33" stroke-width="3"/>
    <path d="M31 74 C36 88 42 94 50 94 C58 94 64 88 69 74" fill="none" stroke="${j.secondary}" stroke-width="5"/>
    <path d="M31 78 L69 78 L69 86 L31 86 Z" fill="${j.secondary}" opacity=".85"/>
    <text x="50" y="85" text-anchor="middle" font-size="11" font-weight="900" fill="${j.accent}" font-family="Trebuchet MS, sans-serif">${esc(p.number ?? '')}</text>
  </svg>`;
}

function jerseySVG(kit) {
  return `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <path d="M34 18 L43 12 L50 20 L57 12 L66 18 L82 30 L72 41 L67 35 L67 88 L33 88 L33 35 L28 41 L18 30 Z"
      fill="${kit.primary}" stroke="#0E1B33" stroke-width="3.4" stroke-linejoin="round"/>
    <path d="M33 64 L67 64 L67 76 L33 76 Z" fill="${kit.secondary}"/>
    <path d="M43 12 L50 20 L57 12" fill="none" stroke="${kit.accent}" stroke-width="3"/>
    <text x="50" y="57" text-anchor="middle" font-size="17" font-weight="900" fill="${kit.accent}" font-family="Trebuchet MS, sans-serif">ADA</text>
    <text x="50" y="86" text-anchor="middle" font-size="6" font-weight="900" fill="${kit.accent}" font-family="Trebuchet MS, sans-serif">ACADEMY</text>
  </svg>`;
}

function courtPreviewHTML(court) {
  return `<div class="mini-court" style="background:${court.bg}">
    <div class="floor" style="background:${court.floor}">
      <div class="mid"></div><div class="circle"></div>
      <div class="hoop" style="top:10px"></div>
      <div class="hoop" style="bottom:10px"></div>
    </div>
  </div>`;
}

/* ---------------- navigation ---------------- */
let current = 'home';

function updateCoinChips() {
  $$('.coin-chip b').forEach((b) => { b.textContent = state.coins; });
}

function showScreen(name) {
  current = name;
  $$('.screen').forEach((s) => s.classList.toggle('active', s.id === `screen-${name}`));
  const nav = $('#bottom-nav');
  nav.classList.toggle('hidden', !state.profile || name === 'onboard');
  $$('#bottom-nav button').forEach((b) => b.classList.toggle('active', b.dataset.nav === name));
  if (name === 'home') renderHome();
  if (name === 'league') renderLeague();
  if (name === 'team') renderTeam();
  if (name === 'leaderboard') renderLeaderboard();
  if (name === 'shop') renderShop();
  updateCoinChips();
  const body = $(`#screen-${name} .scroll-body`);
  if (body) body.scrollTop = 0;
}

/* ---------------- home ---------------- */
function renderHome() {
  if (!state.profile) return;
  const league = currentLeague();
  const opp = nextOpponent(league);
  const lvl = levelInfo();
  const prog = state.leagueProgress[league.id];
  const wins = prog?.wins || 0;
  const daily = dailyAvailable();
  const dr = dailyReward();
  const pending = state.pendingChampion && !state.claimedTrials.includes(state.pendingChampion);

  $('#home-profile').innerHTML = `
    <div class="avatar">${avatarSVG(state.players[0])}</div>
    <div class="profile-info">
      <div class="profile-name">${esc(state.profile.name)} <span style="font-size:9px;color:#FFC93C">Lv.${lvl.level}</span></div>
      <div class="profile-meta">${state.profile.age} th • ${esc(state.profile.school)} • <b>${lvl.rank}</b></div>
      <div class="xp-track"><i style="width:${Math.round((lvl.into / lvl.need) * 100)}%"></i></div>
    </div>
    <div class="coin-chip hero-coins"><span>🪙</span><b>${state.coins}</b></div>`;

  const db = $('#daily-banner');
  db.className = `daily-banner ${daily ? '' : 'claimed'}`;
  db.innerHTML = `
    <span class="gift">${daily ? '🎁' : '✅'}</span>
    <div class="d-text">
      <div class="d-title">${daily ? 'Hadiah Harian Siap!' : 'Hadiah sudah diambil'}</div>
      <div class="d-sub">${daily ? `+${dr.coins} koin &amp; 1 paket kartu` : 'Balik lagi besok, ya!'}</div>
    </div>
    <span class="d-go">${daily ? 'AMBIL' : 'OK'}</span>`;

  $('#btn-play').innerHTML = `
    <div>
      <div class="p-eyebrow">${esc(league.name.toUpperCase())} • ${leagueComplete(league) ? 'FRIENDLY' : 'MATCH'}</div>
      <div class="p-title">MAIN<br>SEKARANG</div>
      <div class="p-sub">vs <b>${esc(opp.name)}</b> ${opp.mascot}</div>
    </div>
    <div class="p-ball">${opp.mascot}</div>
    <div class="p-arrow">▶</div>`;

  const trial = $('#trial-banner');
  if (pending) {
    const pl = LEAGUES.find((l) => l.id === state.pendingChampion) || league;
    trial.classList.remove('hidden');
    trial.innerHTML = `<div class="t-emoji">🎟️</div><div class="t-text"><b>Free Trial ADA Academy!</b>Kamu juara ${esc(pl.name)}. Klaim hadiahmu!</div><button id="trial-claim">KLAIM</button>`;
    $('#trial-claim').onclick = () => { audio.play('click'); showChampionModal(pl.id); };
  } else {
    trial.classList.add('hidden');
    trial.innerHTML = '';
  }

  $('#home-league').innerHTML = `
    <div class="lm-top">
      <div class="lm-icon" style="background:${league.color2}">${league.icon}</div>
      <div>
        <div class="lm-name">${esc(league.name)}</div>
        <div class="lm-sub">${wins}/2 menang • ${leaguePoints(league)} poin liga</div>
      </div>
      <div class="lm-arrow">›</div>
    </div>
    <div class="lm-bar">${[0, 1].map((i) => `<i class="${i < wins ? 'on' : ''}"></i>`).join('')}</div>`;

  $('#home-squad').innerHTML = `
    <div class="hs-head"><span>TIM KAMU</span><b>${teamOverall()} OVR</b></div>
    <div class="hs-row">${state.players.map((p) => `
      <div class="hs-player">
        <div class="avatar">${avatarSVG(p)}</div>
        <span>${esc(String(p.name).split(' ')[0])}</span>
      </div>`).join('')}</div>`;

  const top = leaderboard('global').slice(0, 3);
  $('#home-top').innerHTML = `
    <div class="ht-head"><span>PAPAN PERINGKAT</span><b>LIHAT SEMUA ›</b></div>
    ${top.map((e) => `
      <div class="ht-row ${e.you ? 'you' : ''}">
        <div class="ht-rank">${e.rank === 1 ? '🥇' : e.rank === 2 ? '🥈' : '🥉'}</div>
        <div class="ht-name">${esc(e.name)}${e.you ? ' (KAMU)' : ''}<br><small>${esc(e.school)}</small></div>
        <div class="ht-xp">${e.xp} XP</div>
      </div>`).join('')}`;

  $('#home-tip').innerHTML = `💡 <b>Tips:</b> ${MESSAGES.tip[Math.floor(Math.random() * MESSAGES.tip.length)]}`;

  $('#daily-banner').onclick = () => { audio.play('click'); showDailyModal(); };
  $('#btn-play').onclick = () => { audio.play('click'); openPrematch(league, nextOpponent(league)); };
  $('#home-league').onclick = () => { audio.play('click'); showScreen('league'); };
  $('#home-squad').onclick = () => { audio.play('click'); showScreen('team'); };
  $('#home-top').onclick = () => { audio.play('click'); showScreen('leaderboard'); };
}

/* ---------------- league ---------------- */
function renderLeague() {
  const league = currentLeague();
  const prog = state.leagueProgress[league.id];
  const wins = prog?.wins || 0;
  const points = wins * 3;
  const complete = leagueComplete(league);

  $('#league-hero').innerHTML = `
    <div class="lh-icon">${league.icon}</div>
    <div class="lh-eyebrow">LIGA AKTIF</div>
    <div class="lh-name">${esc(league.name)}</div>
    <div class="lh-sub">${complete ? 'Liga selesai! Kamu juara. Main friendly atau cek liga berikutnya.' : 'Menangkan 2 dari 3 pertandingan untuk naik liga!'}</div>
    <div class="lh-row"><span class="lh-badge">4 TIM</span><span class="lh-badge">5 vs 5</span><span class="lh-badge">2 MENIT</span><span class="lh-points"><b>${points}</b>/6 POIN</span></div>`;

  $('#league-progress').innerHTML = `
    <div class="progress-head"><span>PROGRES LIGA</span><span>${wins}/2 MENANG</span></div>
    <div class="pips">${[0, 1].map((i) => `<i class="${i < wins ? 'on' : ''}"></i>`).join('')}</div>
    ${state.pendingChampion ? `<button id="league-trial" class="btn btn-gold btn-block btn-sm" style="margin-top:10px">🎟️ KLAIM FREE TRIAL</button>` : ''}`;

  const trialBtn = $('#league-trial');
  if (trialBtn) trialBtn.onclick = () => showChampionModal(state.pendingChampion);

  $('#league-opponents').innerHTML = league.teams.map((t) => {
    const res = prog?.results?.[t.id];
    return `<div class="opponent-card ${res === 'win' ? 'won' : res === 'loss' ? 'lost' : ''}">
      <div class="opponent-mascot" style="background:${t.color};color:#fff">${t.mascot}</div>
      <div class="opponent-info">
        <div class="opponent-name">${esc(t.name)}</div>
        <div class="opponent-meta"><span class="rating-pill">OVR ${t.rating}</span><span>${esc(league.name)}</span></div>
      </div>
      ${res === 'win' ? '<span class="opponent-status win">MENANG</span>' : res === 'loss' ? '<span class="opponent-status loss">KALAH</span>' : ''}
      <button class="btn btn-sm ${res === 'win' ? 'btn-gold' : 'btn-primary'} opponent-play" data-play="${t.id}">${res === 'win' ? 'MAIN LAGI' : res === 'loss' ? 'COBA LAGI' : 'MAIN'}</button>
    </div>`;
  }).join('');

  $('#league-ladder').innerHTML = LEAGUES.map((l, i) => {
    const done = i < state.leagueIndex || (i === LEAGUES.length - 1 && leagueComplete(l));
    const active = i === state.leagueIndex && !done;
    return `<div class="ladder-row ${done ? 'done' : active ? 'current' : ''}">
      <div class="ladder-icon">${l.icon}</div>
      <div class="ladder-name">${esc(l.name)}</div>
      <span class="ladder-status">${done ? 'JUARA' : active ? 'SEKARANG' : 'TERKUNCI'}</span>
    </div>`;
  }).join('');

  $$('#league-opponents [data-play]').forEach((btn) => {
    btn.onclick = () => {
      audio.play('click');
      const t = league.teams.find((x) => x.id === btn.dataset.play);
      openPrematch(league, t);
    };
  });
}

/* ---------------- prematch ---------------- */
function openPrematch(league, opponent) {
  const diff = ['MUDAH', 'SEDANG', 'SULIT', 'PRO', 'LEGENDA'][LEAGUES.indexOf(league)] || 'SEDANG';
  const court = courtById(state.equippedCourt);
  const jersey = jerseyById(state.equippedJersey);
  const overlay = openModal(`
    <div class="modal prematch">
      <button class="modal-close" data-close>✕</button>
      <div class="pm-league">${esc(league.name.toUpperCase())} • ${leagueComplete(league) ? 'FRIENDLY' : 'PERTANDINGAN'}</div>
      <div class="pm-teams">
        <div class="pm-team">
          <div class="pm-badge" style="background:${jersey.primary}">🔥</div>
          <div class="pm-name">ADA Sparks</div>
        </div>
        <div class="pm-vs">VS</div>
        <div class="pm-team">
          <div class="pm-badge" style="background:${opponent.color}">${opponent.mascot}</div>
          <div class="pm-name">${esc(opponent.name)}</div>
        </div>
      </div>
      <div class="pm-meta">
        <span>⭐ OVR ${opponent.rating}</span>
        <span>🔥 ${diff}</span>
        <span>⏱️ 2 menit</span>
        <span>🏟️ ${esc(court.name)}</span>
      </div>
      <div class="pm-tip">🕹️ <b>Joystick</b> untuk jalan. <b>SHOOT</b> buat nembak, <b>PASS</b> buat oper, <b>STEAL</b> buat rebut bola. Swipe ke atas di lapangan juga bisa nembak!</div>
      <div class="modal-actions">
        <button class="btn btn-primary btn-block btn-big" id="start-match">MULAI PERTANDINGAN 🏀</button>
      </div>
    </div>`);
  $('#start-match', overlay).onclick = () => {
    audio.play('whistle');
    closeAllModals();
    startMatch(league, opponent);
  };
}

/* ---------------- game ---------------- */
let game = null;
let activeMatch = null;
let tipTimer = null;

function startMatch(league, opponent) {
  closeAllModals();
  $$('.screen').forEach((s) => s.classList.remove('active'));
  $('#bottom-nav').classList.add('hidden');
  $('#game-layer').classList.remove('hidden');
  $('#game-hud').classList.remove('hidden');
  $('#controls').classList.remove('hidden');
  $('#hud-you').textContent = PLAYER_TEAM.name.toUpperCase();
  $('#hud-them').textContent = opponent.name.toUpperCase();
  $('#hud-score-you').textContent = '0';
  $('#hud-score-them').textContent = '0';
  $('#hud-time').textContent = '2:00';
  $('#hud-shot').textContent = '14';
  $('#steal-label').textContent = 'DRIBBLE';

  activeMatch = { league, opponent, leagueIndex: LEAGUES.indexOf(league) };
  audio.init();
  if (state.settings.sound) audio.startMusic();

  const canvas = $('#game-canvas');
  game = new Game(canvas, {
    players: state.players,
    jersey: jerseyById(state.equippedJersey),
    court: courtById(state.equippedCourt),
    opponent,
    league,
    difficulty: league.difficulty,
    audio,
    onHud: (h) => {
      $('#hud-score-you').textContent = h.score[0];
      $('#hud-score-them').textContent = h.score[1];
      $('#hud-time').textContent = h.overtime ? `OT ${fmtClock(h.time)}` : fmtClock(h.time);
      $('#hud-shot').textContent = Math.ceil(h.shotClock);
      $('#hud-shot-wrap').classList.toggle('low', h.shotClock <= 5 && h.state === 'live');
      const label = h.label;
      $('#steal-label').textContent = label;
      $('#btn-steal').querySelector('.a-icon').textContent = label === 'DRIBBLE' ? '⚡' : label === 'BLOK' ? '🛡️' : '✋';
    },
    onEnd: (result) => handleGameEnd(result),
    onAutoPause: () => showPauseModal()
  });
  game.start();
  window.__adaGame = game;
  showGameTip();
}

function showGameTip() {
  const tip = $('#game-tip');
  tip.textContent = '🕹️ Joystick • PASS / SHOOT / STEAL • Swipe ↑ = tembak!';
  tip.classList.remove('hidden');
  clearTimeout(tipTimer);
  tipTimer = setTimeout(() => tip.classList.add('hidden'), 4800);
}

function cleanupGame() {
  if (game) { game.destroy(); game = null; }
  window.__adaGame = null;
  $('#game-layer').classList.add('hidden');
  $('#game-hud').classList.add('hidden');
  $('#controls').classList.add('hidden');
  $('#game-tip').classList.add('hidden');
  clearTimeout(tipTimer);
}

function handleGameEnd(result) {
  if (!activeMatch) { cleanupGame(); showScreen('home'); return; }
  const { league, opponent, leagueIndex } = activeMatch;
  const res = recordMatch(leagueIndex, opponent.id, result.win, result.score, result.oppScore, result);
  cleanupGame();
  showScreen('league');
  audio.play(result.win ? 'win' : result.draw ? 'buzzer' : 'lose');
  if (result.win) confetti(70);
  showResultModal(result, res, league, opponent, leagueIndex);
}

function shareResult(result, league, opponent) {
  const text = result.win
    ? `🏆 PAMERIN PIALA KAMU! Aku menang ${result.score}-${result.oppScore} lawan ${opponent.name} di ${league.name}, ADA Super League! Tantang aku yuk! 🏀🔥 #ADABasketballAcademy`
    : `🏀 Aku baru main ${result.score}-${result.oppScore} lawan ${opponent.name} di ${league.name}, ADA Super League. Ayo tantang aku! 🏀 #ADABasketballAcademy`;
  const url = location.href.split('#')[0];
  window.open(`https://wa.me/?text=${encodeURIComponent(`${text}\n${url}`)}`, '_blank', 'noopener');
}

function showResultModal(result, res, league, opponent, leagueIndex) {
  const win = result.win;
  const draw = result.draw;
  const mvp = result.topScorer ? `${result.topScorer} • ${result.topPoints} poin` : 'Tim kamu kompak!';
  const overlay = openModal(`
    <div class="modal result">
      <button class="modal-close" data-close>✕</button>
      <div class="result-emoji">${win ? '🏆' : draw ? '🤝' : '😤'}</div>
      <h2 class="result-title ${win ? 'win' : 'lose'}">${win ? 'MENANG!' : draw ? 'SERI!' : 'COBA LAGI!'}</h2>
      <div class="result-score"><b>${result.score}</b><span>:</span><b>${result.oppScore}</b></div>
      <div class="result-rewards">
        <span class="reward-chip">🪙 <span>+${res.coins}</span></span>
        <span class="reward-chip">⭐ <span>+${res.xp} XP</span></span>
      </div>
      <div class="result-mvp">MVP: <b>${esc(mvp)}</b>${result.overtime ? ' • OVERTIME' : ''}</div>
      ${win ? `<p class="modal-sub" style="margin-bottom:0">${res.leveledLeague ? 'Liga selesai! Kamu juara liga ini! 🎉' : 'Kerja bagus! Teruskan perjalananmu ke puncak.'}</p>` : `<p class="modal-sub" style="margin-bottom:0">${draw ? 'Skor sama! Ayo ulangi dan menangkan.' : 'Tidak apa-apa! Pemain hebat selalu coba lagi. 💪'}</p>`}
      <div class="result-buttons">
        ${win ? `<button class="btn share-btn" id="share-result">📤 PAMERIN PIALA KAMU!</button>` : ''}
        <button class="btn btn-primary" id="result-next">${win ? (res.leveledLeague ? 'LIHAT HADIAH 🎁' : 'LANJUT') : 'COBA LAGI 🔁'}</button>
        ${win ? '' : '<button class="btn btn-navy" id="result-back">KEMBALI</button>'}
      </div>
    </div>`);

  let closed = false;
  const finish = (showChampion) => {
    if (closed) return;
    closed = true;
    overlay._close();
    if (showChampion && res.leveledLeague) showChampionModal(league.id);
  };
  overlay.addEventListener('click', (e) => { if (e.target === overlay) finish(false); });
  $('#share-result', overlay)?.addEventListener('click', () => { audio.play('click'); shareResult(result, league, opponent); });
  $('#result-next', overlay)?.addEventListener('click', () => {
    audio.play('click');
    if (win) finish(true);
    else {
      overlay._close();
      startMatch(league, opponent);
    }
  });
  $('#result-back', overlay)?.addEventListener('click', () => { audio.play('click'); overlay._close(); });
  const closeBtn = $('[data-close]', overlay);
  if (closeBtn) closeBtn.addEventListener('click', () => finish(false));
}

/* ---------------- champion + free trial ---------------- */
function showChampionModal(leagueId) {
  const league = LEAGUES.find((l) => l.id === leagueId) || currentLeague();
  const idx = LEAGUES.indexOf(league);
  const next = LEAGUES[idx + 1];
  const claimed = state.claimedTrials.includes(league.id);
  const overlay = openModal(`
    <div class="modal champion">
      <button class="modal-close" data-close>✕</button>
      <div class="trophy">🏆</div>
      <h2>KAMU JUARA!</h2>
      <p class="champ-sub">${next ? `Kamu naik ke <b>${esc(next.name)}</b>!` : 'Kamu menaklukkan <b>ADA Champion League</b>!'} Kamu dapat <b>1x FREE TRIAL</b> di ADA Basketball Academy. <b>Klaim Hadiahmu!</b></p>
      <div class="trial-card">
        <div class="tc-title">🎟️ 1x FREE TRIAL</div>
        <div class="tc-sub">Latihan bareng coach ADA Basketball Academy. Untuk anak 8–15 tahun. Tunjukkan popup ini ke coach saat datang.</div>
      </div>
      <div class="modal-actions">
        <button class="btn btn-green" id="claim-trial" ${claimed ? 'disabled' : ''}>${claimed ? '✅ SUDAH DIKLAIM' : 'KLAIM VIA WHATSAPP'}</button>
        <button class="btn btn-navy" data-close>NANTI DULU</button>
      </div>
      <p class="tiny" style="margin-bottom:0">Hadiah tersimpan di Beranda. Bisa diklaim kapan saja.</p>
    </div>`, { dismissible: true });
  confetti(90);
  audio.play('trial');

  $('#claim-trial', overlay).onclick = () => {
    if (claimed) return;
    state.claimedTrials.push(league.id);
    if (state.pendingChampion === league.id) state.pendingChampion = null;
    save();
    const msg = `Halo ADA Basketball Academy! 🏀\nAku ${state.profile?.name || ''}, ${state.profile?.age || ''} tahun dari ${state.profile?.school || ''}.\nAku juara ${league.name} di ADA Super League dan mau klaim 1x FREE TRIAL. Terima kasih!`;
    window.open(`https://wa.me/${ACADEMY_WA}?text=${encodeURIComponent(msg)}`, '_blank', 'noopener');
    toast('Hadiah diklaim! Sampai jumpa di ADA Academy 🏀');
    audio.play('coin');
    overlay._close();
    renderHome();
  };
}

/* ---------------- daily ---------------- */
function showDailyModal() {
  const available = dailyAvailable();
  const r = dailyReward();
  const streak = available ? r.streak : state.streak;
  const days = [1, 2, 3, 4, 5, 6, 7].map((d) => `<i class="${d <= Math.min(streak, 7) ? 'on' : ''} ${d === Math.min(streak, 7) ? 'today' : ''}">${d}</i>`).join('');
  const overlay = openModal(`
    <div class="modal daily">
      <button class="modal-close" data-close>✕</button>
      <div class="daily-head">
        <div class="daily-streak">🔥 STREAK ${streak} HARI</div>
        <h2 class="modal-title">Hadiah Harian</h2>
        <p class="modal-sub">${available ? 'Login tiap hari, hadiahnya makin besar!' : 'Kamu sudah ambil hadiah hari ini. Besok lagi ya!'}</p>
      </div>
      <div class="daily-rewards">
        <div class="daily-reward-box"><div class="dr-icon">🪙</div><div class="dr-name">${r.coins} Koin</div><div class="dr-sub">gratis</div></div>
        <div class="daily-reward-box"><div class="dr-icon">🎁</div><div class="dr-name">1 Paket</div><div class="dr-sub">kartu kejutan</div></div>
      </div>
      <div class="daily-days">${days}</div>
      <div class="modal-actions">
        ${available ? '<button class="btn btn-primary btn-block" id="claim-daily">AMBIL HADIAH</button>' : `<button class="btn btn-navy btn-block" data-close>OK, BESOK LAGI</button>`}
      </div>
    </div>`, { onClose: () => renderHome() });

  const claim = $('#claim-daily', overlay);
  if (claim) claim.onclick = () => {
    const got = claimDaily();
    if (!got) return;
    audio.play('coin');
    confetti(45);
    toast(`+${got.coins} koin & 1 paket kartu!`);
    overlay._close();
    renderHome();
    showDailyClaimed(got);
  };
}

function showDailyClaimed(got) {
  const overlay = openModal(`
    <div class="modal daily">
      <div class="daily-head">
        <div style="font-size:52px;line-height:1">🎉</div>
        <h2 class="modal-title">Hadiah Diterima!</h2>
        <p class="modal-sub">Streak ${got.streak} hari. Kembali besok buat bonus lebih besar!</p>
      </div>
      <div class="daily-rewards">
        <div class="daily-reward-box"><div class="dr-icon">🪙</div><div class="dr-name">+${got.coins}</div><div class="dr-sub">koin</div></div>
        <div class="daily-reward-box"><div class="dr-icon">🎁</div><div class="dr-name">+${got.packs}</div><div class="dr-sub">paket kartu</div></div>
      </div>
      <div class="modal-actions">
        <button class="btn btn-gold" id="open-daily-pack">BUKA PAKET</button>
        <button class="btn btn-navy" data-close>NANTI</button>
      </div>
    </div>`, { onClose: () => renderHome() });
  $('#open-daily-pack', overlay).onclick = () => { overlay._close(); showPackModal(); };
}

/* ---------------- card packs ---------------- */
function showPackModal() {
  if (state.cardPacks <= 0) {
    const overlay = openModal(`
      <div class="modal pack-stage">
        <button class="modal-close" data-close>✕</button>
        <div class="pack-big" style="opacity:.5"><span class="pack-logo">🎴</span><span class="pack-brand">ADA SUPER LEAGUE</span></div>
        <h2 class="modal-title">Belum Ada Paket</h2>
        <p class="modal-sub">Beli paket kartu di Toko atau ambil hadiah harian.</p>
        <div class="modal-actions"><button class="btn btn-gold btn-block" data-close>OK</button></div>
      </div>`);
    return overlay;
  }
  const overlay = openModal(`
    <div class="modal pack-stage">
      <button class="modal-close" data-close>✕</button>
      <div class="pack-big" id="pack-open"><span class="pack-logo">🎴</span><span class="pack-brand">ADA SUPER LEAGUE</span></div>
      <h2 class="modal-title">Paket Kartu</h2>
      <p class="modal-sub">Ketuk paketnya buat buka! Bisa dapat koin, jersey, lapangan, atau boost stat.</p>
      <p class="tiny" style="margin-top:0">Sisa paket: <b>${state.cardPacks}</b></p>
    </div>`);

  let opening = false;
  $('#pack-open', overlay).onclick = () => {
    if (opening) return;
    opening = true;
    audio.play('card');
    const reward = openCardPack();
    const rare = ['jersey', 'court'].includes(reward.type) || (reward.type === 'coins' && reward.amount >= 250);
    $('#pack-open', overlay).classList.add('opened');
    setTimeout(() => {
      overlay._close();
      const typeLabel = { coins: 'KOIN', xp: 'XP', boost: 'BOOST', jersey: 'JERSEY', court: 'LAPANGAN' }[reward.type] || 'HADIAH';
      const ov2 = openModal(`
        <div class="modal pack-stage">
          <h2 class="modal-title">Kamu Dapat...</h2>
          <div class="pack-reward ${rare ? 'rare' : ''}">
            <div class="pr-icon">${reward.icon}</div>
            <div class="pr-name">${esc(reward.name)}</div>
            <div class="pr-type">${typeLabel}${reward.duplicate ? ' • DUPLIKAT' : ''}</div>
          </div>
          ${rare ? '<p class="tiny center">🌟 HADIAH LANGKA! Keren banget!</p>' : '<p class="tiny center">Mantap! Terus main buat hadiah lain.</p>'}
          <div class="modal-actions">
            <button class="btn btn-primary btn-block" data-close>SIMPAN</button>
          </div>
        </div>`, { onClose: () => { updateCoinChips(); renderShop(); renderHome(); } });
      if (rare) { confetti(70); audio.play('trial'); }
      updateCoinChips();
      save();
    }, 520);
  };
  return overlay;
}

/* ---------------- team ---------------- */
function renderTeam() {
  const overall = teamOverall();
  $('#team-summary').innerHTML = `
    <div class="ts-badge">🔥</div>
    <div class="ts-info">
      <div class="ts-name">ADA Sparks</div>
      <div class="ts-sub">${state.players.length} pemain • ${esc(jerseyById(state.equippedJersey).name)}</div>
    </div>
    <div class="ts-overall"><b>${overall}</b><span>TEAM OVR</span></div>`;

  $('#team-list').innerHTML = state.players.map((p, i) => {
    const ovr = Math.round((p.stats.speed + p.stats.shoot + p.stats.dribble + p.stats.defense) / 4);
    const rows = ['speed', 'shoot', 'dribble', 'defense'].map((k) => {
      const v = p.stats[k];
      const cost = upgradeCost(v);
      const maxed = v >= 99;
      return `<div class="stat-row">
        <span class="stat-name">${statLabel(k)}</span>
        <div class="stat-bar"><i class="${v >= 80 ? 'high' : ''}" style="width:${v}%"></i></div>
        <span class="stat-val">${v}</span>
        <button class="stat-up ${maxed ? 'maxed' : ''}" data-up="${i}:${k}" ${maxed ? 'disabled' : ''}>${maxed ? 'MAX' : `+2<small>🪙${cost}</small>`}</button>
      </div>`;
    }).join('');
    return `<div class="player-card">
      <div class="player-head">
        <div class="avatar">${avatarSVG(p)}</div>
        <div class="player-id">
          <div class="player-name">${esc(p.name)} <span style="font-size:9px;color:#8B7B66">#${p.number}</span></div>
          <div class="player-role">${p.role}</div>
        </div>
        <div class="player-ovr"><b>${ovr}</b><span>OVR</span></div>
      </div>
      <div class="stat-rows">${rows}</div>
    </div>`;
  }).join('');

  $$('#team-list [data-up]').forEach((btn) => {
    btn.onclick = () => {
      const [pi, stat] = btn.dataset.up.split(':');
      const p = state.players[+pi];
      const r = upgradeStat(+pi, stat);
      if (r.ok) {
        audio.play('upgrade');
        toast(`${p.name}: ${statLabel(stat)} +2! 💪`);
        renderTeam(); updateCoinChips();
      } else if (r.reason === 'coins') {
        audio.play('pop');
        toast(`Koin kurang. Butuh 🪙${r.cost}. Menang terus buat kumpulin!`);
      } else if (r.reason === 'max') {
        toast('Stat ini sudah maksimal! ⭐');
      }
    };
  });
}

/* ---------------- leaderboard ---------------- */
let lbTab = 'global';
let lbAge = '8-11';

function renderLeaderboard() {
  $$('#lb-tabs button').forEach((b) => b.classList.toggle('active', b.dataset.lb === lbTab));
  $('#lb-age').classList.toggle('hidden', lbTab !== 'age');
  $$('#lb-age button').forEach((b) => b.classList.toggle('active', b.dataset.age === lbAge));

  const list = leaderboard(lbTab, lbAge);
  const rank = playerRank(lbTab, lbAge);
  const me = list.find((e) => e.you);
  $('#lb-me').innerHTML = `
    <div class="rank">#${rank || '-'}</div>
    <div class="info"><b>${esc(state.profile?.name || 'Kamu')}</b><span>${lbTab === 'school' ? esc(state.profile?.school || '') : lbTab === 'age' ? `Umur ${lbAge} tahun` : 'Peringkat Global'}</span></div>
    <div class="xp">${me ? me.xp : state.xp} XP</div>`;

  $('#lb-list').innerHTML = list.map((e) => {
    const medal = e.rank === 1 ? '🥇' : e.rank === 2 ? '🥈' : e.rank === 3 ? '🥉' : e.rank;
    return `<div class="lb-row ${e.you ? 'you' : ''}">
      <div class="lb-rank ${e.rank <= 3 ? 'top' : ''}">${medal}</div>
      <div class="lb-av" style="background:${colorFor(e.name)}">${esc(e.name.slice(0, 1).toUpperCase())}</div>
      <div class="lb-name"><b>${esc(e.name)}${e.you ? ' (KAMU)' : ''}</b><span>${esc(e.school)} • ${e.age} th</span></div>
      <div class="lb-xp">${e.xp}<small>XP</small></div>
    </div>`;
  }).join('');
}

/* ---------------- shop ---------------- */
let shopTab = 'packs';

function renderShop() {
  $$('#shop-tabs button').forEach((b) => b.classList.toggle('active', b.dataset.shop === shopTab));
  const body = $('#shop-body');

  if (shopTab === 'packs') {
    body.innerHTML = `
      <div class="pack-hero">
        <div class="pack-emoji">🎁</div>
        <h2>Paket Kartu ADA</h2>
        <p>Koin, jersey, lapangan, atau boost stat buat pemainmu. Seru!</p>
        <div class="pack-count">🎴 ${state.cardPacks} paket dimiliki</div>
        <div class="pack-actions">
          <button class="btn btn-gold" id="buy-pack">BELI 🪙250</button>
          <button class="btn btn-primary" id="open-pack" ${state.cardPacks > 0 ? '' : 'disabled'}>BUKA PAKET</button>
        </div>
      </div>
      <div class="rarity-note">🌟 <b>Hadiah langka:</b> ADA Orange Jersey, Navy Storm, Park Court, dan ADA Arena! Duplikat otomatis jadi koin.</div>
      <div class="rarity-note">💡 <b>Tips:</b> Ambil hadiah harian tiap hari untuk paket kartu gratis.</div>`;
    $('#buy-pack').onclick = () => {
      if (state.coins < 250) { toast('Koin belum cukup. Butuh 🪙250.'); audio.play('pop'); return; }
      state.coins -= 250; state.cardPacks += 1; save();
      audio.play('coin'); toast('Paket kartu dibeli! 🎁');
      renderShop(); updateCoinChips(); renderHome();
    };
    $('#open-pack').onclick = () => { audio.play('click'); showPackModal(); };
  }

  if (shopTab === 'jerseys') {
    body.innerHTML = `<div class="shop-grid">${JERSEYS.map((j) => {
      const owned = state.unlockedJerseys.includes(j.id);
      const equipped = state.equippedJersey === j.id;
      return `<div class="shop-card ${owned ? 'owned' : ''} ${equipped ? 'equipped' : ''}">
        <div class="shop-preview jersey">${jerseySVG(j)}</div>
        <div class="shop-tag">${j.tag}</div>
        <div class="shop-name">${esc(j.name)}</div>
        <div class="shop-price">${owned ? '✅ Dimiliki' : `🪙 ${j.price}`}</div>
        <button class="btn ${equipped ? 'btn-navy' : owned ? 'btn-gold' : 'btn-primary'}" data-jersey="${j.id}" ${equipped ? 'disabled' : ''}>${equipped ? 'DIPAKAI' : owned ? 'PAKAI' : 'BELI'}</button>
      </div>`;
    }).join('')}</div>`;
    $$('[data-jersey]').forEach((btn) => {
      btn.onclick = () => {
        const j = jerseyById(btn.dataset.jersey);
        const r = buyJersey(j.id);
        if (r.ok) {
          audio.play(r.bought ? 'coin' : 'click');
          toast(r.bought ? `Jersey ${j.name} terbuka! 👕` : `Pakai ${j.name}!`);
          renderShop(); renderTeam(); updateCoinChips(); renderHome();
        } else if (r.reason === 'coins') {
          audio.play('pop'); toast(`Koin belum cukup. Butuh 🪙${j.price}.`);
        }
      };
    });
  }

  if (shopTab === 'courts') {
    body.innerHTML = `<div class="shop-grid">${COURTS.map((c) => {
      const owned = state.unlockedCourts.includes(c.id);
      const equipped = state.equippedCourt === c.id;
      return `<div class="shop-card ${owned ? 'owned' : ''} ${equipped ? 'equipped' : ''}">
        <div class="shop-preview court">${courtPreviewHTML(c)}</div>
        <div class="shop-tag">${c.tag}</div>
        <div class="shop-name">${esc(c.name)}</div>
        <div class="shop-price">${owned ? '✅ Dimiliki' : `🪙 ${c.price}`}</div>
        <button class="btn ${equipped ? 'btn-navy' : owned ? 'btn-gold' : 'btn-primary'}" data-court="${c.id}" ${equipped ? 'disabled' : ''}>${equipped ? 'DIPAKAI' : owned ? 'PAKAI' : 'BELI'}</button>
      </div>`;
    }).join('')}</div>`;
    $$('[data-court]').forEach((btn) => {
      btn.onclick = () => {
        const c = courtById(btn.dataset.court);
        const r = buyCourt(c.id);
        if (r.ok) {
          audio.play(r.bought ? 'coin' : 'click');
          toast(r.bought ? `Lapangan ${c.name} terbuka! 🏟️` : `Main di ${c.name}!`);
          renderShop(); updateCoinChips(); renderHome();
        } else if (r.reason === 'coins') {
          audio.play('pop'); toast(`Koin belum cukup. Butuh 🪙${c.price}.`);
        }
      };
    });
  }
}

/* ---------------- pause ---------------- */
function showPauseModal() {
  if (!game) return;
  const overlay = openModal(`
    <div class="modal pause-modal">
      <div class="pause-emoji">⏸️</div>
      <h2>Jeda Dulu</h2>
      <p class="modal-sub">Skor sementara ${$('#hud-score-you').textContent} - ${$('#hud-score-them').textContent}. Semangat!</p>
      <button class="btn btn-primary btn-block" id="resume-game">LANJUT MAIN</button>
      <button class="btn btn-navy btn-block" id="quit-game">KELUAR PERTANDINGAN</button>
    </div>`, { dismissible: false });
  $('#resume-game', overlay).onclick = () => {
    audio.play('click');
    overlay._close();
    if (game) game.resume();
  };
  $('#quit-game', overlay).onclick = () => {
    audio.play('click');
    overlay._close();
    cleanupGame();
    activeMatch = null;
    showScreen('league');
    toast('Pertandingan dibatalkan. Ayo coba lagi!');
  };
}

/* ---------------- onboarding ---------------- */
function initOnboard() {
  $('#onboard-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const name = $('#in-name').value.trim();
    const age = Number($('#in-age').value);
    const school = $('#in-school').value.trim();
    let wa = $('#in-wa').value.replace(/\D/g, '');
    if (wa.startsWith('0')) wa = `62${wa.slice(1)}`;
    else if (wa.startsWith('8')) wa = `62${wa}`;
    const err = $('#form-error');
    if (name.length < 2) { err.textContent = 'Isi nama panggilan dulu, ya!'; return; }
    if (!age || age < 8 || age > 15) { err.textContent = 'Pilih umur antara 8 sampai 15 tahun.'; return; }
    if (school.length < 2) { err.textContent = 'Isi nama sekolahmu, ya!'; return; }
    if (wa.length < 9 || wa.length > 15) { err.textContent = 'Nomor WhatsApp orang tua belum benar. Contoh: 0812 3456 7890.'; return; }
    err.textContent = '';
    ensureProfile({ name, age, school, wa });
    state.settings.sound = true;
    save();
    audio.init();
    audio.startMusic();
    audio.play('whistle');
    showScreen('home');
    toast(`Selamat datang, ${name}! 🏀`);
    setTimeout(() => showDailyModal(), 650);
  });
}

/* ---------------- global bindings ---------------- */
function initNav() {
  $$('#bottom-nav button').forEach((btn) => {
    btn.addEventListener('click', () => {
      audio.init();
      audio.play('click');
      showScreen(btn.dataset.nav);
    });
  });
}

function initSound() {
  const btn = $('#btn-sound');
  const paint = () => { btn.textContent = state.settings.sound ? '🔊' : '🔇'; btn.setAttribute('aria-label', state.settings.sound ? 'Matikan suara' : 'Nyalakan suara'); };
  paint();
  btn.addEventListener('click', () => {
    state.settings.sound = !state.settings.sound;
    save();
    audio.setEnabled(state.settings.sound);
    if (state.settings.sound) { audio.init(); audio.startMusic(); audio.play('click'); }
    else audio.stopMusic();
    paint();
    toast(state.settings.sound ? 'Suara aktif 🔊' : 'Suara dimatikan 🔇');
  });
}

function initGameControls() {
  const joy = $('#joystick');
  const knob = $('#joy-knob');
  let joyId = null;

  const updateJoy = (e) => {
    if (!game) return;
    const r = joy.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    let dx = e.clientX - cx;
    let dy = e.clientY - cy;
    const max = r.width * 0.33;
    const d = Math.hypot(dx, dy);
    if (d > max) { dx = (dx / d) * max; dy = (dy / d) * max; }
    knob.style.transform = `translate(${dx}px, ${dy}px)`;
    game.setMove(dx / max, dy / max);
  };
  const resetJoy = () => {
    joyId = null;
    knob.style.transform = 'translate(0px, 0px)';
    if (game) game.setMove(0, 0);
  };

  joy.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    if (!game) return;
    joyId = e.pointerId;
    joy.setPointerCapture?.(e.pointerId);
    updateJoy(e);
  });
  joy.addEventListener('pointermove', (e) => {
    if (joyId !== e.pointerId) return;
    e.preventDefault();
    updateJoy(e);
  });
  joy.addEventListener('pointerup', resetJoy);
  joy.addEventListener('pointercancel', resetJoy);
  joy.addEventListener('lostpointercapture', resetJoy);
  window.addEventListener('blur', resetJoy);

  const bindAction = (id, name) => {
    const el = $(id);
    el.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      el.classList.add('pressed');
      audio.init();
      if (game) game.action(name);
    });
    const up = () => el.classList.remove('pressed');
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
    el.addEventListener('pointerleave', up);
  };
  bindAction('#btn-pass', 'pass');
  bindAction('#btn-shoot', 'shoot');
  bindAction('#btn-steal', 'steal');

  $('#hud-pause').addEventListener('click', () => {
    if (!game) return;
    audio.play('click');
    game.pause();
    showPauseModal();
  });
}

function initDelegates() {
  $('#lb-tabs').addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    lbTab = b.dataset.lb; audio.play('click'); renderLeaderboard();
  });
  $('#lb-age').addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    lbAge = b.dataset.age; audio.play('click'); renderLeaderboard();
  });
  $('#shop-tabs').addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    shopTab = b.dataset.shop; audio.play('click'); renderShop();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    const root = $('#modal-root');
    const last = root.lastElementChild;
    if (last && last._close) last._close();
  });
}

function initAudioUnlock() {
  const unlock = () => {
    audio.init();
    if (state.settings.sound) audio.startMusic();
    document.removeEventListener('pointerdown', unlock);
  };
  document.addEventListener('pointerdown', unlock);
}

export function initUI() {
  initOnboard();
  initNav();
  initSound();
  initGameControls();
  initDelegates();
  initAudioUnlock();
  audio.setEnabled(state.settings.sound);
  if (state.profile) {
    showScreen('home');
  } else {
    showScreen('onboard');
  }
}
