# Game design proposal

Status: proposed scope, ready for discussion. No game systems or finished assets are implemented by this document. The repository name is `Worms`; the public game should use an original identity.

## The pitch

A tiny illustrated garden becomes an outsized tactical battlefield. Two squads of expressive burrowing creatures trade absurd homemade attacks across destructible soil. A classic side-on view, squishy sprite animation, overhead health labels, and painted terrain make ambitious shots, panicked retreats, and accidental tumbles immediately readable.

The explicit creative reference is [Worms Armageddon](https://store.steampowered.com/app/217200/Worms_Armageddon/), especially its classic 2D sensibility. Preserve the pleasures of judging an arc, finding a useful perch, changing the map with an explosion, and hearing a teammate react to a spectacular mistake. Its characters, writing, weapon art, visual identity, music, and sound should be original. Familiarity comes from the rhythm and physical comedy.

The broad battlefield, small worm-shaped characters, expressive inching, playful aiming, overhead health, visible wind, and concise banter take precedence over the proposed garden styling. Garden themes and botanical equipment names are a provisional original wrapper, not an agreed requirement. Any concept illustration is a direction study, not approval of its character anatomy or setting.

**Recommended provisional title: Burrow Brawl.** Alternatives: **Dirtlight Duel** or **The Compost Rebellion**. These are creative candidates only; name availability has not been checked or cleared.

## Creative pillars

1. **Every body has weight and personality.** Inching builds into a stretch, a hop has anticipation and a soft landing, and damage produces a readable reaction before a character regains composure.
2. **The battlefield tells the story.** Craters alter future choices. An exposed tunnel, new ledge, or severed bridge matters after the spectacle ends.
3. **Hard opponents play visibly and fairly.** The computer creates pressure through positioning, resource use, and sensible shots. It has the same rules and information as the player.
4. **The comedy respects the player's time.** Short reactions, quick turn handoffs, and restrained camera work keep the match moving.
5. **A beautiful, clearly two-dimensional battlefield.** Hand-painted layers frame the action without hiding collision surfaces, hazards, aim direction, or team membership. The familiar 2D look is a deliberate creative requirement.

## Launch experience

- Single player, one human squad against one computer squad.
- Two teams of three creatures, each starting at 100 health.
- One fixed, challenging opponent. No difficulty menu, hidden adaptive weakening, or tutorial opponent carried into normal matches.
- Fully two-dimensional appearance and side-on gameplay, rendered in Three.js with an orthographic camera, sprites, and textured quads. Characters and terrain look illustrated, with no modeled 3D character appearance or camera orbit.
- A broad terrain overview with characters small relative to the map. Zoom helps movement and aiming, then the camera follows long shots without losing battlefield context; oversized character portraits and cinematic closeups are not the default play view.
- Alternating team turns. Living squad members act in a visible rotating order; no mid-turn character switching in v1.
- Standard turn budget: 45 seconds for movement and action, followed by up to 5 seconds of retreat after a committed action.
- The turn closes when retreat and all projectiles, explosions, and physical reactions have settled. A clear failsafe resolves objects that never settle.
- Target match length: 15–25 minutes, to be verified through playtesting.
- Three garden themes, using shared simulation rules and distinct art, ambient sound, and terrain profiles.
- Seeded procedural battlefields and a copyable seed on the result screen.
- Browser-local settings and a between-turn resume checkpoint. No account required.
- Desktop keyboard and mouse first; responsive layout and readable smaller screens. Touch gameplay and gamepad support are later work.

Winning means eliminating the opposing squad. Characters that enter the water are eliminated; falling onto terrain can cause damage. Friendly fire and self-damage always apply. A simultaneous final elimination is a draw with a quick rematch option.

## A match, from start to finish

1. Choose a squad accent color, a theme, and an optional seed. Start with a single prominent **Play** action and sensible defaults.
2. Briefly reveal the whole battlefield, the waterline, and both squads. The opening order is seeded and shown before the first turn.
3. On a turn, inspect the board, move and hop, choose an item, aim, and commit. Switching items is free until use. A used item ends the action phase.
4. After commitment, retreat during the short remaining window. The camera follows a significant shot while preserving an inset or edge marker for the active character.
5. Damage, knockback, destruction, eliminations, and a short reaction resolve. The next turn begins promptly.
6. After round 10, the water rises by a disclosed fixed step after every full round. A round is one human turn and one computer turn. The forecast waterline is visible before the rise, so endgame pressure is legible.
7. Show the winner, one or two memorable match facts, the seed, and **Rematch** / **New battlefield**. Avoid a long sequence of reward screens.

The rise schedule, starting height, and terrain heights must be tested together to make prolonged stalemates impossible. The match clock pauses when the player pauses or the browser loses focus.

## Movement and character feel

The creatures are provisionally called **burrowlings**: original squishy worms with a long soft body, planted rear, raised expressive front, and a readable mouth. They should immediately read as worms rather than pill bugs, caterpillars, or creatures with prominent antennae. Their faces, body proportions, small markings, accessories, and voice identity need an original visual exploration before final sprite production. Preserve the satisfying elastic body language of classic 2D artillery while drawing an original cast.

Movement is mechanically precise and visually elastic. The collision body follows deterministic movement; the visible sprite compresses and stretches around it. Authored sprite frames and modest runtime deformation supply the expression. Animation must never move the collision body through terrain or falsify a ledge position.

- **Inch:** anchor the rear, extend the front, then gather the body forward. Footing remains stable while the visible body performs the cycle.
- **Forward hop:** a short, predictable jump with squash, stretch, landing compression, and a small recovery pose.
- **High hop:** a steeper jump for nearby ledges, with less horizontal reach. No air steering in v1; show this consistently in training.
- **Slope adaptation:** the sprite's ground contact and body tilt follow nearby terrain samples; the face remains readable. Steep or unsupported surfaces stop walking.
- **Edges:** a brief lean and worried glance signal lost footing. This is a readable cue, not automatic rescue.
- **Damage:** a direction-aware flinch, airborne tumble when appropriate, and a short recovery wobble.
- **Idle:** small breathing motion, glance at the opponent, or a rare fidget. Never interrupt an action or obscure aiming.

Normal play shows only a short local footing marker and immediate blocked-movement feedback. It does not promise that a long route is safe or automatically avoid hazards. A jump landing guide may be used in the tutorial; ordinary matches rely on consistent jumps and readable terrain.

## Controls and aiming

Proposed desktop defaults, subject to a hands-on prototype:

| Action | Default input | Feedback |
| --- | --- | --- |
| Walk | A / D or left / right arrows | Direction, nearby footing, blocked movement |
| Forward hop | Space | Anticipation followed by the same repeatable hop |
| High hop | Shift + Space | A distinct anticipation pose |
| Aim | Pointer or up / down arrows | Muzzle direction and numeric angle |
| Set power | Hold and release primary pointer button; keyboard alternative F | Clear power meter with a keyboard-accessible adjustment option |
| Select item | Number keys or item tray | Description, remaining stock, and use rules |
| Inspect battlefield | Drag on empty space; wheel to zoom | Bounds and a reset-camera control |
| Pause / settings | Escape | Full pause during this local single-player game |

Pointer aiming must ignore HUD clicks and intentional camera drags. A click over a control cannot also fire. Remapping and left-handed mouse use are part of the interface pass.

Normal matches show angle, power, wind direction and strength, and the selected item's relevant properties. **They do not show an exact full projectile trajectory or guaranteed impact point.** An optional full trajectory demonstration belongs only in the practice range, where it teaches cause and effect.

Wind changes at full-round boundaries, with the same wind for both sides in a round. It is a small, readable factor affecting selected ballistic items; it never changes secretly during a projectile's flight.

## The starting arsenal

These are proposed balancing values, not final promises. A body length is the common design unit. Splash damage falls off with distance; terrain destruction radius and character damage radius are independent values that will be visibly consistent.

All ten items are available to both squads from the beginning. Stock is shared by a squad. One use consumes the action unless the player cancels before commitment. No random crate drops, critical hits, or weapon unlocks are required for v1.

| Item | Role and initial behavior | Stock per squad | Tradeoff / counterplay |
| --- | --- | --- | --- |
| **Seed Rocket** | Wind-affected impact projectile; up to 45 damage; medium crater | Unlimited | Reliable general tool, but exposed arcs and self-splash require space |
| **Pebble Popper** | Bouncing throwable; choose a 2- or 4-second fuse; up to 50 damage | Unlimited | Reaches over cover and rolls into holes; bounce and fuse demand judgment |
| **Burr Burst** | Throwable that splits into four low-damage fragments after its fuse; total damage to one creature capped at 55 | 2 | Covers a wide area; weak precision and serious friendly-fire risk |
| **Thistle Dart** | Straight, fast shot with no wind; 25 damage; negligible terrain change | 4 | Dependable against exposed targets; low damage and no escape route through soil |
| **Acorn Charge** | Placed explosive; 3-second fuse; up to 70 damage and a large crater | 2 | Strong destruction at close range; the retreat route must already exist |
| **Spore Shove** | Short-range directional puff; 15 damage with strong knockback; no crater | 3 | Threatens water eliminations; needs risky positioning and clear contact |
| **Root Drill** | Fires into a nearby soil face, creating a narrow tunnel up to four body lengths; at most 20 contact damage | 2 | Opens routes and removes cover; sacrifices immediate offensive pressure |
| **Leaf Bridge** | Places a short, horizontal, destructible leaf platform within three body lengths | 2 | Useful traversal or a perch; cannot intersect a creature, water, or existing terrain; enemies can destroy it |
| **Dandelion Lift** | Controlled lift with a short fuel budget, roughly five body lengths of maximum ascent | 2 | Escapes pits or gains height; ends the turn on landing, cannot also attack, and failed landings still hurt |
| **Dew Patch** | Restore 25 health to the active creature, capped at starting health | 1 | Gives up an attack; cannot revive an eliminated creature or protect against water |

Root Drill remains a simple terrain-cutting projectile; it does not introduce freeform digging controls. Leaf Bridge uses a validated placement ghost and explicit error feedback. Dandelion Lift uses the regular collision rules and a finite fuel meter; it does not require a rope simulation.

The recognizable artillery loop gets priority over a huge inventory. Additional items must create a tactical decision that the existing ten cannot express.

## Terrain and three themes

All themes use the same destructible material model in v1. Visual strata and roots are decoration unless a collision outline says otherwise. Small debris is cosmetic and expires; it cannot quietly become impassable rubble.

| Theme | Mood | Terrain tendency | Distinct assets |
| --- | --- | --- | --- |
| **Potting Bench** | Warm late-afternoon light, terracotta and brass | Broad starting shelves, modest tunnels, legible open arcs | Pot shards, seed packets, distant tools, coarse soil |
| **Moss & Moonlight** | Cool dusk, dew, soft bioluminescent accents | More arches and cavities, without increasing rule complexity | Moss tufts, mushrooms, roots, droplets, distant moths |
| **Rainy Windowbox** | Bright post-rain city garden, reflections, paper labels | Narrower columns and occasional connecting ledges | Painted planter trim, pebbles, tags, blurred window backdrop |

Theme names are provisional. Rain is atmospheric rather than a visibility penalty. Theme art shares the same gameplay contrast standards.

Seed generation validates spawn support, safe water clearance, minimum opposing-team separation, useful nearby movement choices, and no immediate overlap or unavoidable first-turn elimination. Failed candidates are regenerated with a bounded retry count and a known-good fallback seed. A beautiful seed that produces a broken match fails validation.

## The computer opponent

The opponent should feel competent, occasionally surprising, and fallible. It is one deliberately tuned policy with no difficulty selector.

- Use the same movement, aim, collision, weapon, inventory, and damage rules as the player.
- Read the current visible terrain, positions, inventories, wind, health, and turn order. Do not inspect future random events or the player's pending input.
- Generate a bounded set of reachable positions, then evaluate attacks and utilities from those positions.
- Score expected damage, elimination opportunities, future exposure, water risk, remaining resources, friendly fire, and retreat safety.
- Search projectile candidates in the same simulation, with a finite time budget. Sample a small, consistent execution error before firing and execute that result; never adjust a shot in flight to force a hit or a miss.
- Prefer useful moves without conspicuous dithering. Present a short readable preparation, then act; the player's browser must remain responsive while the search runs.
- Use utilities when they improve survival or access. It must demonstrate at least one successful bridge, drill, healing, and lift case in curated validation scenarios.
- Vary equally good plans using the match seed. Variation should produce believable decisions rather than arbitrary incompetence.

Before release, evaluate it on a seed bank and against human playtesters. The target is a challenging but learnable match for someone familiar with artillery games. Win rate alone cannot validate this: recurring perfect long-distance shots, suicidal choices, passive stalling, and expensive-item waste each need review. Target typical AI planning of 0.5–2 seconds on a documented representative laptop, with a 3-second watchdog and a legal fallback action when that budget expires.

## Personality and original banter

Small, brave creatures take ridiculous equipment much too seriously. The tone is dry, affectionate, and situational. Avoid imitating a recognizable existing voice, accent, catchphrase, or sound recording.

Proposed original lines:

| Trigger | Example line |
| --- | --- |
| Selected for a turn | “I've rehearsed the landing.” |
| Starting a risky climb | “Height is mostly attitude.” |
| Charging a strong shot | “This seed has ambitions.” |
| A shot passes very close | “A breeze with intentions.” |
| A harmless miss | “Excellent soil sample.” |
| Falling into a new crater, surviving | “The basement is larger now.” |
| Friendly fire, spoken by the victim | “Put that in the minutes.” |
| Placing a bridge | “Temporary confidence installed.” |
| Healing | “Dew diligence.” |
| Escaping an imminent blast | “I meant the smaller explosion.” |
| An opponent uses a scarce item | “So we're using the good seeds.” |
| Victory | “The garden is technically ours.” |

These examples establish tone and may change during editing. The full v1 script targets 48 short lines across 12 event categories, performed or produced through suitable authorized synthesis with an original delivery. Actual voiced banter is a v1 deliverable, with captions alongside it. The production source still needs to be established; no recordings are claimed to exist.

Only one spoken line plays at a time. Use a global 8-second cooldown, a 20-second per-character cooldown, and no repeat of the same line within the last 10 spoken lines when alternatives exist. A line is discarded if it is no longer relevant; never build a queue of stale jokes. Health/water warnings and menu accessibility feedback take priority over banter. Allow **Banter: full / occasional / off**, independent speech volume, and captions on or off. Humor must never delay control.

## Improvements that earn their place

- **Readable precision:** crisp collision silhouettes, angle and power values, stable jumps, clear placement validation, and a reliable camera reset.
- **A board that remembers:** persistent craters and ruptured passages make the player's decisions visible for the rest of the match.
- **Shorter dead time:** rapid handoffs, bounded AI thinking, restrained reaction beats, and concise end screens.
- **Generous learning tools:** an untimed practice range and four short optional drills explain movement, ballistic aiming, terrain use, and retreats. The main opponent retains the same fixed challenge.
- **Reliable return visits:** local settings, between-turn match resume, and shareable seeds. Seed sharing transfers the map and setup; it is not a replay.
- **Comfortable spectacle:** camera shake, impact flashes, motion, voices, and zoom behavior can each be reduced without changing the tactical rules.

## Interface and accessibility

The HUD shows the active creature, health, both squads, turn order, time, wind, item stock, and a compact item tray. Compact name and health labels hover above creatures, with an obvious marker above the active one. Give the active decision visual priority. Avoid a permanent wall of metrics and item descriptions.

Required for v1: remappable gameplay keys, keyboard-operable menus, visible focus, captions, scalable UI, independently adjustable master/music/effects/voice volume, reduced motion and camera shake options, high-contrast terrain edges, and team indicators that use shapes plus color. Critical state must never depend only on color or audio. Pause is available because the whole match is local.

An HTML interface should accompany the canvas so settings, menus, and turn summaries have meaningful labels. Full nonvisual battlefield navigation is a separate design problem and is not claimed by this scope.

## Delivery boundary

### First playable vertical slice

- One small seeded or curated Potting Bench map, two creatures per side.
- Inching, both hops, stable collisions, falling, and water eliminations.
- Destructible terrain and four items: Seed Rocket, Pebble Popper, Spore Shove, and Leaf Bridge.
- One complete match loop with basic computer opposition, correct turns, victory/draw, and rematch.
- Graybox/procedural burrowlings, one original visual direction, a few readable effects, and text reactions.
- A compact HUD and the core movement/aim/retreat tutorial.

The slice passes when a new player can finish a match, understand why shots and landings succeeded or failed, and want a rematch. Its job is to prove terrain, movement, aiming, and pace before making a large asset collection.

### Required v1

All ten starting items, 3v3 squads, three themes, validated procedural seeds, strong fair AI, full movement polish, original visual and sound identity including 48 short voiced banter clips, the four practice drills, accessibility settings, local resume, production performance work, and cross-browser release validation. Voice production requires a suitable authorized source. Captions and scratch reactions are sufficient for the slice; if voices cannot be produced for release, that requires an explicit scope revision rather than treating captions as fulfillment of the voiced-banter requirement.

### Explicitly later

**Highest-priority follow-on: a satisfying rope tool.** Rope traversal is an important part of the Armageddon reference and should receive its own feel prototype after the core slice. A first bounded version can use one visible anchor, constrained length, reeling, swinging, and release. Wrapping around terrain, repeated airborne attachment, destroyed anchors, and tunneling interactions expand its physics and testing cost substantially. The baseline v1 keeps Dandelion Lift so that a difficult rope implementation does not delay a complete game. A rope may replace Lift in the ten-item v1 inventory only after its separate prototype proves reliable and the scope tradeoff is accepted; it is not silently added as an eleventh item.

Other later work: local hotseat, online multiplayer, accounts, matchmaking, leaderboards, campaigns, story cinematics, a level editor, shareable replays, downloadable highlights, daily challenges, mobile touch controls, gamepad controls, fluid simulation, destructible background scenery, and a large cosmetic catalog.

These are potential extensions, not implicit requirements of the first release. None should block testing whether the central game is enjoyable.

## Decisions to validate through the slice

The proposed choices are concrete enough to start work after scope review. The first prototype should specifically test whether 45-second turns are comfortable, whether inching feels responsive, whether two jump shapes are sufficient, whether terrain cavities and sprite contact stay readable, and whether destruction leaves useful tactical choices. Weapon values, stock, water rise, and match-length targets remain balancing parameters. Title and final character art remain creative decisions until reviewed. The classic 2D appearance is already the agreed direction.
