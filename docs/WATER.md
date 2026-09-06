# Water, fuses and sinking worms — 0.6.0

Water entry now continues visibly instead of removing the object. This update retains the illustrated 2D art and introduces original procedural water textures and synthesized water sounds.

## Explosives

- Crossing the waterline emits one entry splash. Water sharply reduces launch speed, removes wind influence and adds drag. TNT, grenades, clusters and fragments keep their remaining fuse; entering water never restarts it. A submerged fuse remains readable beside the item.
- Rockets, mortar shells and airstrike shells plunge for about 0.2 seconds before an underwater detonation, unless they first strike submerged terrain. Timed explosives can rest on submerged terrain or the seabed until the fuse expires.
- Underwater explosions produce a soft blue pressure flash, expanding rings, rising bubbles and a surface plume whose strength falls with depth. Pressure light and rings stay between the waterline and the seabed. The sound is a low, muffled burst instead of the land explosion. Submerged cluster fragments do not create false surface-entry splashes.
- Damage, knockback and crater radius retain the existing weapon rules. An underwater explosion can still damage the shoreline or a nearby survivor. These are stylized game rules, not a fluid or blast-pressure simulation. AI shot previews use the same projectile routine as live play, including water drag and timing.

## Worms

A worm is eliminated once when it drowns. Its label and equipped weapon disappear, while the character tips onto its side, releases bubbles and sinks. The body comes to rest on submerged terrain or the seabed and remains there for the match. If an explosion removes a shelf beneath it, the body resumes sinking.

Remains are cosmetic: they do not block movement or shots, take damage, or hold up turn progression. A saved match retains which worms drowned; Continue reconstructs their resting remains without replaying the death. It does not preserve the exact intermediate pose of a sinking animation. Older saves remain compatible. Practice resets remove the remains when targets are restored.

At match end, the results panel gives a final sinking worm up to three seconds from water entry before covering the field. Ordinary turns continue while the cosmetic body sinks.

## Presentation and bounds

The aim readout and field label sit above the visible waterline so they do not hide the animation. Their offset is capped when zooming, panning or rising water would put the line higher in the viewport. Underwater items and remains use muted colors against a textured seabed. Effects pause with the arsenal or pause menu. Reduced motion removes screen shake and bubble trails, cuts spray counts and suppresses ring growth and character rotation.

Water effects are capped at 140 particles, 32 rings and 12 short pressure flashes, plus at most one body per worm. Expired effects and restarted fields release their materials and geometry; shared character textures are retained. No external assets or voice recordings were added.

## Validation

The suite has 109 passing tests, including 15 water regressions. These cover original fuse timing after entry, impact-weapon plunge timing, seabed resting, nearly expired fuses, submerged cluster fragments, preview/live parity, in-flight snapshot continuity, turn completion, single drowning events, saved/legacy state, gradual and paused sinking, stable remains and loss of underwater support.

The isolated browser animation preview was stepped through worm entry, sinking and resting, the TNT countdown and detonation, rocket entry and detonation, and reduced-motion effects. The production game was checked with a normal practice-range airstrike near the water on field 34; all five shells resolved and the practice range reset. The HUD leaves the water visible. No browser errors were recorded. TypeScript, production build and the repository/output privacy pattern check pass.

These checks cover this implementation's behavior. Human playtesting, sound-level judgment across speakers/headphones and the broader release browser/performance matrix remain necessary before public launch.
