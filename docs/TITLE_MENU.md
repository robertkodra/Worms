# Title menu — 0.7.0

The game now opens on a dedicated title page: an original wordmark and worm mascot, a flat dark green background, and Play, Continue, Options and How to Play. The battlefield and HUD appear only when a match starts. There is no startup dialog or blurred battlefield behind the menu.

## Flows

- **Play** opens match setup. Pick scenery, shuffle or enter a reproducible seed, and optionally name the two crews. Start Skirmish launches 3v3. Practice Range launches the existing 2v2 practice mode with unlimited kit and no turn timer.
- **Continue** appears only when a valid saved skirmish exists. It shows the team size and round, and restores the latest human-turn checkpoint. Opening setup and shuffling the seed do not modify the save. Setup explains that starting a new skirmish replaces it; practice preserves it.
- **Options** exposes sound, opt-in placeholder voices, voice level, reduced motion and keyboard bindings. The menu and pause screen share the same controls and saved preferences.
- **How to Play** is a full page from the title screen. During a match it remains a pause-safe dialog with the current keyboard bindings.
- **Main Menu** and Escape return from menu subpages. Tab and Enter navigate the native controls; focus moves to each page heading and returns to the originating menu choice. Escape cancels a pending binding capture before leaving Options.
- Pause and results offer a return to the title screen. Returning from pause retains the existing checkpoint behavior: Continue resumes from the start of the latest saved human turn.

## Implementation

Menu markup and styles live in `src/ui/title.ts` and `src/ui/title.css`. The game shell is hidden and inert while the title screen is active. Simulation, AI planning and scene rendering stop in the menu; the renderer is retained for the next match. Hidden-container camera dimensions are clamped until ResizeObserver reports the visible battlefield size. Menu setup no longer generates an unseen battlefield on each shuffle.

Settings and help content move between their title-page and in-game containers. This preserves event handlers and avoids duplicate control IDs or independent settings copies. A cancelled binding capture clears its prompt when leaving a screen. The mascot reuses the project's original procedural worm art; no additional external assets are introduced.

## Validation

- All 109 existing regression tests pass, along with TypeScript, the production build and repository/output privacy checks.
- Production-browser checks covered a fresh visit without Continue, a visit with a saved checkpoint, Play/setup, invalid seed rejection, shuffling, custom names and scenery, 3v3 start, pause, reload/Continue, 2v2 practice and return to the original saved skirmish.
- Verified Options settings across title/pause, binding capture and cancellation, rebinding reflected in the field guide, reset controls, keyboard navigation, and full-page versus in-game help.
- Screens were inspected at the browser's 1280 × 720 preview size and the actual 603 × 720 game-panel size. Setup stacks vertically in the narrow panel; longer pages scroll. No horizontal overflow was observed.
- The title screen exposes no open dialog or visible battlefield, and the document contains no duplicate element IDs. Both production preview sessions recorded no browser errors.

This update changes navigation and presentation. It does not close the separate audio, balance, cross-browser and hosted-launch gates in `RELEASE.md`.
