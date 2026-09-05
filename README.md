# Worms — Burrow Brawl prototype

An independent browser artillery game inspired specifically by **[Worms Armageddon](https://store.steampowered.com/app/217200/Worms_Armageddon/)**: expressive little characters, destructible landscapes, skillful shots, and comic disaster. The proposed game uses Three.js to render a fully 2D illustrated world.

**Status: a local 2-versus-2 prototype is playable.** It includes destructible terrain, 12 weapons/tools in a searchable arsenal, four seeded map layouts, a computer opponent that moves and jumps, original 2D art, movement sounds, 30 spoken quips, and a full match/results/rematch flow.

## Play locally

With Node 22.12 or newer, run `npm ci` and `npm run dev` from this repository. Open the local URL printed by the server. See the [prototype guide](docs/PROTOTYPE.md) for controls, validation, and current limits.

`Worms` is the requested repository name. A distinct public game title will be chosen before launch; **Burrow Brawl** is a provisional creative suggestion. This project is independent of Team17 and the Worms franchise. Art, dialogue, audio, characters, and implementation are to be original.

## Start here

- [Scope of work](docs/SCOPE.md) — experience, deliverables, boundaries, and acceptance criteria.
- [Game design](docs/GAME_DESIGN.md) — rules, movement, weapons, personality, and interface.
- [Technical design](docs/TECHNICAL_DESIGN.md) — simulation, terrain, rendering, and computer opponent.
- [Asset plan](docs/ASSET_PLAN.md) — original 2D artwork, animation, effects, sound, and production inventory.
- [Delivery plan](planning/ROADMAP.md) — ordered milestones and definition of done.
- [Hosting](docs/HOSTING.md) — recommended deployment and future scaling.
- [Public repository hygiene](docs/PUBLIC_REPOSITORY.md) — publication checks and privacy boundaries.
- [Concept art](docs/concepts/README.md) — proposed visual direction; not a game screenshot.

## Proposed first release

One player commands four characters against a challenging computer-controlled team of four. Short turns, wind, arcing projectiles, craters, caves, knockback, and well-timed banter create matches designed to last around 15–25 minutes. One fixed opponent difficulty; no account or game server required.

The implemented prototype is smaller: a complete 2-versus-2 match on one terrain theme, with 12 items, four generated layouts, original character movement, and a fixed tactical opponent. Its purpose is to prove the feel before expanding the game.

## Publication and reuse

This is a public source and planning repository. A software license and separate original-asset terms have not yet been selected. Third-party font, Three.js, and Flite notices are preserved in `public/licenses`; runtime asset provenance is recorded in `assets/manifests/prototype.json`.
