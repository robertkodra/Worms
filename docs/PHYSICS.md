# Physics and impact update — 0.3.1

Historical release record. The [0.5.1 jumping update](JUMPING.md) adds ledge handling, revised jump heights and the input buffer proposed below.

The steep crater-side suspension reported in the playtest was a real collision bug. A falling capsule touching a sloping wall was marked grounded even without a walkable surface underneath. The step-up allowance also repeated within each movement substep, allowing near-vertical climbs.

## Fixed behavior

- Nearby terrain contacts provide an averaged normal. Only sufficiently upward-facing contacts count as ground; steep contacts redirect motion downhill. Gentle slopes remain walkable, and the step allowance is bounded per tick.
- Collision slices use the updated velocity after each response. Stopping at a wall no longer leaves stale movement applied within the same tick.
- Grenades use the surface normal of the actual collider, including worms. They bounce away from bodies, keep tangential motion after shallow impacts, and rest only when total speed is low on suitable ground. Small contact separation prevents repeated zero-distance impacts.
- Explosion impulses point outward, scale continuously with distance, and add to existing momentum. A modest upward bias preserves the cartoon feel; overhead explosions push airborne worms down rather than pulling them toward the blast. Zero-damage grazes no longer apply a fixed launch force.
- Fall damage measures descent from the airborne apex. Ordinary jumps remain harmless; a long drop after a launch is measured consistently, including a second midair hit.
- The same collision routines serve live play, AI shot rollouts and movement previews. Save structure remains compatible; existing saved positions settle under the corrected rules.

## Presentation

Worm art is slightly closer to its physical capsule and animates around a documented foot pivot. Landing squash stays attached to the ground. Landing speed controls dust and thump strength; grenade impacts emit short bounce sounds and small puffs. Explosions have a brief crater-sized impact ring with fewer particles. Flight sprites show ammunition rather than arsenal illustrations. Trails emit once per simulation interval instead of multiplying on high-refresh displays. Reduced motion suppresses the new squash and ring expansion and reduces particle count and travel.

## Verification

- 68 automated tests pass, including eleven targeted regressions for crater-side suspension, steep/gentle slopes, low ceilings, apex damage, midair impulse bookkeeping, worm/ground grenade contacts, bounce-event parity and blast direction/strength.
- Independent temporary probes: 36 crater drops, nine ramp slopes, 12 thin-obstacle tests up to 5,000 pixels/second, and 512 directional blast cases. No terrain penetration, invalid grounded survivor, or suspended survivor was found in those probes.
- Six projectile-slope probes ran 500 ticks each without terrain penetration. A fast shallow grenade retained motion and then settled.
- Sixteen complete 4v4 AI matches finished in 12–38 team turns without illegal actions, nonfinite state or settling timeouts. This is progression evidence, not a human difficulty measurement. The earlier paired-bot win rate in RELEASE.md belongs to the 0.3.0 rules.

## Next improvements worth testing

1. A short jump-input buffer, so a jump tapped just before landing is not lost. Keep air control and movement rules consistent for both teams.
2. Soil chips that hit the terrain and water, with splashes and ripples at actual impact positions. Keep these cosmetic and separate from the authoritative collision map.
3. Terrain-aware blast cover and better cluster/airstrike outcome prediction. Tune both damage and AI together so cover is useful without making the computer misjudge its own weapons.
4. Weapon-specific impact presentation: distinct rocket, grenade and heavy-shell smoke, recoil and restrained camera response. Compare readability with reduced motion enabled.

These are proposed next steps; they are not represented as implemented features in this update.
