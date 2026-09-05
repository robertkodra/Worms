# Scope of work

Status: proposed design for review. Updated 2026-09-05. Numbers below are initial tuning targets, not validated results.

## 1. The game we are making

A polished, funny, turn-based artillery game for the browser that brings back the feeling of the original 2D Worms. Tiny, expressive characters inch across a destructible illustrated landscape, line up a shot, make a glorious mess, and try to escape the consequences. The computer is a capable rival with personality.

**The visual direction is genuinely 2D.** Side-on hand-drawn characters, illustrated soil cross-sections, flat silhouettes, sprite animation, and layered backgrounds. Three.js is the rendering engine for those assets. The project does not call for a 3D-looking diorama, rotating camera, or 3D character models.

**The selected reference is [Worms Armageddon on Steam](https://store.steampowered.com/app/217200/Worms_Armageddon/).** Its classic 2D battlefield and artillery identity guide the work. This is a reference choice, not a claim that exact movement timings, weapon values, or original code have been analyzed. Our initial values require hands-on feel testing.

We will create our own characters, maps, jokes, music, sounds, interface, and implementation. Repository name: `Worms`. Public game title: provisional, to be selected before release. See [Game design](GAME_DESIGN.md) for title candidates and the proposed garden setting. The garden palette is a creative option; preserving the Armageddon-like feel takes priority over committing to that theme. Characters should remain small, squishy, worm-like figures on a broad readable battlefield.

## 2. Preserve the things that matter

| What players remember | Proposed implementation |
| --- | --- |
| Slow, deliberate inching and expressive hops | Responsive movement with readable body compression, stretch, turns, landing, and airborne reactions |
| The tension of a carefully judged shot | Angle, charge, gravity, wind, bounce, and timed fuses; aiming remains a skill |
| Blowing holes through the battlefield | Actual collision-changing craters, tunnels, caves, and overhangs |
| A terrible shot becoming a wonderful accident | Knockback, falling, chain reactions, water elimination, and unexpected ricochets within consistent rules |
| A squad with a personality | Original named characters, reactions, short contextual speech, and banter with restraint |
| One-more-match appeal | Fast rematches, new map seeds, varied terrain, and a computer worth beating |

## 3. Improve friction without removing skill

- Precise, rebindable input; obvious active character, aim direction, power, fuse, wind, and remaining time.
- A camera that follows the action, keeps consequences readable, and allows manual pan, zoom, and recentering.
- Compact item selection with clear descriptions, ammo, and keyboard shortcuts.
- A tiny optional practice lesson that teaches movement, charging, wind, and retreat. The main opponent stays the same strength.
- Fast turn transitions and optional faster viewing of computer action; this must preserve simulation outcomes.
- Contextual banter about what actually happened, with subtitles, separate voice volume, and repetition limits.
- Local suspend/resume at stable turn boundaries, reliable restart, and replayable map seeds.
- Reduced screen shake, reduced flashes, scalable text, and team markings that do not rely on color alone.

Normal matches show an aim direction and power indicator, not an exact predicted impact path. Training may visualize trajectories to explain the controls.

## 4. First public release

| Area | Included |
| --- | --- |
| Mode | Single-player skirmish: one human team against one computer team |
| Teams | Four characters per team; initial 100 health each; original preset names with local customization |
| Match | Eliminate the other team; initial target 15–25 minutes; ties handled explicitly |
| Turns | Alternating teams, predictable living-character rotation, initial 45-second action window and 5-second retreat |
| Movement | Inching, forward jump, backward/high jump, slope traversal, knockback, fall damage, and water elimination |
| Aiming | Angle and charge controls, wind indicator, timed fuses where relevant |
| Arsenal | Ten weapons/utilities with distinct tactical jobs; full inventory in Game design |
| Terrain | Destructible 2D solid mask supporting holes and overhangs; procedural map seeds and spawn validation |
| Environments | Three illustrated themes built on the same simulation; one delivered first |
| Opponent | One challenging fixed difficulty; terrain-aware movement, shot planning, self-preservation, and resource management |
| Presentation | Original 2D character animation, layered backgrounds, readable particles, animated UI, and reactive sound |
| Audio | Original effects, a small original music set, and 48 contextual spoken lines; establish the voice production source before final audio production |
| Interface | Loading, title, play/setup, optional practice, match HUD, pause/settings, results, rematch, and credits |
| Persistence | Local settings and resumable stable-turn save; seed/build version stored for reproducibility |
| Platform | Desktop browsers, keyboard and mouse first; responsive canvas and graceful unsupported-device screen |
| Delivery | Public source repository, validated static web build, preview, and eventual public deployment |

The visual themes change appearance and map composition, not introduce three separate simulation systems. Disconnected terrain remains suspended in the initial rules; physical terrain collapse and fluid simulation are outside this release. Sudden-death water rises after a fixed round threshold to discourage indefinite hiding; exact threshold and rise rate are playtest tuning values.

## 5. The computer should feel strong and fair

The opponent uses the same movement, damage, ammo, wind, terrain, and projectile rules as the player. It evaluates possible positions and shots, values knockouts and knockback, avoids friendly fire, and reserves limited tools for worthwhile opportunities.

It receives no hidden health bonuses, extra turns, or knowledge of future random events. It has bounded search and modest, consistent execution uncertainty rather than perfect artillery accuracy. It must still execute obvious safe shots competently. Cosmetic personalities may vary its jokes and expression; they do not form hidden difficulty levels.

Strength will be evaluated with repeatable tactical scenarios and human playtests. We should see deliberate use of terrain, reliable exploitation of obvious opportunities, and understandable losses. A win-rate claim is premature before playtesting. The release gate includes showing a clear advantage over a simple baseline bot on paired seeded maps; human testing remains necessary because beating that bot is not proof of a fun opponent.

There is no runtime LLM or paid AI inference requirement. The opponent is local game AI, implemented as planning and simulation.

## 6. Character and comedy direction

Original small burrowing creatures, unmistakable at gameplay scale. Give them individual names, simple readable accessories, a broad expression set, and a consistent hand-drawn style. Animation should make waiting, aiming, slipping, landing, and surviving amusing even before dialogue is added.

Use short original jokes timed to events. Examples of tone: “I meant that hill.” after a missed shot; “New window!” after a wall is destroyed; “Still counts.” after an accidental success. Avoid incessant speech and overlapping lines. Let an anxious look carry a joke when silence works better.

The nostalgic target is comic timing, movement, and squad personality. Existing game voice recordings, catchphrases, music, logos, and artwork are not part of the asset plan.

## 7. Asset production is part of the work

Deliver original concept studies, a reusable 2D character animation system, terrain and background layers, weapon/item sprites, effects, UI artwork, sound effects, music, voice scripts, subtitles, and a credits/provenance manifest. Generated concept illustrations establish a direction; they are not automatically usable, consistent animation sheets.

The first slice will use a deliberately small set of clean 2D assets, with reusable body/expression pieces where practical. Expand production after movement and destruction feel good. Blender access is not required for the chosen 2D approach. Identify a suitable authorized voice generation or recording workflow before final audio production; text and temporary original sound can support development meanwhile. Spoken banter remains a v1 deliverable. If its production source cannot be established, revising that release requirement is an explicit scope decision.

See [Asset plan](ASSET_PLAN.md) for quantities, formats, source files, and acceptance criteria.

## 8. Technical approach

Use TypeScript, Vite, and Three.js with an orthographic camera. Keep a fixed-step 2D simulation separate from rendering. A mutable CPU terrain mask is authoritative for both movement and projectile collision; the illustrated terrain uses the same mask when rendered. This avoids a pretty explosion that leaves an invisible wall.

Run bounded AI planning in a worker where available, with a safe time-sliced fallback. Share the same simulation rules between the player, AI, and tests. Store local saves with a version identifier and graceful handling of invalid or obsolete data.

Detailed choices and prototype gates are in [Technical design](TECHNICAL_DESIGN.md). These are proposed engineering decisions to validate early, not claims about an existing engine.

## 9. Release quality gates

- A full match reaches a correct victory or draw state without manual intervention, including simultaneous eliminations.
- Movement, collisions, terrain carving, health, ammo, retreat, and turn transitions pass targeted simulation tests.
- Successive explosions can open a passage; both character and projectile collision recognize it consistently.
- The computer completes turns, uses legitimate actions, recovers from unavailable paths, and has a legal fallback when planning times out.
- New players can complete the optional lesson and understand a first shot without external instructions.
- Supported desktop browser tests cover audio unlock, resize, focus loss, pause, resume, save corruption, and graphics context loss.
- On named test hardware, aim for 60 fps at 1080p and acceptable 30 fps on reduced effects; report measured results and test conditions before release.
- Initial playable asset transfer targets no more than 10 MB compressed; defer optional theme/music assets. Measure loading on a cold cache, not just a warm development server.
- No recurring console errors, broken asset links, leaked private information, or undocumented asset sources in the release build.
- Music, effects, and voice each have volume controls; essential game information remains available without audio.
- The final hosted build loads over HTTPS and supports loading, playing, finishing, and rematching from a fresh browser session.

## 10. Explicitly later

Online multiplayer, matchmaking, accounts, cloud saves, public leaderboards, campaign narrative, level editor, live-service progression, monetization, touch-first phone controls, gamepad certification, and a huge arsenal are separate follow-on scopes.

Local hotseat, a polished instant replay, daily seed challenges, expanded voice packs, and a grappling rope are attractive candidates after the core release. Rope movement deserves its own collision and feel prototype; it should not hold up a strong first playable match.

## 11. Delivery sequence and decisions

The [Roadmap](../planning/ROADMAP.md) defines gates from feel prototype to public release. Build a complete 2-versus-2 slice before producing the full content set. No game implementation or deployment is included in this planning pass.

The current direction is sufficient to start that slice after scope review. No AWS, Vercel, Blender, or audio-service access is needed to begin local development. Hosting access, a public title, a software/asset licensing decision, and a final audio production source become relevant before release. They do not block the initial prototype.
