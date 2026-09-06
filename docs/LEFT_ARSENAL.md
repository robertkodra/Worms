# Three-a-side and the left arsenal — 0.5.0

New skirmishes use three worms per team on the same battlefield. Shared inventory starts with five shotgun shots, three rifle shots and one medkit; the other weapon stocks are unchanged. Rising water begins after round 12, allowing four full crew rotations before sudden death. Practice stays at two per team. Saved 2v2, 3v3 and earlier 4v4 skirmishes retain their exact crew and state, with the team size shown on Continue and the battlefield label.

## Weapon panel

The [original Armageddon manual, Selecting Your Weapon and Weapons Panel](https://retrogamer.biz/wp-content/uploads/2015/10/Worms_Armageddon_-_Manual_-_PC.pdf) describes a side panel, stock counts, hover descriptions, weapon groups and right-click selection. That game's panel was on the right; this version puts the same interaction ideas on the left as requested, using our own icons and styling.

- The four large bottom weapon cards become a compact strip on the left. The angle/power readout remains at the bottom, with more of the terrain visible. Short windows use a small two-column quick strip.
- Q, the Arsenal button or a right-click on the battlefield opens the left panel. A right-drag still pans; only a click without a drag opens the kit. Browsing pauses the turn and sound while keeping the battlefield sharp and visible.
- The panel has compact four-column icon rows grouped by Artillery, Firearms, Explosives and Utilities. Tile corners show ammo and quick-slot numbers. Selection is outlined; unavailable equipment is dimmed and cannot be equipped.
- Hover or keyboard focus shows the weapon name, handling, damage/range and availability below the grid. Arrows navigate tiles, Home/End reach the first/last item, and Enter equips. Q, Escape, right-click or the close button dismisses the panel; clicking outside also dismisses it.
- Search and a category selector handle larger catalogs. The equipment area scrolls inside the panel, keeping search, details and close controls accessible. Adding weapon definitions fills additional rows rather than enlarging the panel or bottom controls. This release still contains twelve working items.
- Choosing equipment consumes no ammo and does not fire. Items outside the existing quick selection take slot 4. Canvas focus returns on close, and opening/closing cancels held movement and charge inputs.

## Validation

`npm run check` passes 77 tests, TypeScript/build and the publication privacy scan. Tests cover six supported starting worms, team stocks, survivor rotation, round-12 sudden death, exact saves for all supported team sizes, 768 generated fields, and complete 2v2 and 3v3 AI matches on three seeds each. Existing collision, projectile, practice and worker tests also pass.

The local production browser verified the six-name setup, continuing an earlier 4v4 save, a fresh 3v3 start, all twelve icons at 1280×720, scrolling at 1024×600, search/no-result recovery, category filtering, arrow/Home/End navigation, disabled medkit selection, right-click opening, and Enter-to-equip followed by F-to-fire. The turn clock stayed at 45 seconds throughout browsing, and equipping left ammo and shot counts unchanged.

Final recordings, human balance testing, the full browser matrix and hosted launch checks remain in the [release record](RELEASE.md).
