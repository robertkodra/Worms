# Worms — Burrow Brawl

An independent browser artillery game inspired specifically by **[Worms Armageddon](https://store.steampowered.com/app/217200/Worms_Armageddon/)**: expressive little characters, destructible landscapes, skillful shots, and comic disaster. The game uses Three.js to render a fully 2D illustrated world.

**Status: a local 3-versus-3 release candidate is playable.** It includes 12 weapons/tools in a compact left-side arsenal, mixed-team surface and cave starts, four seeded layouts in three scenery themes, a tactical computer with background shot planning, autosave/continue, editable names, a separate practice range and keyboard rebinding. Final audio, human balance testing, the full browser matrix and hosted launch checks remain open. See the [release record](docs/RELEASE.md).

## Play locally

With Node 22.12 or newer, run `npm ci` and `npm run dev` from this repository. Open the local URL printed by the server. Run `npm run check` for tests, build and privacy checks. Run `npm run preview` to inspect the production build locally. See the [release record](docs/RELEASE.md) for validation and remaining gates.

`Worms` is the requested repository name. A distinct public game title will be chosen before launch; **Burrow Brawl** is a provisional creative suggestion. This project is independent of Team17 and the Worms franchise. Art, dialogue, audio, characters, and implementation are to be original.

## Start here

- [Three-a-side and left arsenal](docs/LEFT_ARSENAL.md) — current match rules, compact weapon panel and controls.
- [Scattered battlefields](docs/SCATTERED_FIELDS.md) — mixed crews, cave entrances, spawn safety and validation.
- [Physics update](docs/PHYSICS.md) — crater-edge and grenade fixes, impact effects and next improvements.
- [Current release record](docs/RELEASE.md) — implemented features, evidence and remaining launch gates.
- [Scope of work](docs/SCOPE.md) — experience, deliverables, boundaries, and acceptance criteria.
- [Game design](docs/GAME_DESIGN.md) — rules, movement, weapons, personality, and interface.
- [Technical design](docs/TECHNICAL_DESIGN.md) — simulation, terrain, rendering, and computer opponent.
- [Voice recording pack](docs/voice/README.md) — 30 ready-to-generate lines, delivery notes, CSV and character directions.
- [Asset plan](docs/ASSET_PLAN.md) — original 2D artwork, animation, effects, sound, and production inventory.
- [Delivery plan](planning/ROADMAP.md) — ordered milestones and definition of done.
- [Hosting](docs/HOSTING.md) — recommended deployment and future scaling.
- [Public repository hygiene](docs/PUBLIC_REPOSITORY.md) — publication checks and privacy boundaries.
- [Concept art](docs/concepts/README.md) — proposed visual direction; not a game screenshot.

## Proposed first release

One player commands three characters against a challenging computer-controlled team of three. Short turns, wind, arcing projectiles, craters, caves, knockback, and well-timed banter create matches designed to last around 15–25 minutes. One fixed opponent difficulty; no account or game server required.

The current candidate implements the three-member teams and core browser product. The original 15–25 minute duration is a design target, not a measured result; playtest timing will determine whether it needs revision.

## Publication and reuse

This is a public source and planning repository. A software license and separate original-asset terms have not yet been selected. Third-party font, Three.js, and Flite notices are preserved in `public/licenses`; runtime asset provenance is recorded in `assets/manifests/prototype.json`.
