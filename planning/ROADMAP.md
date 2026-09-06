# Delivery plan

Status: Skirmish 04 adds mixed-team surface/cave spawns and validated cave entrances. Skirmish 03 implements the 4v4 rules, background shot planner, three scenery themes, practice, local names, rebinding and exact turn-start save/resume. See [the release record](../docs/RELEASE.md) for current measured evidence and launch gates. P0 is complete; P1–P5 have playable implementations with remaining human-feel, final-audio and browser/performance acceptance checks. P6 has static configuration and CI but no hosted deployment.

## Prototype 02 — Accepted playtest expansion

The owner liked the initial 2D style and requested more sounds, funny outcome reactions, more weapons, varied maps, active AI, and an arsenal that can grow toward 40 items. This iteration implements 12 items, four seeded terrain layouts, short verified movement/jump routes, a searchable category-based equipment menu, 30 bundled original spoken quips, and richer effects. See the current prototype guide for validation and explicit limits. This advances parts of P3–P5; it does not close their 4v4, worker, balance or browser-matrix gates.

## P0 — Scope and repository

Deliver the concept, game design, architecture, asset inventory, hosting recommendation, public repository guardrails, and a visual study. Record the fully 2D direction and single fixed computer difficulty. Review repository content before publication.

Exit: a concrete scope the project owner can review. Completed; the accepted direction is now being tested in the first local prototype.

## P1 — Prove movement and destruction

Dependencies: scope review.

- Scaffold TypeScript, Vite, Three.js, a small accessible DOM interface, and local development/build commands.
- Create the headless 60 Hz simulation and an orthographic 2D renderer.
- Draw one original character with idle, inching, jump, airborne, and landing states.
- Implement a mutable terrain mask, playable slopes, caves, collision, and a destructible terrain view.
- Implement a launcher and bouncing timed explosive, wind, angle/charge input, and a follow camera.
- Establish tests for projectile tunneling, terrain edge collision, overlapping blasts, and stale render/collision masks.

Exit: in a local playground, movement is responsive, both weapon types create real craters, and a character can traverse an opening made by a shot. Record frame cost during repeated destruction. Review the feel visually before adding content.

## P2 — First playable match

Dependencies: P1 movement/terrain gate.

- Two characters per team on one generated map theme.
- Four items: Seed Rocket (launcher), Pebble Popper (timed explosive), Spore Shove (close-range knockback), and Leaf Bridge (placed traversal platform).
- Turns, timer, retreat, team inventory, health, death, water, victory/draw, and rematch.
- A first fair AI that chooses among legal shots and simple reachable positions; an explicit safe fallback.
- Keyboard/mouse controls, HUD, pause, muted-audio usability, and a compact instructions panel.
- Minimal original effects and contextual subtitle reactions.

Exit: a player completes a 2-versus-2 game from the title screen through results and rematch without developer intervention. The computer takes legal actions and cannot stall the match. The game is recognizable as the intended experience even with limited assets.

This is the first game to try together. Do not mistake a terrain demo or trailer-like animation for this gate.

## P3 — Tactical depth and strong opponent

Dependencies: P2 complete loop and initial playtest feedback.

- Expand to four characters per team and ten distinct items.
- Add item limits, turn availability, mines/crates if specified by the final item design, and rising-water sudden death.
- Improve AI with reachable-position candidates, bounded projectile rollouts, self/friendly-damage scoring, inventory value, and retreat planning.
- Use a worker with progress reporting, cancellation, and a deterministic baseline fallback.
- Add seed validation for spawns, reasonable cover, and playable terrain. Revalidate terrain-dependent paths after explosions.
- Build tactical scenario fixtures and a paired-seed baseline-bot comparison; publish aggregate results without player identifiers.

Exit: the opponent solves obvious tactical opportunities, poses a credible challenge in human tests, and neither cheats nor repeatedly loses turns to pathing. Check game lengths across at least 20 complete development matches; adjust timer, damage, and sudden death as a single fixed ruleset.

## P4 — Original art, personality, and sound

Dependencies: accepted art study and P2 animation/terrain interfaces. Can run alongside P3 once formats are stable.

- Produce the final 2D character art, reusable expression/accessory layers, and animation set.
- Complete one full environment before expanding to the other two themes.
- Create weapon/UI atlases, terrain edges, particles, explosions, damage numbers, and victory presentation.
- Write and implement the event-driven dialogue bank, cooldowns, subtitles, and voice priority rules.
- Produce or source authorized original audio through an identified workflow; normalize mix and verify browser decoding.
- Package source assets and runtime derivatives separately; record origin, allowed use, and attribution.

Exit: assets are stylistically consistent at gameplay scale, readability survives maximum action, repeated sounds/lines are restrained, and all shipped media has a reviewed provenance entry. Generated concept art alone does not close this milestone.

## P5 — Browser product and polish

Dependencies: P3 core content; final assets may land incrementally.

- Finish loading/title/setup, optional practice, settings/rebinding, results, credits, and rematch flows.
- Add local settings and stable-turn save/resume with version checks and corruption fallback.
- Implement responsive sizing, camera recovery, reduced motion/flash controls, team symbols, and text scaling.
- Handle browser audio permission, focus loss, page visibility, context loss, and unavailable storage.
- Test current stable Chrome, Edge, Firefox, and Safari on actual available hardware; record exact versions at release.
- Measure cold-load transfer, decode cost, frame percentiles, memory use, and long-match behavior.

Exit: the supported browser matrix passes the full-match smoke flow, targeted automated checks pass, and measured performance satisfies the agreed release budgets or a documented revised target.

## P6 — Web release

Dependencies: P5 and public-release decisions: title, rights/license, hosting account, and any spending choice.

- Connect the chosen host to the repository and create a preview using the production build.
- Configure HTTPS, static asset cache headers, security headers, and an explicit rollback procedure.
- Verify asset URLs, worker loading, optional asset failures, and clean fresh-session play on the preview.
- Scan the exact tracked source, history, media metadata, and generated public output for private information and secrets.
- Check content transfer and the hosting plan against expected traffic; enable appropriate spending controls where supported.
- Review the concrete release candidate, then publish when public deployment is authorized.

Exit: the public URL supports a full match and rematch, the source and media pass publication review, and rollback has a known last-good artifact.

## First implementation work queue

| ID  | Work                                           | Depends on    | Acceptance evidence                                                        |
| --- | ---------------------------------------------- | ------------- | -------------------------------------------------------------------------- |
| F01 | Reproducible toolchain and repository commands | Scope         | Fresh install, typecheck, test, and build commands documented and working  |
| F02 | Simulation state and fixed tick                | F01           | Seeded input fixture gives repeatable state within the supported runtime   |
| F03 | Terrain mask, carving, and renderer            | F02           | Cave and overlapping-crater fixtures show matching visual/physical terrain |
| F04 | Character movement and animation               | F02, F03      | Walk/jump/land/slope fixtures plus visual feel review                      |
| F05 | Projectile, wind, blast, and damage            | F02, F03      | Fast projectile, bounce/fuse, radial damage, and knockback fixtures        |
| F06 | Input, camera, and HUD                         | F04, F05      | Player can aim and fire while understanding turn state                     |
| F07 | Turns, elimination, and match end              | F04, F05      | Complete human-controlled test match; simultaneous death handled           |
| F08 | Basic AI with fallback                         | F05, F07      | Computer completes a sequence of legal turns on test maps                  |
| F09 | First playable package                         | F06, F07, F08 | Title-to-results-to-rematch 2-versus-2 session                             |

## Scheduling and change control

Give elapsed estimates after the movement/destruction spike establishes actual throughput and constraints. Asset production, terrain edge correctness, and fair AI are the main uncertainty; an untested calendar promise would obscure that.

For each milestone, capture what can be played, what was measured, and the remaining defects. New ideas enter the later-work list unless they fix a core quality problem. A milestone is complete only when its exit evidence exists.
