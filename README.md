# Orbit Rush

An arcade drive-and-collect game that runs entirely in the browser. Built with **React**, React Three Fiber, Three.js, postprocessing (bloom, vignette), Zustand and Vite. No 3D asset files, no audio files, no backend: every model is procedural geometry, every sound is synthesized with the Web Audio API, and all progress lives in `localStorage`.

## Play

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # production bundle in dist/
```

| Action | Keys (arrows scheme) | Keys (WASD scheme) |
| --- | --- | --- |
| Drive / steer | Arrow keys | W A S D |
| Fire Bolt (hold to lock on) | F | J |
| Shockwave | E | K |
| Overdrive | Shift | L |
| Jump | Space | Space |
| Restart run | R | R |
| Pause / exit | Esc | Esc |

Touch devices get an on-screen joystick and buttons automatically.

## How a run works

- **Sparks** are the heart of your score. Gold Sparks are worth ten. Every 10 Sparks grant 3 Bolts.
- **Beacons** (24 towers on a spiral around the start) add a permanent multiplier that grows with the Beacon number. Lighting one drops a Supply Crate and opens a **Relay Lane**: five gates to pass within 14 seconds for a Comet Core and a Hull/Shield upgrade.
- **Drones** chase and shoot you. From Stage 2 a **Titan** can appear; destroying it drops a Comet Core and a spare Shockwave.
- The world shifts through five **stages** (new palette, more Drones) as your Spark total crosses thresholds.
- A hidden **hype** meter rises with speed, drifting and air time, and decays constantly. It drives the Velocity factor.
- The run ends when the clock hits zero or your Hull is gone.

### Pulse Score

```
raw      = Sparks + 3 × Drones + 12 × Titans + 5 × Beacons
weighted = 0.4 × Velocity + 0.3 × Control + 0.2 × Flair + 0.1 × Reach   (each 0..1)
score    = round(raw × multiplier × (1 + weighted))
```

Each run's score is paid into XP; levels follow `150 × level^1.45` and ranks are title bands over levels.

## Project layout

```
src/
  config/game.ts    every tunable number + the LEX vocabulary (rename anything here)
  game/engine.ts    framework-free simulation: player, drones, pickups, beacons, scoring
  game/Scene.tsx    React Three Fiber race renderer (cameras, lights, loop)
  game/Showcase.tsx turntable scene behind the menu / garage / pilot screens
  game/render/      car model, lit grid floor + sky, pickups, drones, beacons, effects, post-processing
  game/audio.ts     synthesized sound bank + generative music
  game/input.ts     keyboard + touch input
  store/game.ts     Zustand store (profile, settings, results, local leaderboard)
  ui/               screens and modals
```
