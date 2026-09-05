# Original asset production plan

Status: proposed production scope. This inventory describes target deliverables, not completed runtime assets. Any separate concept studies remain exploratory.

## Art direction

Aim for an illustrated 2D garden with the charm of classic side-view artillery: expressive squishy sprites, painterly soil cross-sections, crisp playable edges, bold item silhouettes, and quiet layered backdrops. Painted highlights and subtle parallax provide atmosphere without making the scene look like modeled 3D. Use an orthographic camera without orbit, perspective foreshortening, or a diorama presentation.

The explicit reference is [Worms Armageddon](https://store.steampowered.com/app/217200/Worms_Armageddon/). Its broad-map, small-character 2D sensibility takes precedence over the provisional garden palette and equipment theme. A generated garden concept does not lock character anatomy, setting, or final art. The game's default view should feel like a legible illustrated artillery battlefield.

The burrowlings are original squishy worms with long soft bodies, anchored rear ends, and raised expressive fronts. They must read as worms, not pill bugs or antenna-led creatures. Explore original facial proportions, small asymmetric markings, and restrained accessories. Use a compact palette and expressions readable at small size. Preserve the pleasure of elastic worm movement while drawing original faces, silhouettes, equipment, and visual identity. Do not reproduce existing game sprites, recordings, catchphrases, or branding.

Character identity begins with movement: anchored inching, elastic hop anticipation, believable landings, small looks toward danger, and brief embarrassed recoveries. Four creatures per squad share an animation set and body family; combinations of two base color sets, four cheek/segment patterns, and four modest sprite accessories make the active character easy to identify.

## Bounded asset inventory

Quantities below are production targets for distinct assets or reusable sets, not a promise to create every item before gameplay testing. Variants should share sprite frames and texture atlases when possible.

| Asset family | Vertical slice | Complete v1 target |
| --- | --- | --- |
| Character | 1 procedural 2D base character; 2 team treatments | 1 original sprite family; 2 team palettes; 4 markings; 4 accessory sprite sets |
| Movement and reaction states | 8: idle, inch, forward hop, high hop, fall, land, aim, hurt | 16 total: slice states plus charge, throw, place, lift, brace, cheer, defeat, elimination |
| Facial expressions | 4: neutral, focused, worried, surprised | 8 reusable expressions, including pleased, annoyed, dazed, determined |
| Terrain appearance | 1 painted soil tile family and one simple edge treatment | 3 soil/theme texture families; consistent gameplay edge treatment |
| Background scenes | 1 simplified Potting Bench backdrop | 3 painted theme backdrops, each with up to 3 quiet parallax layers |
| Decorative scene props | 6 reusable Potting Bench props | 18 props total, about 6 per theme, with simple variants |
| Equipment | 4 simple held/placed sprites | 10 item sprite sets; reuse frames for projectiles where sensible |
| Additional projectile/placed forms | 2 simple sprites | Up to 6 supplementary sprite sets, including fragments, bridge, and dew effect object |
| Combat visual effects | 5 reusable effects: trail, explosion, dirt, hit, splash | 12 reusable effect systems plus palette/scale variants |
| HUD and item icons | 4 item icons; 6 shared interface symbols | 10 item icons; 12 shared interface/status symbols |
| Original text reactions | 12 lines across 6 triggers | 48 edited lines across 12 triggers |
| Spoken reactions | Captions and optional scratch tests | 48 short clips in 1 approved original voice family; production source to establish; slight non-identity pitch variants may distinguish individuals |
| Gameplay/UI sound families | 12 families with placeholder or simple synthesized sounds | 24 families, with 2–3 variations for the most repeated events |
| Ambient audio | 1 quiet loop or synthesized bed | 3 theme beds with 2–4 occasional one-shots each |
| Music | Optional temporary original loop | 2 original loops: menu and gameplay; 3 short victory/draw/defeat stingers |
| Front-end illustration | A simple procedural title scene | 1 finished title composition assembled from approved game assets |

The 16 character states may combine authored sprite frames, a small number of layered face/accessory sprites, and procedural squash and stretch. Target about 6–10 unique frames for a movement cycle and 3–6 for a short reaction, with approximately 120 authored body frames total before mirrored/recolored variants. Reuse airborne and aiming poses where they read well; do not multiply every state by every weapon and costume. Elimination is stylized and non-graphic: a splash, startled spin, or small retreating puff, depending on the cause.

## Production order

### 1. Prove the feel using code

Draw an original procedural 2D character and simple equipment silhouettes to a canvas or SVG source, then render them as Three.js sprites or textured quads. This is sufficient to test inching, aiming, hops, hit reactions, team readability, and camera behavior. Keep decorative sprites sparse until terrain and collision are stable.

Keep sprite animation separate from gameplay collision. The visible body can squash or stretch while its collision shape remains dependable. Use consistent sprite pivots and foot-contact anchors. Terrain edges and bridges must always match what the simulation considers solid.

This stage requires no Blender access and no finished generated imagery.

### 2. Explore a coherent original visual identity

Create a small concept sheet with three burrowling silhouette directions, a palette, expressions, a side-on battlefield mockup, and four weapon silhouettes. Select one direction before refining the rest of the inventory.

Image generation can help explore this sheet or produce background source material once generation is requested. **A generated concept image is a reference, not a game-ready sprite sheet, texture atlas, or consistent animation.** Generated material needs visual review, appropriate provenance, silhouette cleanup, transparent-background preparation, and technical processing before any runtime use. Do not turn mismatched generated images into the final asset library by default.

### 3. Replace selected placeholders with authored assets

Create the final character in a 2D drawing and animation workflow. Source files should preserve editable layers and named animation states. Author a small set of strong key poses first, review them at normal game zoom, then add in-betweens to the movement states that benefit most.

Export lossless transparent sprite sheets plus project-relative atlas metadata for frame rectangles, duration, pivot, and equipment attachment points. Mirror directional animations where the design allows it. Runtime animation can add subtle breathing, body spring, aim rotation for equipment, and a small mouth-sprite swap when speaking. Avoid excessive deformation that makes the art look like loose cutout pieces.

Blender is not needed for v1. A later production experiment could use additional tools, but the agreed result remains 2D illustration. There are no runtime GLB models, modeled characters, or 3D asset-pipeline deliverables in this scope.

### 4. Establish sound before filling the whole script

Create a sound palette around tiny natural materials: soft soil crunches, hollow acorn clicks, leaf flaps, seed rattles, dew plinks, and compact stylized impacts. Explosions should feel satisfying without dominating every other cue.

Simple original effects can be synthesized with Web Audio or generated offline from controlled synthesis. Field recordings or a licensed sound library can add richness only when permission and attribution requirements are recorded. Music needs an original composition or clearly documented license.

The voiced v1 target is 48 original short clips; finished recordings and a production source are not assumed to be available yet. First test captions and a few original nonverbal sounds in the slice. Establish suitable authorized synthesis or a consenting performer, produce a small audition with original delivery, review rights and quality, then record the script. Never request impersonation of a recognizable existing character or actor. If a suitable source cannot be established before release, raise an explicit scope revision; captions do not silently replace the voiced-banter deliverable. This dependency does not block the gameplay prototype.

### 5. Integrate, profile, and polish in the real game

Review assets at the actual camera distance and during motion. Reduce unnecessary detail if it competes with terrain edges, aim feedback, or small-screen readability. Profile the battlefield with the whole squad, particle bursts, water, shadows, and HUD active together.

An attractive isolated render is insufficient: the final acceptance is how the asset reads in play.

## Runtime conventions and initial budgets

These are proposed ceilings to validate on the performance baseline, not measurements of an existing build.

- Use a documented pixels-to-world-unit ratio consistently. Keep predictable sprite pivots, collision anchors, and named equipment attachment points.
- Export PNG or lossless WebP sprite atlases with JSON metadata; use compressed opaque images for painted backdrops where quality is preserved. Assets reference no external local files.
- Start character frames near 128 × 128 pixels, with tightly cropped atlas packing and room for hop stretch. Validate at the intended zoom before increasing resolution. Eight characters share body frames and atlas pages.
- Keep each atlas page at or below 2,048 × 2,048 pixels initially, pad frames to prevent texture bleeding, and select filtering deliberately. Transparent edges must not show dark or light halos.
- Target no more than 4 character atlas pages and 3 shared equipment/effects/interface pages for the initial polished set, excluding theme backgrounds and terrain textures. Count decoded texture memory, not only compressed downloads.
- Terrain rendering must update the same destruction silhouette as collision. Painted interior tiles and edge shading are clipped to the live terrain mask; decoration cannot cover up a playable hole.
- Keep the first playable theme's essential compressed transfer at or below 10 MB, including code and required assets; target at most 30 MB for all optional theme/audio assets. Load the selected theme first and defer others. Confirm these budgets once assets exist.
- Target 60 frames per second on the chosen representative laptop at a standard browser viewport, with a quality setting that preserves gameplay readability on slower hardware. Track draw calls, transparent overdraw, texture memory, CPU simulation, AI work, and GPU effects separately.
- Cap cosmetic debris and particles, reuse pools, and remove them after short lifetimes. Debris is not persistent physics terrain.
- Keep captions and text as text. Do not bake interface copy into images.
- Ship audio in browser-supported compressed formats and verify decoding on supported browsers. Begin playback only after user interaction; backgrounding or pausing should suspend the sound mix appropriately.
- Distinct volume buses: master, music, effects, and voice. Put protective peak control on the final mix and avoid sudden extreme volume changes.

## Sound and dialogue integration

The v1 sound families cover movement, two jump types, landings, falling, damage, elimination, water, aiming/power feedback, ten item identities, terrain rupture, turn handoff, timer warning, and interface confirmation/cancel feedback. Closely related events may share a source recording with tasteful variation.

Dialogue is event-driven rather than randomly frequent. A near miss, dangerous retreat, self-inflicted crater, successful bridge, scarce-item use, or victory is a reason to speak. Speech is never a prerequisite to conveying damage or danger.

Use one voice at a time, an 8-second global gap, a 20-second per-character cooldown, and recent-line suppression. Discard obsolete reactions instead of queueing them. Captions identify the speaker, fit into one short line where possible, and stay legible against the scene. Full, occasional, and off banter settings control frequency without affecting the tactical rules.

The game design document contains the initial original dialogue examples. The production script should attach each final line to its trigger, priority, variants, caption, and asset identifier.

## File organization

Proposed project-relative layout:

```text
assets/
  source/
    characters/
    equipment/
    environments/
    audio/
  manifests/
    assets.json
    voice-script.json
public/
  assets/
    sprites/
    terrain/
    backgrounds/
    audio/
    ui/
docs/
  ASSET_PLAN.md
  GAME_DESIGN.md
```

Source assets and runtime assets are distinct. Large editable projects should not enter ordinary Git history accidentally. Decide on Git LFS or an external source-asset store before adding large binary files; public runtime files still require explicit provenance. Keep build scripts reproducible and configuration portable.

## Provenance and public-repository hygiene

Every shipped asset needs a manifest entry with:

| Field | What it records |
| --- | --- |
| `id` and runtime file | Stable identifier and project-relative output |
| `kind` | Sprite, atlas, texture, illustration, sound, music, font, icon, or voice |
| `origin` | Original procedural work, original authored work, licensed source, or generated source |
| `creator` | Approved public credit or project attribution; never private account details |
| `source` | Public source URL when appropriate, or a project-relative source artifact |
| `license` | Exact license or explicit project-owned status, plus attribution requirements |
| `generation` | Tool/model/version and a public-safe prompt summary when relevant |
| `modifications` | Retopology, edits, synthesis steps, mixing, compression, or conversion |
| `review` | Status, reviewer role, and approval date for runtime use |

Do not invent ownership or license status. Assets with unresolved permission remain excluded from release builds. Preserve required attribution in a public credits page and a bundled notice file. Confirm font redistribution rights before bundling a font.

Before committing or exporting, check text and binary metadata for personal names, email addresses, absolute machine paths, private links, usernames, credentials, and embedded source references. Export images and atlas metadata without unnecessary author metadata or external local references; check audio tags too. Store only project-relative asset paths in manifests and scripts. Screenshots used publicly should show the game itself, with unrelated desktop content excluded.

This asset plan is a production checklist, not a legal clearance opinion. Any third-party or generated asset's actual release terms must be recorded when that asset is selected.

## Acceptance checks

- The character's face, team, active state, and held item remain readable at normal zoom.
- Animation follows the collision body; planted movement, jumping, and hits do not imply false contact or reach.
- Original silhouettes and expressions remain recognizable without copied branding or catchphrases.
- Props do not resemble collidable cover unless they actually collide; decoration stays behind or outside the gameplay plane.
- Destruction edges, platforms, water, and valid placement ghosts remain clear in every theme and reduced-motion mode.
- Effects communicate impact direction and scale without hiding the next decision.
- Text reactions work without audio. Important cues work without color alone.
- Audio loops have clean seams; repeated sounds have modest variation; simultaneous explosions do not overload the mix.
- Every release asset has reviewed provenance, required credits, and no unintended personal metadata.
- File size, memory use, and frame-time budgets are measured inside a real match before the asset is considered complete.
