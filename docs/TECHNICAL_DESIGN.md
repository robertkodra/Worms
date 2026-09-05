# Technical design proposal

Status: planning only. No game, performance result, compatibility result, or test completion is claimed here. Numbers below are proposed acceptance targets to validate during implementation. The selected reference is [Worms Armageddon](https://store.steampowered.com/app/217200/Worms_Armageddon/), with independently created code and assets for this project.

## Recommended foundation

Use TypeScript, Vite, and Three.js. Keep gameplay in a small, framework-independent simulation library; use Three.js for presentation and HTML/CSS for menus and the HUD. Vite provides a TypeScript starter and production build workflow. Pin compatible dependency versions and the supported Node version when implementation begins, and commit the lockfile. [Vite guide](https://vite.dev/guide/)

The match uses fully two-dimensional gameplay and illustrated visuals, preserving the classic side-on Worms feel. Three.js renders textured quads, sprite sheets, illustrated terrain, and layered backgrounds through a fixed side-on orthographic camera. Characters, terrain edges, shadows, and effects all use 2D art. The camera pans and zooms without tilting or rotating the playfield. Orthographic projection preserves object size regardless of camera distance. [Three.js OrthographicCamera](https://threejs.org/docs/pages/OrthographicCamera.html)

Use the Three.js WebGL renderer and require WebGL 2. Provide a clear compatibility message if its initialization fails. WebGPU is outside the initial scope: the current WebGL renderer already targets WebGL 2. [Three.js WebGLRenderer](https://threejs.org/docs/pages/WebGLRenderer.html)

The entire match, including AI, runs in the browser. No game server, remote model inference, account system, database service, or cloud save is needed for the proposed single-player release. Validate the vertical slice with two characters per team, then expand to four per team for the initial full release.

## Boundaries and data flow

| Module | Responsibility |
| --- | --- |
| `simulation` | Fixed-step match state, command validation, collision, projectiles, damage, terrain edits, rules, seeded random streams |
| `content` | Validated weapon definitions, map recipes, team templates, animation and audio event identifiers |
| `ai` | Candidate movement and attack planning using the simulation library in a worker |
| `presentation` | Three.js scene, camera, animation, terrain display, particles, effects, sound |
| `ui` | Menus, controls, accessible HUD, pause, local settings, results |
| `persistence` | Versioned local checkpoints and preferences |

Input becomes a command carrying a simulation tick and stable actor identifier. The simulation produces state and ordered events such as `jumped`, `exploded`, `damaged`, and `turnEnded`. Presentation consumes those events; animations and audio never decide whether a hit occurred. Data definitions contain gameplay values, while assets contain appearance.

Prefer ordinary modules and typed records over a generic entity-component framework. Share the exact projectile and damage code with AI evaluation. Keep renderer objects, browser APIs, and wall-clock time out of the simulation package.

## Fixed-step simulation and turn lifecycle

Start at 60 simulation ticks per second. Rendering interpolates previous and current state independently of display refresh rate. Tick-based timers govern fuses, turns, retreat windows, damage resolution, and sudden death. Use stable entity ordering and separate seeded streams for maps, gameplay randomness, and cosmetic variation; adding a voice line must not change a projectile outcome.

Use a bounded accumulator. Process at most five catch-up ticks per display frame. If more elapsed time remains, discard excess wall time and let the single-player match slow temporarily rather than skipping simulation states. Repeated overload triggers a visual-quality reduction. Pause and clear the accumulator when the page becomes hidden; never burn the player's turn while they are away. Browser animation callbacks are commonly paused in background tabs, so elapsed wall time cannot safely serve as the match clock. [MDN requestAnimationFrame](https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame)

Proposed lifecycle:

`Loading → MatchSetup → TurnStart → PlayerControl or AIPlanning → ActionCommitted → Retreat/ActionResolution → WorldSettling → TurnEnd → next TurnStart or MatchResult`

Pause suspends the active state and returns to it. Only one weapon action may be committed per turn; movement remains available during the configured retreat window where the weapon permits it. Turn timeout commits an end-turn action. Timer expiration must not interrupt a projectile in flight. Resolve chain explosions, falls, damage, deaths, and victory in a documented stable order before advancing the turn. Bound settling time and handle stuck projectiles explicitly so a grenade cannot stall a match forever.

Seeded inputs should reproduce a match in the same build and runtime, verified by state hashes at turn boundaries. This is a debugging target, not a promise of bit-identical cross-browser or cross-version replay. Floating-point behavior, math functions, version changes, and a watchdog-shortened AI search can diverge. Record committed AI commands in a replay log instead of rerunning its planner. Multiplayer lockstep and a public replay format are separate future projects.

## Destructible terrain

### Authoritative representation

Prototype a CPU-owned `Uint8Array` occupancy/material grid at 2048 × 1024 cells, approximately 2 MiB per full grid before caches and snapshots. Treat one cell as one simulation distance unit initially and a character as roughly 24 cells tall; tune the relationship before art production. Split metadata and dirty tracking into 128 × 128-cell chunks.

Every cell can independently be empty or solid. This supports tunnels, cavities, arches, separated islands, and overhangs. A heightfield is unsuitable because it cannot represent these shapes. A general-purpose 3D rigid-body engine is unnecessary for this design.

Explosions subtract a rasterized circle or weapon-defined stamp in a bounded grid region. Use an explicit cell-center inclusion rule and stable event order. Record changed chunk versions, then update their collision metadata, texture data, and illustrated edge details. Ground support is queried again after edits so exposed characters fall immediately. Disconnected terrain stays suspended in the first release; debris is cosmetic. Simulating collapsing islands would materially change both scope and tactics.

Map recipes combine seeded silhouettes with cave/arch stamps and spawn validation. Reject or repair seeds with embedded characters, immediate unavoidable drowning, inaccessible starting pockets, or severe first-turn exposure imbalance. Store a small set of handcrafted regression maps alongside generated maps.

### Collision and movement

Represent characters with a vertical capsule, independently of their animated body. Use chunk occupancy bounds to reject empty regions and narrow-phase capsule-versus-solid-cell tests for nearby candidates. Sweeps and conservative contact resolution are required; checking only the final position would permit tunneling. Make collision epsilon, maximum contact iterations, and recovery behavior explicit and covered by fixtures.

Implement a kinematic controller with acceleration, braking, slope following, a small permitted step height, grounded probes, jump buffering, and short coyote time. Tune these in a dedicated movement playground containing stairs, lips, caves, steep slopes, and narrow ledges. The controller must not climb walls by repeated step-up attempts or snap onto a ceiling. Walking, forward jump, backflip, falling, landing, and knockback are separate motion states.

At the grid scale, use a bounded neighborhood fit to smooth grounded orientation and animation, while the collision hull remains conservative. Set the maximum discrepancy between the visible terrain boundary and collision boundary to one cell. A squash/stretch body, anticipatory jump pose, landing compression, look direction, and brief impact reactions should make the character expressive without changing its hull. Keep the collision anchor stable under every animation.

If the capsule-grid solver fails the movement gate, evaluate a mature 2D collision library against contours rebuilt only for changed chunks. That is a fallback decision after measurement, not an additional engine to maintain in parallel.

### Terrain display

Start with an illustrated terrain texture on a quad whose fragment shader discards empty occupancy cells. Use opaque cutouts for the playable surface; reserve blended transparency for effects. The occupancy texture gives immediate visible holes without triangulating the entire solid interior. Three.js `DataTexture` accepts typed-array data, making it a suitable bridge from the CPU grid to the renderer. [Three.js DataTexture](https://threejs.org/docs/pages/DataTexture.html)

First upload the small full mask once per terrain-edit batch; do not assume partial texture updates will be faster until measured. Render a thin outline and darker freshly exposed earth using bounded neighboring-mask samples in the terrain shader. These are flat illustrated treatments around both external boundaries and internal cavities. Keep texture coordinates consistent across chunks, match the visible occupancy threshold to collision, and bound antialiasing to the one-cell tolerance.

Optional grass tufts, roots, rubble, and char marks are small sprites anchored to validated boundary positions. Recheck their anchors after a blast and remove unsupported decoration. Use sprite atlases and batch compatible quads to reduce draw calls. Three.js documents the overhead of many separately drawn meshes; batching the game's sprites is a design inference to validate by profiling. [Three.js object optimization](https://threejs.org/manual/en/optimize-lots-of-objects.html)

If edge shading is too expensive, precompute a small edge-band texture for dirty regions or reduce its sample count. If mask uploads dominate, compare separate chunk textures against the full-mask upload. Any fallback must retain cavities and overhangs. Terrain extrusion, polygonal scenery, perspective lighting, and 3D character assets are outside the selected visual direction.

## Projectiles, explosions, and weapons

Use data-driven weapon definitions: launch speed/power mapping, gravity scale, wind response, fuse, restitution, damage falloff, blast radius, impulse, ammunition, retreat policy, and effect identifiers. Keep these constants in the same source used by player actions and AI.

For each tick, integrate a projectile's trajectory and sweep its finite-radius circle along each segment against terrain cells and character capsules. Subdivide curved motion until the maximum deviation from the segment is at most one quarter of a cell. Compute the earliest impact, including rounded corners for circle-versus-cell contact, then process any remaining time after a bounce. Resolve tied impacts in stable order. Cap bounce iterations and retire or settle trapped objects through an explicit rule.

An explosion generates terrain removal, radial damage, impulse, and cosmetic events in a fixed sequence. Specify whether terrain shields damage before weapon tuning begins; recommended starting rule is radial damage with a bounded terrain-occlusion reduction sampled against the pre-explosion grid. Preview, AI, and actual damage must all follow the same rule. Impulse and subsequent fall/drowning consequences are separate from direct damage.

Prototype one direct rocket and one bouncing timed grenade first. Add the remaining weapons only after fast shots cannot cross a one-cell barrier, craters align with hits, bounces are stable, and the turn always finishes. Any later tether or rope needs its own collision, locomotion, AI, and camera gate; it is not a cosmetic weapon variant.

## Challenging, fair computer opponent

Provide one tuned opponent policy with no difficulty selector. Difficulty comes from evaluating terrain, wind, bounces, positioning, blast combinations, ammunition, friendly fire, and escape routes. The opponent uses the same movement limits, available weapons, turn budget, and publicly visible match state as the player. It cannot read future random outcomes, modify physics, or receive extra damage or health.

At a stable turn boundary, send a versioned simulation snapshot to a dedicated worker. Count active planning time against the computer's action window; pausing or losing focus pauses both planning accounting and the match. Workers can perform computation away from the UI thread and communicate by messages; transfer a copied grid buffer or bounded changed chunks, never detach the live simulation's terrain buffer. Avoid shared-memory requirements initially. [MDN Web Workers](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Using_web_workers)

Planning stages:

1. Generate bounded reachable movement candidates, including staying still, walking, and validated jumps. Invalidate local reachability data when terrain chunks change.
2. Sample a coarse set of targets, weapons, launch angles, powers, and fuses. Simulate trajectories without graphics.
3. Retain the strongest candidates and refine them using the full shared simulation, including local terrain edits and consequences. Use reusable scratch storage or copy-on-write chunks rather than copying the whole map per shot.
4. Score enemy damage, eliminations, water knockouts, position, escape, resource cost, self-damage, and friendly fire. Favor plans robust to small aim perturbations rather than mechanically perfect shots every turn.
5. Return a legal command sequence plus the snapshot revision. Revalidate it before execution. Abort stale work on reset, quit, or a changed world.

Start with at most 256 coarse trajectories, 24 refined candidates, and 180,000 simulated ticks per decision. These are profiling hypotheses. Prefer a fixed evaluation count for reproducibility, targeting 0.5–2 seconds per turn. A three-second watchdog selects the best completed legal plan. If no plan is ready, attempt a validated safe action or end the turn. Hardware may change the watchdog outcome; recorded commands preserve replays.

If workers are unavailable, run the same planner incrementally in main-thread slices of at most four milliseconds. If the normal evaluation budget cannot fit the reference device, improve pruning and reuse before reducing the budget globally. Avoid silently making the opponent weaker on slower devices through a permanent alternate policy.

Use a fixed tactical test suite, seeded opponent-versus-opponent matches, and human playtests. Require legal completion in every fixture; compare decision quality against a simple baseline policy. A provisional target is at least a 70% win rate against that baseline over 200 paired seeded matches with team sides swapped. This establishes relative competence, not whether humans find the game fun. Human tuning must separately check avoidable self-harm, repetitive perfect shots, variety, and readable decision making. Any deliberate aim variability is fixed, seeded, and symmetric with the rules; no hidden adaptation to the player's win/loss record.

## Rendering, audio, and interface

Use an original illustrated character with sprite animation for idle, crawl, turn, forward jump, backflip, aim, fire, hurt, landing, and defeat. Keep frame dimensions, collision anchors, hand positions, and muzzle attachment points explicit. Weapon sprites attach to the character with shared scale conventions. Pack frames into atlases with padding to prevent filtering bleed. Prototype with simple drawn sprites; later art must preserve the established timing and silhouette. Blender access is not required for this 2D pipeline.

Use layered illustrated backgrounds, flat stylized shadow sprites, pooled particles, animated explosion sheets, and bounded debris lifetimes. Define explicit render layers for sky, background, terrain, characters, effects, and UI so transparency does not accidentally hide targets. Limit parallax to a gentle background treatment. Keep foreground decoration out of aim paths. The camera follows the active unit, projectile, and impact with bounded movement and an immediate recenter control. Reduced-motion settings disable shake and shorten dramatic moves. Camera position never changes simulation coordinates.

Provide subtitles for every voice event, voice/music/effects volume controls, and an explicit audio-start interaction. Load voice packs after essential gameplay assets. Web Audio contexts should be created or resumed from a user gesture to respect browser autoplay behavior. [MDN Web Audio best practices](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Best_practices)

Use real DOM controls for keyboard focus, readable labels, pause menus, and settings. Keep aim angle, power, wind, turn time, health, and ammunition readable without relying solely on color. Initial controls target desktop keyboard and pointer; full touch gameplay is a later compatibility and interaction milestone.

Dispose replaced geometry, textures, render targets, and audio/worker resources on teardown. JavaScript garbage collection alone does not free every Three.js GPU resource. Test repeated rematches and context loss/restoration. [Three.js cleanup guide](https://threejs.org/manual/en/cleanup.html)

## Local persistence

Use IndexedDB for one resumable match checkpoint and a small number of local preferences/statistics records. Commit a checkpoint at a settled turn boundary, containing schema/build compatibility identifiers, seed and random state, terrain, teams, weapon inventory, turn order, and rules. Resume from that checkpoint after a reload; restoring an arbitrary mid-flight frame is outside the initial scope. IndexedDB supports asynchronous structured storage and transactions. [MDN IndexedDB](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API)

Keep saves on the device and make their scope clear. Storage can be unavailable or evicted, and data is tied to the browser origin; catch failures and let the match continue in memory. Do not promise permanent save durability. Provide a reset-local-data control and consider a versioned manual save export only after core persistence works. [MDN browser storage quotas and eviction](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria)

Use plain data validation on load. Reject corrupt or incompatible checkpoints with a readable recovery action. A display name is text, never executable HTML. No analytics, user identifiers, asset-generation credentials, or remote AI calls are needed by gameplay.

## Proposed budgets and verification

Select and document exact public reference devices before implementing performance acceptance. Proposed baseline: a recent mid-range laptop with integrated graphics, 1920 × 1080 display, browser zoom 100%, and internal pixel ratio capped at 1.5. Use a worst-case fixture with four characters per team, highly cratered terrain, and the heaviest permitted explosion. Collect frame percentiles over at least ten minutes, excluding initial loading but including AI turns and terrain destruction.

| Measure | Proposed target / action |
| --- | --- |
| Default play | 60 FPS target; p95 frame time at most 20 ms and p99 at most 33 ms on the reference device |
| Lower visual quality | At least 30 FPS with p95 at most 33 ms; lower resolution, shadows, particles, and background detail before changing simulation |
| Simulation cost | p95 at most 2 ms per 60 Hz tick; profile crater-heavy collision separately |
| Destruction response | Collision and visible hole agree by the next rendered frame; decorative edge updates finish within 100 ms; no destruction-related main-thread task above 50 ms |
| AI | Typical decision 0.5–2 seconds; three-second watchdog; UI stays responsive while planning |
| Draw work | Starting budget at most 100 draw calls and 50,000 visible triangles from sprites/quads, including effects; also profile transparent overdraw |
| Memory | Starting target under 250 MiB JS heap where observable, bounded texture allocation; no monotonic resource growth across ten rematches |
| Loading | Essential compressed assets at most 10 MB; playable within eight seconds on a controlled 20 Mbps, 100 ms-latency connection; optional theme/audio assets at most 30 MB combined |
| Input | Visible aim/movement response within 100 ms at p95; target next-frame feedback on the reference device |

These are proposed gates, not measured capabilities. Browser tools cannot provide one universally comparable total-memory number; pair available heap measurements with tracked texture/geometry counts and process observation on reference devices. Device emulation is not a substitute for physical GPU testing.

Use Vitest for the pure simulation: occupancy edits, sweep collisions, blast boundaries, wind, jumps, turn transitions, seeded hashes, saves, and AI command legality. Favor geometric edge cases and invariants over snapshots that merely duplicate implementation. [Vitest guide](https://vitest.dev/guide/)

Use Playwright for boot, settings, a complete seeded match, pause/resume, refresh recovery, keyboard navigation, and compatibility messages across Chromium, Firefox, and WebKit. Manually test current desktop Chrome, Edge, Firefox, and Safari on real hardware before claiming support; Playwright's WebKit is not branded Safari. Recheck the current and previous major versions at release. [Playwright browser documentation](https://playwright.dev/docs/browsers)

Core fixtures include a one-cell wall, a thin overhang, a crater crossing four chunk corners, a projectile spawned near its shooter, a grenade in a narrow cavity, simultaneous deaths, a support-removing blast, pause during flight, stale worker output, quota failure, and a match with no possible damaging shot. Run long seeded simulations to catch invalid numeric states, terrain penetration, negative inventories, endless turns, and illegal actions. Visual review must include animation feel, readable terrain silhouettes, subtitles, muted sound, reduced motion, and small laptop viewports.

## Decision gates and principal risks

| Gate | Required evidence before expanding scope |
| --- | --- |
| Terrain feasibility | Holes, caves, overhangs, chunk seams, and repeated explosions work together; display/collision disagreement stays within one cell; destruction meets the latency budget |
| Movement feel | Walk, jump, backflip, landing, knockback, ledges, and slopes are reliable and enjoyable in a gray-box playground |
| Combat integrity | Rocket and grenade sweeps pass edge cases; blast outcomes are explainable; every action reaches a stable next turn |
| Opponent quality | Worker planning fits budget, fallback completes legally, tactical fixtures pass, and human playtests find the one policy challenging and fair |
| Presentation approval | One finished character, one terrain style, one explosion, and original sound/subtitle reactions feel cohesive in the slice; v1 additionally requires its original voiced set after the production source is established |
| Release readiness | Full matches and local recovery pass the browser matrix; resource use stays bounded; original asset provenance and public-artifact checks are complete |

The largest risks are sticky pixel-scale locomotion, expensive terrain-edge updates, AI searches that are either slow or unnaturally precise, and content production outrunning proven game feel. Resolve those risks in the order above. Defer multiplayer, accounts, cloud saves, generalized terrain collapse, modding, mobile controls, and elaborate replay tooling until the proposed single-player game passes these gates.
