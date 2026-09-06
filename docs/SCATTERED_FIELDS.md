# Scattered battlefields — 0.4.0

Worm positions now use two coordinates and actual terrain floors. Worm IDs, names and team rotation stay stable; an ID no longer implies a side of the battlefield.

## Inspiration

The original [Worms Armageddon PC manual, Landscapes](https://ftp.zx.net.nz/pub/archive/ftp.team17.com/pub/t17/manuals/Worms_Armageddon.pdf) describes random worm placement across generated landscapes. We follow that design principle with original generation and placement code. Our escape ramps and placement balance constraints are our own design, not a reproduction of Team17's internal algorithm.

## Placement and terrain

- Both crews draw from the same pool of surface and underground floor positions. The seed controls terrain, positions and team assignment, so restarting a seed repeats its opening. The changed generator produces different new fields from earlier versions; Continue restores the saved terrain and live worm positions.
- Intact caves have scalloped ceilings, gently uneven floors and walking ramps to daylight. Thin roof slivers are opened rather than left as floating pixels. Entrances, roof coverage and floor positions vary with the landscape. Explosions can subsequently destroy or change a route.
- A spawn must fit the worm's capsule, have extra headroom, a stable upward-facing floor and nearby footing on both sides. Starting positions are at least 120 pixels apart and at least 120 pixels above the initial water level.
- The selected positions span at least 65% of the field width. Both teams have positions in both horizontal halves, with at least 35% of the field width between each team's extremes. The team sequence across the field has multiple changes, rather than one human/computer boundary. There are no fixed bands per worm.
- A four-worm crew receives one or two underground starts when a safe balanced deal is available. Both teams always get the same count. Maps without enough safe cave positions use surface starts for both crews; we do not force an unsafe underground placement.
- A sheltered bot with no visible opponent can consider a longer route toward a cave entrance. Every proposed route is checked with the same movement physics against current terrain and occupied positions. It can be rejected after destruction or when blocked by another worm.
- Practice rebuilds its original seeded terrain and restores targets to their exact original floors after each attempt. This avoids returning a cave target to the top of the map or to a destroyed exit.
- New saves preserve two-dimensional spawn metadata. Earlier version-1 skirmish saves still restore their terrain, health, inventory and live positions. Storage input is validated and copied through an explicit whitelist.

## Validation

- 73 permanent tests, including 512 generated fields across both team sizes: supported, dry, separated spawns; team mixing and spread; equal underground counts; stable idle positions; deterministic replay; practice reset; old-save continuation; invalid metadata rejection; and cave-aware bot movement.
- Every underground start on the first 64 skirmish seeds walks its entrance with the real physics without jumping, digging, taking damage or intersecting terrain.
- A temporary development probe generated 10,000 additional fields across both team sizes. All generated successfully: 26,916 underground starts, with 203 fields using the surface-only fallback. It walked 3,422 sampled cave exits successfully. The probe was removed after recording these results.
- Eight complete 4v4 simulations exercised the full weapon planner, movement and retreat across all four layouts. All reached an ending with legal attacks and finite states. They lasted 12–38 team turns and included 11–36 shots. This checks progression, not human difficulty or match balance; this smoke probe does not apply the browser's aim error.
- Local production-browser checks showed mixed teams and cave positions on Garden Mesas (41823) and Sunken Valley (34). The first field progressed through four computer turns and a human underground grenade throw, resolving five shots and five craters without browser errors. The existing local skirmish checkpoint was kept separate from this production-preview smoke test.

The existing human balance, final audio, browser matrix and hosting gates remain in the [release record](RELEASE.md).
