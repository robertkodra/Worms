# Local playable prototype 02

Updated 2026-09-05. The owner accepted the first 2D prototype and requested more personality, equipment, map variety and purposeful computer movement. This is the current implemented slice of the [larger scope](SCOPE.md).

## Run locally

Use Node 22.12 or newer. From the repository directory:

```sh
npm ci
npm run dev
```

Open the local URL printed by Vite, normally `http://127.0.0.1:5173/`. The development server binds only to the local machine. For a different port, use `npm run dev -- --port 5174`.

```sh
npm test
npm run typecheck
npm run build
npm run preview
```

The production build is static. Fonts, licenses, and spoken quips are bundled. It needs no backend, credentials, online AI or speech service. Production source maps are disabled.

## Recording handoff and small follow-up

The next voice pack is ready in [the recording script](voice/README.md), with 30 original lines, three possible performance styles and CSV/JSON exports. Voice production is parked while the owner generates clips. New wording will replace prototype captions and recordings together when the finished pack is integrated.

The current game also shows visible countdowns beside grenades, cluster parents and TNT. Eliminated worms no longer deliver outgoing quips; turn handover and results still complete normally.

## What changed

- **12 weapons/tools:** Seed Rocket, Pebble Popper, Bramble Blaster shotgun, Needle Rifle, Conker Cluster, Root TNT, Acorn Mortar, Seed Rain airstrike, Spore Shove, Leaf Bridge, Blink Bulb teleport, and Compost Cure.
- **An arsenal that can grow:** four quick slots plus a category grid, search, ammo counts, descriptions and handling details. Choosing an item outside the quick slots replaces slot4. Browsing pauses the single-player turn. The registry drives the menu and inventory, so adding items does not require expanding the bottom bar.
- **Four seeded layouts:** Broken Archipelago, Rolling Ridgeline, Sunken Valley and Garden Mesas. Surface elevation, island gaps, cave chains and spawn positions vary. Fresh page loads choose a random seed. New battlefield/shuffle deliberately chooses a different layout family; replaying a seed recreates its terrain.
- **Purposeful AI movement:** short walking/jumping routes use the same guarded inputs and movement physics as live play. The opponent values useful range, higher ground, space from allies and distance from ledges. It aims after moving, considers the new direct guns, mortar, cluster, airstrike and healing, and replans retreat after terrain changes.
- **Personality:** original wet/squeaky inching sounds, landing sounds, distinct gunshots and utility effects. Thirty spoken quips react to hits, misses, friendly fire, skipped turns, healing and utility use. Outcomes take priority over new-turn greetings. Separate voice toggle/volume, a voice test button, and captions accompany the main mute control.

The 2v2 loop remains: 45 seconds to move and attack, 5 seconds to retreat, then physics resolves. Ground deformation, jumping/backflips, falls, knockback, water elimination, wind, living-worm rotation, results and rematch remain supported. Water rises after round10.

## Equipment rules

| Item            | Rule                                                                                    | Squad stock |
| --------------- | --------------------------------------------------------------------------------------- | ----------- |
| Seed Rocket     | Wind-affected, impact blast; max56 damage                                               | Unlimited   |
| Pebble Popper   | Bounces, 3-second fuse; max62                                                           | Unlimited   |
| Bramble Blaster | Five short-range pellets, damage falls with distance, first collision stops each pellet | 4           |
| Needle Rifle    | Straight first-hit trace, no wind, 42 damage; soil blocks it                            | 3           |
| Conker Cluster  | 3-second parent fuse, then five timed bouncing fragments                                | 2           |
| Root TNT        | Drops at the worm; 4-second fuse, broad blast, max85                                    | 2           |
| Acorn Mortar    | Slower heavy ballistic shell, no wind, max72                                            | 3           |
| Seed Rain       | Five simultaneous shells above a selected column; roofs intercept shells                | 1           |
| Spore Shove     | Close-range line-of-sight hit, 15 damage and strong knockback                           | 3           |
| Leaf Bridge     | Destructible86×7 platform in nearby clear space                                         | 2           |
| Blink Bulb      | Clear supported landing within550px; rejects water, soil and occupied landings          | 2           |
| Compost Cure    | Restore up to35HP, capped100; full-health use is rejected                               | 1           |

Every successful use consumes the turn's one action. Invalid placements, depleted items and invalid healing do not spend ammo or the turn. Friendly fire applies. All explosive damage is radial and can pass through nearby thin soil; a roof intercepts projectiles but is not guaranteed blast protection. Cluster fragments and all five airstrike shells must resolve before the turn can advance.

## Controls

| Action                                | Control                                                                         |
| ------------------------------------- | ------------------------------------------------------------------------------- |
| Move                                  | A / D or left / right arrows                                                    |
| Forward jump / backflip               | Space / Shift + Space                                                           |
| Aim                                   | Pointer, or up / down arrows                                                    |
| Lob a projectile                      | Hold F or left mouse; release to fire. A quick tap uses previous power          |
| Direct guns / self tools              | Tap F or click; power is hidden because it does not apply                       |
| Choose quick item                     | 1–4 or bottom bar                                                               |
| Browse arsenal                        | Q or Arsenal button; Escape closes it                                           |
| Place a bridge, teleport or airstrike | Select the item, aim at a point, click or tap F; preview and hint show validity |
| Pan / zoom                            | Right-drag / mouse wheel                                                        |
| Recenter / overview                   | R / Shift + R                                                                   |
| Pause / resume                        | Escape                                                                          |
| Audio settings                        | Pause menu; Test voice previews a bundled quip                                  |
| Skip                                  | End-turn button beside the arsenal                                              |
| Different map / same map              | New battlefield / Restart or Rematch                                            |

Desktop keyboard/mouse is the supported prototype input. A narrow embedded preview can be enlarged or opened in a full browser. Zooming helps inspect the worms.

## Voice asset workflow

Thirty original lines live in `src/banter.ts`. `scripts/render_voices.py` uses the optional authoring tool CMU Flite2.2 with its kal voice to render mono PCM WAVs, adjust F0/timing, normalize gain and emit clean headers. Run `python3 scripts/render_voices.py` only when authoring new lines; playing/building the game requires no Flite installation. Per-file text, durations and hashes are recorded in `public/audio/voices/manifest.json`. The clips total about0.87MB and load on demand from the game's own origin.

Flite's collection and kal voice carry permissive terms. The original engine/data notices are preserved in `public/licenses/flite.txt`; the project changes synthesis settings and output gain, not the engine. The distribution approach follows the [Flite2.2 collection terms](https://github.com/festvox/flite/blob/v2.2/COPYING) and [kal source notice](https://github.com/festvox/flite/blob/v2.2/lang/cmu_us_kal/cmu_us_kal.c). No recordings from Worms or proprietary operating-system voices are shipped.

If a bundled clip cannot load, the game attempts an available device-local English voice, then a short synthesized chatter sound; captions always remain. The fallback uses the browser's [SpeechSynthesis API](https://developer.mozilla.org/en-US/docs/Web/API/SpeechSynthesis). Mute, pause, restarting and opening the arsenal cancel queued/in-flight voice playback. No speech text is sent to a remote synthesis service.

## Validation

- 43 automated tests cover the original simulation, 64 generated seeds and safe spawns, 12-item inventory, direct fire against thin walls and friendlies, shotgun spread/range, cluster lifecycle, TNT fuse/escape, airstrike/roof interception, shared projectile predictions, atomic teleport/healing, AI equipment scoring, safe navigation with preview/execution agreement, outcome classification, movement/landing sounds and audio cancellation.
- All30 speech files are checked against the dialogue bank, PCM header structure, non-silence and peak limits.
- Three full seeded computer-policy matches in the simulation finish with finite valid state.
- In-app browser checks exercised arsenal opening, category filtering, search/equip without firing, paused menu time, voice decoding/playback, the five-shell airstrike, computer movement/attack and outcome captions.
- A complete current-browser match on seed9 reached defeat/results in round2 after four shots. The scripted smoke deliberately used two self-placed TNT charges, so this is lifecycle coverage, not a balance benchmark. Space activated the focused rematch button and restored seed9, full health and stock; New battlefield selected a different layout family.
- TypeScript and production build pass. Public source/output is scanned before pushing; generated WAV headers contain no authoring-machine metadata.

These checks do not establish the complete Safari/Firefox/Chrome/Edge release matrix, low-end GPU performance, or a calibrated human difficulty target.

## Current limits and next work

- One visual theme and 2v2 teams. Four map families are implemented; 4v4, additional art themes, mines, pickups and larger arsenal content remain later work.
- Original texture art, procedural animation and retro synthetic voices are prototype assets. More expressive animation, better voice performances and music remain production work.
- AI routes are short local candidates, not global pathfinding. The bot does not yet plan bridges, teleports or TNT traps. Cluster scoring values the parent impact rather than a complete tactical model of every fragment. Search is time-sliced on the main thread; a worker, deeper inventory strategy and paired-seed balance tests remain later work.
- Explosive damage uses a shared radial model without terrain occlusion. Shotgun/rifle traces stop at their first collision; bullets do not inherit blast damage rules.
- Settings persist locally; match saves, remappable controls, practice drills and touch/gamepad support remain planned.
- No online play, public deployment, accounts or tracking SDK are configured.

## Source map

| File                       | Responsibility                                                                |
| -------------------------- | ----------------------------------------------------------------------------- |
| `src/game/weapons.ts`      | Equipment registry, ammo, categories and ballistic profiles                   |
| `src/game/terrain.ts`      | Occupancy grid, seeded layouts, carving and collision                         |
| `src/game/simulation.ts`   | Movement, attacks, simultaneous projectiles, damage, outcomes and shot search |
| `src/game/ai.ts`           | Safe navigation previews and shared route execution                           |
| `src/render/art.ts`        | Original 2D texture/equipment art                                             |
| `src/render/scene.ts`      | Three.js camera, projectiles, tracers, particles and labels                   |
| `src/main.ts`              | Arsenal, controls, settings, fixed-step loop and AI scheduling                |
| `src/banter.ts`            | Original reaction bank and event priority                                     |
| `src/audio.ts`             | Effects, speech loading/playback, cancellation and mix                        |
| `scripts/render_voices.py` | Optional offline voice asset generation                                       |
| `src/webmcp.ts`            | Browser tool registration                                                     |
| `tests/`                   | Simulation, expansion and audio regressions                                   |

Optional imperative WebMCP exposes `read_match`, `start_skirmish`, `fire_weapon`, `end_turn` and `set_match_paused`. These use normal action/ammo/placement rules; starting replaces the local match. Browsers without WebMCP keep the complete keyboard/mouse game.
