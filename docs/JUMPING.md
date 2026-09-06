# Ledge jumping and input — 0.5.1

Jumping beside even a small vertical step used to stop all horizontal motion as soon as the capsule touched the step. The worm rose against the wall, then fell back to its starting side. Regression fixtures reproduced this at 16, 28 and 40 pixels of elevation before the fix.

## Movement changes

- A voluntary jump retains its launch direction while rising beside a ledge. Collision still prevents the body from entering terrain; horizontal travel resumes when the feet clear the edge. This assistance ends at the apex, on a ceiling contact, or after damage or external knockback. It adds no upward force and cannot scale a wall above the jump's reach.
- Normal jump launch speed is now 205 pixels/second upward, giving about 52 pixels of height on open ground. The backward high jump uses 245 pixels/second, reaching about 75 pixels. Horizontal launch speeds remain 103 and 61 pixels/second respectively. Space jumps forward; Shift + Space jumps higher and backward. Controls remain rebindable.
- A movement direction pressed with jump determines the launch facing, even if the pointer was aiming the other way. A jump tap can wait up to six simulation ticks (100 ms) for landing, then fires once. The buffer expires and is cleared on menus, pause, focus loss, match/turn changes and intervening damage.
- Jump state is carried through simulation snapshots and validated saved matches. Older saves without the field default to ordinary airborne collision handling. AI route previews and execution use the same revised jump physics. Midair steering and double jumps remain unavailable.

## Validation

The suite has 94 passing tests, including 17 new movement/input tests. The ledge matrix covers both directions, three approach gaps, and 16-, 28- and 40-pixel steps. Additional fixtures cover a 60-pixel backflip ledge, repeated attempts against a 100-pixel wall, low ceilings, uphill landings, blast cancellation, route-preview equivalence, snapshot/save continuity, legacy/malformed saves and buffered-input lifecycle.

A generated-terrain regression also exercises 384 jumps: normal and backward high jumps from all six surface/cave starts on 32 seeds. Every surviving capsule stayed outside solid terrain and every jump settled or ended in water within the bounded simulation window. Existing crater-side, steep-slope, fall-damage, grenade, projectile and full-match progression checks still pass.

In the local production browser build, practice field 34 was tested through the real keyboard controls: A + Space moved the worm uphill from approximately (304, 551) to (226, 509), then D + Shift + Space moved it backward uphill to (161, 475). Both landings retained 100 health. The left arsenal still opened and paused the field; no browser errors were recorded. Practice testing leaves the skirmish checkpoint intact.

These checks establish collision and input behavior. Human playtesting is still needed to judge the revised jump feel and tactical reach.
