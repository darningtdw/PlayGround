# PlayGround

<!-- omgithub:readme:start -->
## 🚀 Build, play, and remix with OMGithub

**Created using [OMGithub.com](https://go.ondev.store/).**

[![OMGithub](https://img.shields.io/badge/OMGithub-Open%20project-orange?style=for-the-badge)](https://go.ondev.store/darningtdw/PlayGround)
[![GitHub](https://img.shields.io/badge/GitHub-Source-181717?logo=github&style=for-the-badge)](https://github.com/darningtdw/PlayGround)

- 🎮 [Open the project](https://go.ondev.store/darningtdw/PlayGround).
- ✨ [Remix this project](https://go.ondev.store/darningtdw/PlayGround?remix=1).
- 💻 [Explore the source](https://github.com/darningtdw/PlayGround).
- 🛠️ [Check build runs](https://github.com/darningtdw/PlayGround/actions).
- 🐛 [Report an issue](https://github.com/darningtdw/PlayGround/issues).
- 👤 [Explore the creator's projects](https://go.ondev.store/darningtdw).
- 🌍 [Create with OMGithub](https://go.ondev.store/).
<!-- omgithub:readme:end -->

## ADA Super League — Basketball

A mobile-first, 5v5 arcade basketball game for ADA Basketball Academy. Everything runs in the browser with plain HTML, CSS, and ES modules — no build step, no external art or audio files.

### Play

```bash
./start.sh
# open http://localhost:3000
```

The game is designed for portrait phones (390 × 844 is the reference viewport), but it also scales to desktop.

### Features

- 2-minute 5v5 matches with joystick movement and PASS / SHOOT / STEAL buttons. Swipe up on the court to shoot, swipe left/right to pass.
- Five leagues (Bronze → Silver → Gold → Platinum → ADA Champion), four funny teams per league, and friendly rematches.
- Player upgrades (Speed, Shoot, Dribble, Defense), jerseys, and courts bought with coins.
- Local leaderboard with Global, School, and Age Group (8–11 / 12–15) tabs.
- Daily reward (coins + card pack) and a card-pack shop with duplicates converted to coins.
- Champion flow with a 1× free-trial WhatsApp claim, plus a “Pamerin Piala Kamu!” share button after every win.
- Progress is stored in `localStorage` under `ada_super_league_v1`.

### Configuration

- Academy WhatsApp number: `ACADEMY_WA` in `js/data.js`. The checked-in value (`6281234567890`) is a demo placeholder — replace it with the real academy number before launch.
- All artwork is drawn with Canvas, CSS, or inline SVG. All sound effects and music are synthesized with WebAudio.

### Project layout

```
index.html        app shell and screens
css/style.css     cartoon mobile UI
js/main.js        entry point
js/ui.js          screens, modals, match flow, rewards
js/state.js       localStorage state, progression, leaderboard
js/data.js        leagues, teams, jerseys, courts, card pool
js/game.js        canvas 5v5 engine, AI, physics, rendering
js/audio.js       synthesized SFX and music
screenshots/      verification screenshots (JPEG)
```
