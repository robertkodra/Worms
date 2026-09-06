# Skirmish 05 — release candidate work

This is a playable desktop release candidate, not a completed public launch. It retains the original 2D prototype art direction. The replacement recordings and music are being supplied separately.

## Implemented

- Three worms per team, corrected rotation after elimination, seeded mixed-team positions on surface and cave floors, and rising water after round 12. Shared finite stock includes one medkit, five shotgun shots and three rifle shots.
- Twelve distinct weapons and tools, a compact left-side arsenal with grouped icon rows, ammo counts, hover/focus details, category/search filtering and four left-side quick slots. The menu is data driven and supports a larger catalog without adding more permanent buttons.
- Four reproducible terrain layouts with irregular galleries and walkable cave entrances, each available as Moonlit Garden, Copper Canyon or Frost Hollow. Themes change scenery and material colors; collision rules stay identical.
- Fixed tactical AI with legal walking/jumping routes, weapon scoring, friendly-fire penalties and retreat. Shot search runs in a cancellable worker, with progress, bounded fallback and matching aim-error rules. Short movement previews still run on the main thread.
- Improved ledge jumping with higher normal/backward jumps, bounded assistance while rising beside a step, movement-direction priority and a short landing input buffer. Collision and jump rules remain shared with AI navigation.
- Local worm names, safe text rendering, readable staggered battlefield labels, keyboard rebinding, pointer/keyboard placement, browser-shortcut handling, pause and graphics-loss guards.
- Turn-start autosave and Continue. Exact terrain, inventory, names, turn rotation and random-generator state are restored. A damaged or unavailable save leaves New Game usable. Returning to the menu deliberately rolls back movement/actions to the start of the latest saved human turn.
- A separate practice range with unlimited items, no aiming time limit and resetting targets and terrain after each attempt. Physics and weapon behavior match skirmish rules. Practice does not overwrite the skirmish checkpoint.
- Placeholder voices are opt-in on new settings; captions remain active. The existing recording pack stays ready for the supplied replacements.
- Locked dependencies, a production build, repository/output privacy pattern checking, CI and a static-host configuration with same-origin assets/worker and cache/security headers. Local production preview uses the same baseline security headers.

## Validation

`npm run check` runs the test suite, TypeScript/production build and privacy scan. The scan reports relative filenames and rule names, never matched credential text. It is a useful publication check, not a comprehensive secret scanner.

The current suite has 94 tests. The [0.5.1 jumping update](JUMPING.md) records ledge, ceiling and input regressions, 384 generated-terrain jumps, save continuity and keyboard browser validation. The [0.5.0 team and arsenal update](LEFT_ARSENAL.md) records 3v3 defaults, legacy saves, the left-side weapon panel and browser validation. The [0.4.0 scattered battlefield update](SCATTERED_FIELDS.md) records mixed-team placement, cave exits, the rare surface-only fallback, saved-match compatibility, and a 10,000-field generation probe. The [0.3.1 physics update](PHYSICS.md) records the crater-contact, grenade-response and impact-presentation fixes and their additional validation. Coverage includes 3v3 spawns and legacy 4v4 saves and survivor rotation; sudden-death progression through a complete ending; practice isolation; saved-state and future-RNG equivalence; malformed/oversized saves; in-flight rocket, cluster, TNT and airstrike restoration; worker cancellation/fallback; and invalid key bindings.

An isolated paired benchmark of the earlier 0.3.0 rules used 20 seeds in both team assignments (40 matches). The full planner with movement and retreat won 24/40 against stationary rocket/grenade planning, with identical physics and aim error. All matches finished; there were no illegal actions or nonfinite states. Mean length was 13.5 team turns, median 13, range 8–30. This establishes development stability and comparative policy strength, not human difficulty or real-world match duration. No benchmark match reached sudden death; the focused regression fixture covers it.

Historical 0.3.0 spawn probing across 200 seeds found no embedded, unsupported or submerged worms. Minimum initial horizontal spacing was 70 pixels, minimum water clearance 114 pixels, and maximum difference between the two outer spawn margins 40 pixels. These fixed corridors are superseded by the scattered placement rules in 0.4.0.

Earlier 0.3.x browser smoke checks passed in the Codex in-app browser on macOS: customized 4v4 canyon setup; restored names, health and terrain after reload; practice firing and target reset; keyboard fire rebinding/reset; practice new-field isolation; and readable labels in narrow and wide views. A fresh production-build match under the configured content-security policy reached the results screen after seven rounds, seven computer attacks and eleven craters. Reloading removed the completed match from Continue. No browser errors were recorded. This smoke player mostly skipped turns to exercise progression; it is not a human balance test.

The local production response included the configured content-security, content-type, referrer and permissions headers. This verifies the local preview only; hosted caching/headers remain a separate gate. The 0.5.0 production JavaScript entry is approximately 623 KB uncompressed / 165 KB gzip, with a separate 25 KB AI worker. Vite's uncompressed chunk-size advisory remains; no production source maps are emitted.

## Launch gates

1. Integrate the supplied voice/music files; check decoding, loop seams, levels, repetition and provenance. The recording pack's 30 lines supersede the older planned count in the initial scope.
2. Human playtesting of the single fixed difficulty, movement feel and match length. The development bot benchmark does not substitute for this.
3. Complete the desktop browser/version matrix (Chrome, Edge, Firefox, Safari) and measured frame-time, load and memory budgets on representative hardware. Mobile/touch play is outside the first release.
4. Connect the selected host, run a fresh-session hosted full-match smoke test, verify real response/cache headers and worker loading, and retain a known-good deployment for rollback.
5. Confirm the public title and software/original-asset license terms before the public launch announcement.

## Hosting and rollback

No backend, database or runtime AI service is required for the single-player game. `npm ci` then `npm run build` produces `dist`. `npm run preview` serves it locally with the configured security headers. `vercel.json` describes the static output and hosting headers; it does not create an account, deployment or billing commitment.

On a connected host, deploy a reviewed commit to a preview first. Record its commit and deployment identifier. Promote only after hosted checks pass. Roll back to the previous successful deployment if the startup, assets, worker or save flow regresses. Never cache entry HTML indefinitely; only content-hashed assets receive immutable caching. Voices and music use revalidation so replacing an unversioned recording can take effect.
