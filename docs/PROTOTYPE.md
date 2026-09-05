# Local playable prototype

Updated 2026-09-05. This is the first 2-versus-2 slice of the [larger scope](SCOPE.md).

## Run locally

Use Node 22.12 or newer. From the repository directory:

```sh
npm ci
npm run dev
```

Open the local URL printed by Vite. The default address is `http://127.0.0.1:5173/`. The development server binds only to the local machine. If that port is occupied, stop the conflicting development server or pass another port, for example `npm run dev -- --port 5174`.

Other commands:

```sh
npm test
npm run typecheck
npm run build
npm run preview
```

The production build is static. It includes locally bundled fonts and license notices, and does not need a backend, credentials, or remote AI service. Production source maps are disabled.

## What can be played

- A full single-player match, with Pip and Miso against Moss and Grub.
- Seeded, illustrated 2D terrain rendered through Three.js, including caves and a central channel.
- Inching, forward jumps, backward high jumps, knockback, fall damage, and water elimination.
- Seed Rocket, Pebble Popper, Spore Shove, and Leaf Bridge; finite squad stock for the last two.
- Real collision-changing craters and destructible placed bridges.
- A fixed computer policy that searches legal rocket/grenade shots, considers close shoves, penalizes friendly damage, and makes small aiming errors. It can retreat when supported ground is available.
- 45-second action turns, 5-second retreat, stable resolution, living-character rotation, victory/draw, and rematch.
- Wind changes by round; water rises after round 10 to end long stalemates.
- Camera pan, zoom, recenter, contextual captions, original procedural sound, mute, reduced shake, and pause.

## Controls

| Action | Control |
| --- | --- |
| Move | A / D or left / right arrows |
| Forward jump | Space |
| Backward high jump | Shift + Space |
| Aim | Pointer, or up / down arrows |
| Fire | Hold F or the left mouse button, then release; a quick tap uses the previous power |
| Choose item | 1–4 or the item tray |
| Bridge | Select 4, point to clear space nearby, release to place; red preview means invalid |
| Pan / zoom | Right-drag / mouse wheel |
| Recenter / overview | R / Shift + R |
| Pause / resume | Escape |
| Skip | The end-turn button beside the items |

The optional field guide is available on the start screen and through the question-mark button. Desktop keyboard/mouse is the supported prototype input. A narrow embedded preview can be enlarged, or the local URL can be opened in a full browser window; zooming helps inspect the worms.

## Validation completed

- TypeScript compilation and production bundling.
- 18 simulation tests: seeded terrain, collision, destructive edits, movement, jumping, falls, drowning, fast projectiles, grenade fuses, shared shot predictions, shove line of sight, bridge transactions, friendly fire, timers, draws, rotation, deterministic commands, and three complete seeded AI matches.
- A real local-browser match from start through defeat/results, followed by rematch. The recorded run on seed 934 ended in round 5 with nine shots and nine craters; this is a smoke test, not a balance benchmark.
- Browser checks for keyboard jump/fire, weapon selection without accidental firing, bridge rejection/placement, pause/resume, and computer turns.

The current prototype was checked in the available in-app browser. This does not establish the full Safari/Firefox/Chrome/Edge release matrix, low-end GPU performance, or a validated human difficulty target.

## Deliberate prototype limits

- One theme, four items, and 2v2 teams. The larger ten-item/4v4 scope remains planned.
- Original drawn texture art and procedural animation are functional prototype assets, not the final authored sprite/voice collection.
- Dialogue is captioned; recorded/synthesized character speech and music production are pending.
- The AI focuses on shot search and short retreats. General terrain-aware path planning, useful bridge planning, and a worker implementation remain later work. Search is time-sliced on the main thread in this slice.
- A grenade uses a fixed three-second fuse. The prototype uses tuned radial blast damage without terrain occlusion. These are explicit simplifications from the design proposals; player and computer share them.
- Projectile collision uses sub-pixel swept samples of at most 0.65 world units, verified against thin-wall fixtures. An analytic time-of-impact solver remains an option for more demanding future geometry.
- Only sound/motion preferences persist locally. Match suspend/resume, remappable controls, full practice drills, and touch/gamepad support remain later work.
- No online play, public deployment, account system, tracking SDK, or gameplay network requests are configured.

## Optional browser automation interface

Where the browser supports imperative WebMCP, the same visible match actions are exposed through `read_match`, `start_skirmish`, `fire_weapon`, `end_turn`, and `set_match_paused`. These preserve the normal turn, ammo, and placement rules. A new match replaces the current local game. Browsers without the capability retain the complete keyboard/mouse experience.

## Source map

| File | Responsibility |
| --- | --- |
| `src/game/terrain.ts` | Terrain grid, generation, carving, collision queries |
| `src/game/simulation.ts` | Movement, attacks, damage, turns, and bounded AI shot search |
| `src/render/art.ts` | Original procedural 2D texture art |
| `src/render/scene.ts` | Three.js presentation, camera, effects, and labels |
| `src/main.ts` | Interface, input, fixed-step loop, AI scheduling |
| `src/audio.ts` | Original procedural sound |
| `src/webmcp.ts` | Optional browser tool registration |
| `tests/simulation.test.ts` | Simulation and full-match regression tests |

Third-party license notices ship in `public/licenses`; the runtime asset record is in `assets/manifests/prototype.json`.
