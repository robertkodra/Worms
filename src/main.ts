import "./style.css";
import {
  Game,
  STEP,
  Weapon,
  WEAPONS,
  ShotPlan,
  planShots,
  clamp,
  GameEvent,
} from "./game/simulation";
import { WEAPON_IDS, QUICK_DEFAULT, CATEGORIES } from "./game/weapons";
import { planMovement, executeMove, Route } from "./game/ai";
import { BANTER, chatterEvent, chatterKey } from "./banter";
import { GameScene } from "./render/scene";
import { wormArt } from "./render/art";
import { AudioBus } from "./audio";
import { registerGameTools } from "./webmcp";

const ICONS = {
  sound:
    '<path d="M11 5 6 9H3v6h3l5 4z"/><path d="M15 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/>',
  muted: '<path d="M11 5 6 9H3v6h3l5 4zM16 9l5 6m0-6-5 6"/>',
  help: '<circle cx="12" cy="12" r="9"/><path d="M9.5 8.5a2.6 2.6 0 0 1 5 1c0 2-2.5 2-2.5 4M12 16.5v.1"/>',
  pause: '<path d="M8 5v14M16 5v14"/>',
  arrow: '<path d="M4 12h15m-6-6 6 6-6 6"/>',
  skip: '<path d="m5 5 9 7-9 7zM18 5v14"/>',
  target:
    '<circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="2"/><path d="M12 2v4m0 12v4M2 12h4m12 0h4"/>',
};
const svg = (name: keyof typeof ICONS) =>
  `<svg viewBox="0 0 24 24" aria-hidden="true">${ICONS[name]}</svg>`;
const root = document.querySelector<HTMLDivElement>("#app")!;
root.innerHTML = `<main class="shell">
  <header class="topbar">
    <div class="brand"><div class="brand-icon"><img id="brand-worm" alt="" /></div><div><div class="brand-word">BURROW <span>BRAWL</span></div><div class="edition">A small territorial dispute</div></div></div>
    <div class="top-status"><i class="live-dot"></i><strong>THE GARDEN AFTER HOURS</strong></div>
    <div class="top-actions"><span class="seed-label">FIELD <b id="field-seed">41823</b></span><button class="icon-button" id="sound-button" aria-label="Mute sound" title="Sound">${svg("sound")}</button><button class="icon-button" id="help-button" aria-label="How to play" title="How to play">${svg("help")}</button><button class="icon-button" id="pause-button" aria-label="Pause game" title="Pause game">${svg("pause")}</button></div>
  </header>
  <section class="battlefield" id="battlefield" aria-label="Game battlefield">
    <div class="labels" id="labels" aria-hidden="true"></div>
    <div class="field-top">
      <div class="team-card"><div class="team-heading"><span><span class="team-symbol">▲ </span> THE ROOT CREW</span><strong id="team-hp-0">200</strong></div><div class="team-bars"><i><b id="hp-0" style="width:100%"></b></i><i><b id="hp-1" style="width:100%"></b></i></div><div class="team-subtitle">Pip & Miso · Your crew</div></div>
      <div class="match-center"><div class="wind"><span class="wind-arrow" id="wind-arrow">→</span><strong id="wind-value">12</strong><span>WIND</span></div><div class="round-label" id="round-label">ROUND 01</div><div class="turn-banner hidden" id="turn-banner"><span class="time" id="timer">45</span><div class="turn-caption"><span id="turn-caption">Your move</span><small id="turn-detail">Pip is up</small></div></div></div>
      <div class="team-card enemy"><div class="team-heading"><strong id="team-hp-1">200</strong><span>THE NIGHT SHIFT <span class="team-symbol"> ◆</span></span></div><div class="team-bars"><i><b id="hp-2" style="width:100%"></b></i><i><b id="hp-3" style="width:100%"></b></i></div><div class="team-subtitle">Moss & Grub · Computer</div></div>
    </div>
    <div class="banter" id="banter" role="status" aria-live="polite"></div>
    <div class="field-tag" id="map-layout">Moonlit garden / skirmish</div>
    <div class="dock-area"><div class="aim-readout" id="aim-readout"><span>ANGLE <strong id="angle-readout">45°</strong></span><span>POWER <strong id="power-value">70%</strong><span class="power-track"><i id="power-bar"></i></span></span><span class="readout-note" id="weapon-hint">Hold F or click to charge</span></div><div class="weapon-dock" id="weapon-dock"></div></div>
    <div class="toast" id="toast" role="status"></div>
  </section>
  <footer class="controls-line"><span><kbd>A / D</kbd> Move <span class="spacer">·</span><kbd>Space</kbd> Jump <span class="spacer">·</span> Pointer Aim <span class="spacer">·</span> Hold <kbd>F</kbd> Fire <span class="spacer">·</span><kbd>1–4</kbd> Items <span class="spacer">·</span><kbd>Q</kbd> Arsenal <span class="camera-help"><span class="spacer">·</span> Scroll Zoom <span class="spacer">·</span><kbd>R</kbd> Recenter</span></span><a class="studio" href="/credits.html" target="_blank" rel="noopener">CREDITS / PROTOTYPE 02</a></footer>
</main>
<dialog id="start-dialog" aria-labelledby="start-title"><div class="dialog-inner"><div class="eyebrow">Welcome to the garden</div><h1 class="title-heading" id="start-title">Little worms.<br><em>Big grudges.</em></h1><p class="dialog-description">Two worms on your side. Two with other ideas.<br>Judge the wind, pick your shot, and leave your mark on the landscape.</p><div class="start-meta"><span><i></i> You vs. computer</span><span><i></i> 12 ways to cause trouble</span></div><div class="start-actions"><button class="primary-button" id="start-button">Start skirmish ${svg("arrow")}</button><button class="secondary-button" id="start-help">A quick field guide</button></div></div><div class="dialog-foot"><label for="seed-input">Battlefield seed <input id="seed-input" inputmode="numeric" type="number" min="1" max="999999" value="41823" /></label><button class="shuffle-button" id="shuffle-seed">Shuffle field ↻</button></div></dialog>
<dialog id="pause-dialog" aria-labelledby="pause-title"><div class="dialog-inner"><div class="eyebrow">Taking a breather</div><h2 class="dialog-heading" id="pause-title">The garden can wait.</h2><p class="dialog-description">Your turn is right where you left it.</p><label class="settings-row">Sound effects<input type="checkbox" id="sound-setting" checked /></label><label class="settings-row">Worm voices<input type="checkbox" id="voice-setting" checked /></label><label class="settings-row">Voice volume<input type="range" id="voice-volume" min="0" max="100" value="70" /></label><div class="voice-preview-row"><p class="voice-note" id="voice-note">30 original spoken quips. Captions always on.</p><button class="shuffle-button" id="test-voice">Test voice</button></div><label class="settings-row">Reduce motion and screen shake<input type="checkbox" id="motion-setting" /></label><div class="dialog-buttons"><button class="primary-button" id="resume-button">Back to the garden ${svg("arrow")}</button><button class="secondary-button" id="restart-button">Restart this battlefield</button><button class="secondary-button" id="new-button">New battlefield</button></div></div></dialog>
<dialog id="help-dialog" aria-labelledby="help-title"><button class="dialog-dismiss" id="close-help" aria-label="Close field guide">×</button><div class="dialog-inner"><div class="eyebrow">The field guide</div><h2 class="dialog-heading" id="help-title">Aim small. Think big.</h2><p class="dialog-description">Take out the other crew. You get 45 seconds to move and attack, then 5 seconds to get out of trouble.</p><div class="help-list"><div><kbd>A / D or ← / →</kbd>Inch left / right</div><div><kbd>Space · Shift + Space</kbd>Jump · backward high jump</div><div><kbd>Pointer or ↑ / ↓</kbd>Set your aim</div><div><kbd>Hold F or left mouse</kbd>Charge; release to fire</div><div><kbd>1 · 2 · 3 · 4</kbd>Your four quick slots</div><div><kbd>Q</kbd>Open the full arsenal · turn pauses</div><div><kbd>Right-drag · Wheel · R</kbd>Pan · zoom · recenter</div></div><p class="help-note">Browse the Arsenal for handling, damage and ammo. Grenades split or bounce; rifles fire straight. Drop TNT and run. Select an item to put it in quick slot 4. New battlefields shuffle the layout; the same seed always recreates it. Water is fatal. Watch the wind—and mind your own crew.</p><div class="dialog-buttons"><button class="primary-button" id="help-done">Got it ${svg("arrow")}</button></div></div></dialog>
<dialog id="result-dialog" aria-labelledby="result-title"><div class="dialog-inner"><div class="eyebrow" id="result-eyebrow">The dust has settled</div><h2 class="dialog-heading" id="result-title">A small, decisive victory.</h2><p class="dialog-description" id="result-copy"></p><div class="stats-grid"><div><b id="stat-rounds">0</b><span>ROUNDS</span></div><div><b id="stat-shots">0</b><span>SHOTS</span></div><div><b id="stat-craters">0</b><span>NEW CRATERS</span></div></div><div class="dialog-buttons"><button class="primary-button" id="rematch-button">Same field. Settle the score. ${svg("arrow")}</button><button class="secondary-button" id="result-new">New battlefield</button></div></div></dialog>
<dialog id="arsenal-dialog" class="arsenal-dialog" aria-labelledby="arsenal-title"><div class="arsenal-header"><div><div class="eyebrow">The equipment shed</div><h2 id="arsenal-title">Small arms. Big ideas.</h2></div><button class="icon-button" id="close-arsenal" aria-label="Close arsenal">×</button></div><div class="arsenal-toolbar"><input type="search" id="arsenal-search" placeholder="Find a weapon or tool…" aria-label="Search arsenal" /><span class="arsenal-count" id="arsenal-count">12 ITEMS</span></div><div class="arsenal-categories" id="arsenal-categories" aria-label="Weapon categories"></div><div class="arsenal-grid" id="arsenal-grid" aria-label="Available equipment"></div><div class="arsenal-detail" id="arsenal-detail" aria-live="polite"></div><div class="arsenal-foot"><span>Turn paused while you browse.</span><span>Select to equip · new items use slot 4</span></div></dialog>`;

const el = <T extends HTMLElement = HTMLElement>(id: string) =>
  document.getElementById(id) as T;
const dialogs = ["start", "pause", "help", "result", "arsenal"].map((s) =>
  el<HTMLDialogElement>(`${s}-dialog`),
);
const field = el("battlefield"),
  audio = new AudioBus();
let game = new Game(1 + Math.floor(Math.random() * 999999)),
  scene: GameScene;
try {
  scene = new GameScene(field, el("labels"));
} catch {
  root.innerHTML =
    '<main class="compatibility"><h1>This garden needs WebGL 2.</h1><p>Please try a current desktop browser with hardware acceleration enabled.</p></main>';
  throw new Error("WebGL 2 unavailable");
}
el<HTMLImageElement>("brand-worm").src = wormArt(0).toDataURL();
const kinds = WEAPON_IDS;
let quickSlots = [...QUICK_DEFAULT];
function buildDock(): void {
  el("weapon-dock").innerHTML =
    quickSlots
      .map(
        (kind, i) =>
          `<button class="weapon" id="quick-${i}" data-weapon="${kind}" aria-label="${WEAPONS[kind].name}" aria-pressed="false" title="${WEAPONS[kind].hint}"><span class="key">${i + 1}</span><span class="stock" id="quick-stock-${i}"></span><img src="${scene.icons[kind]}" alt="" /><span class="weapon-name">${WEAPONS[kind].short}</span></button>`,
      )
      .join("") +
    `<button class="arsenal-button" id="arsenal-button" aria-label="Open arsenal" title="Full arsenal (Q)"><span class="arsenal-glyph">▦</span><strong>ARSENAL</strong><small>Q · ${kinds.length} ITEMS</small></button><button class="skip-button" id="skip-button" aria-label="End turn" title="End turn">${svg("skip")}<small>SKIP</small></button>`;
  quickSlots.forEach(
    (kind, i) => (el(`quick-${i}`).onclick = () => selectWeapon(kind)),
  );
  el("arsenal-button").onclick = openArsenal;
  el("skip-button").onclick = () => {
    if (canAct()) {
      game.endTurn();
      cancelInput();
    }
  };
}

let running = false,
  paused = false,
  weapon: Weapon = "rocket",
  angle = -Math.PI / 4,
  power = 0.7,
  charging = false,
  charge = 0;
let target = { x: 360, y: 455 },
  pointerKnown = false,
  keys = new Set<string>(),
  dragging = false,
  dragX = 0,
  dragY = 0;
let accumulator = 0,
  lastTime = 0,
  lastHud = 0,
  lastTurn = -1;
let planner: Generator<ShotPlan, ShotPlan> | null = null,
  aiBest: ShotPlan | null = null,
  aiReady = false,
  aiAge = 0,
  aiAim = -Math.PI * 0.75;
let aiRoute: Route | null = null,
  aiRouteIndex = 0,
  aiRetreat: Route | null = null,
  aiRetreatIndex = 0;
let arsenalOpen = false,
  arsenalCategory = "All";
const lineCounts: Record<string, number> = {};
let toastUntil = 0,
  banterUntil = 0,
  lastBanter = -10000;
let helpReturn: "start" | "pause" | "game" = "start";
let resultShown = false,
  wasHidden = false;

function storeSettings(): void {
  try {
    localStorage.setItem(
      "burrow-settings-v1",
      JSON.stringify({
        muted: audio.muted,
        voices: audio.voicesEnabled,
        voiceVolume: audio.voiceVolume,
        reduced: scene.reducedMotion,
      }),
    );
  } catch {
    /* Storage is optional for a local match. */
  }
}
try {
  const saved = JSON.parse(localStorage.getItem("burrow-settings-v1") ?? "{}");
  audio.setMuted(saved.muted === true);
  audio.setVoices(saved.voices !== false);
  audio.setVoiceVolume(
    typeof saved.voiceVolume === "number" ? saved.voiceVolume : 0.7,
  );
  scene.reducedMotion =
    saved.reduced === true ||
    matchMedia("(prefers-reduced-motion: reduce)").matches;
} catch {}
function syncSettings(): void {
  el("sound-button").innerHTML = svg(audio.muted ? "muted" : "sound");
  el("sound-button").setAttribute(
    "aria-label",
    audio.muted ? "Enable sound" : "Mute sound",
  );
  el<HTMLInputElement>("sound-setting").checked = !audio.muted;
  el<HTMLInputElement>("voice-setting").checked = audio.voicesEnabled;
  el<HTMLInputElement>("voice-volume").value = String(
    Math.round(audio.voiceVolume * 100),
  );
  el("voice-note").textContent =
    "30 original spoken quips. Captions always on.";
  el<HTMLInputElement>("motion-setting").checked = scene.reducedMotion;
}
syncSettings();
function closeDialogs(): void {
  dialogs.forEach((d) => d.close());
  arsenalOpen = false;
}
function cancelInput(): void {
  keys.clear();
  charging = false;
  charge = 0;
  dragging = false;
  accumulator = 0;
}
function pause(): void {
  if (!running || game.phase === "over") return;
  paused = true;
  cancelInput();
  audio.suspend();
  syncSettings();
  closeDialogs();
  el<HTMLDialogElement>("pause-dialog").showModal();
}
function resume(): void {
  closeDialogs();
  paused = false;
  cancelInput();
  audio.unlock();
  field.querySelector("canvas")?.focus();
}
function showHelp(): void {
  helpReturn = el<HTMLDialogElement>("start-dialog").open
    ? "start"
    : paused
      ? "pause"
      : "game";
  paused = true;
  cancelInput();
  audio.suspend();
  closeDialogs();
  el<HTMLDialogElement>("help-dialog").showModal();
}
function closeHelp(): void {
  el<HTMLDialogElement>("help-dialog").close();
  if (helpReturn === "start") {
    paused = false;
    el<HTMLDialogElement>("start-dialog").showModal();
  } else if (helpReturn === "pause")
    el<HTMLDialogElement>("pause-dialog").showModal();
  else resume();
}
function showToast(text: string): void {
  el("toast").textContent = text;
  toastUntil = performance.now() + 2300;
  el("toast").classList.add("show");
}
function say(event: GameEvent): void {
  const now = performance.now(),
    key = chatterKey(event);
  if (!BANTER[key] || (key === "turn" && now - lastBanter < 6000)) return;
  const worm = game.worms.find((w) => w.id === event.actor) ?? game.active;
  const lines = BANTER[key],
    index = lineCounts[key] ?? game.seed % lines.length;
  const line = lines[index % lines.length];
  lineCounts[key] = index + 1;
  el("banter").replaceChildren();
  const b = document.createElement("b");
  b.textContent = worm.name;
  el("banter").append(b, document.createTextNode(line));
  el("banter").classList.add("show");
  banterUntil = now + 4300;
  lastBanter = now;
  audio.speak(
    line,
    worm.id,
    `/audio/voices/${key}-${index % lines.length}.wav`,
  );
}
function describeItem(kind: Weapon): void {
  const def = WEAPONS[kind];
  el("arsenal-detail").innerHTML =
    `<strong>${def.name}</strong><span>${def.damage} <i>·</i> ${def.range}</span><p>${def.hint}</p>`;
}
function renderArsenal(): void {
  const query = el<HTMLInputElement>("arsenal-search")
    .value.trim()
    .toLowerCase();
  const visible = kinds.filter(
    (k) =>
      (arsenalCategory === "All" || WEAPONS[k].category === arsenalCategory) &&
      `${WEAPONS[k].name} ${WEAPONS[k].short} ${WEAPONS[k].hint}`
        .toLowerCase()
        .includes(query),
  );
  el("arsenal-count").textContent = `${visible.length} / ${kinds.length} ITEMS`;
  el("arsenal-categories").innerHTML = ["All", ...CATEGORIES]
    .map(
      (category) =>
        `<button data-category="${category}" aria-pressed="${category === arsenalCategory}">${category}</button>`,
    )
    .join("");
  el("arsenal-grid").innerHTML = visible.length
    ? visible
        .map((k) => {
          const def = WEAPONS[k],
            stock = game.inventory[0][k],
            unavailable =
              stock === 0 || (k === "medkit" && game.active.hp >= 100);
          return `<button class="arsenal-item ${k === weapon ? "selected" : ""}" data-item="${k}" aria-label="${def.name}${unavailable ? ", unavailable" : ""}" aria-disabled="${unavailable}" aria-pressed="${k === weapon}" style="--item-color:${def.color}"><span class="item-category">${def.category}</span><span class="item-ammo">${stock < 0 ? "∞" : stock === 0 ? "EMPTY" : `×${stock}`}</span><img src="${scene.icons[k]}" alt="" /><strong>${def.name}</strong><small>${def.damage}</small>${k === "medkit" && game.active.hp >= 100 ? '<span class="item-unavailable">Already at full health</span>' : ""}</button>`;
        })
        .join("")
    : '<p class="arsenal-empty">Nothing in this shed matches. Try a different name or category.</p>';
  if (visible.length)
    describeItem(visible.includes(weapon) ? weapon : visible[0]);
  else
    el("arsenal-detail").textContent =
      "Try another search, or choose All to browse the full kit.";
}
function openArsenal(): void {
  if (!canAct()) return;
  arsenalOpen = true;
  cancelInput();
  audio.suspend();
  arsenalCategory = "All";
  el<HTMLInputElement>("arsenal-search").value = "";
  renderArsenal();
  describeItem(weapon);
  el<HTMLDialogElement>("arsenal-dialog").showModal();
}
function closeArsenal(): void {
  el<HTMLDialogElement>("arsenal-dialog").close();
  arsenalOpen = false;
  cancelInput();
  audio.unlock();
  gameCanvas.focus();
}
function randomSeed(previous: number): number {
  let seed = 1 + Math.floor(Math.random() * 999995);
  if (seed % 4 === previous % 4) seed++;
  return seed;
}
function start(seed = Number(el<HTMLInputElement>("seed-input").value)): void {
  closeDialogs();
  audio.stopVoices();
  game = new Game(
    clamp(Math.floor(Number.isFinite(seed) ? seed : 41823), 1, 999999),
  );
  running = true;
  paused = false;
  resultShown = false;
  lastTurn = -1;
  lastBanter = -10000;
  weapon = "rocket";
  angle = -Math.PI / 4;
  power = 0.7;
  target = { x: game.active.x + 80, y: game.active.y - 10 };
  pointerKnown = false;
  cancelInput();
  scene.reset();
  audio.unlock();
  el("field-seed").textContent = String(game.seed);
  el("map-layout").textContent = `${game.terrain.layout} / skirmish`;
  el<HTMLInputElement>("seed-input").value = String(game.seed);
  field.classList.add("playing");
  el("banter").classList.remove("show");
  el("toast").classList.remove("show");
  field.querySelector("canvas")?.focus();
  updateHud();
}
function selectWeapon(next: Weapon): void {
  if (!canAct()) return;
  weapon = next;
  charging = false;
  charge = 0;
  if (WEAPONS[next].mode === "place" && !pointerKnown)
    target = {
      x: game.active.x + game.active.facing * 74,
      y: game.active.y - 17,
    };
  updateHud();
}
function canAct(): boolean {
  return (
    running &&
    !paused &&
    !arsenalOpen &&
    game.active.team === 0 &&
    game.active.hp > 0 &&
    game.phase === "aim"
  );
}
function beginCharge(): void {
  if (!canAct()) return;
  charging = true;
  charge = 0;
  audio.unlock();
}
function fire(): void {
  if (!charging) return;
  charging = false;
  if (!canAct()) return;
  const amount = charge < 0.09 ? power : clamp(0.15 + charge / 1.55, 0.15, 1);
  if (
    WEAPONS[weapon].mode === "place" &&
    !game.canPlace(weapon, target.x, target.y).valid
  ) {
    showToast(game.canPlace(weapon, target.x, target.y).reason);
    return;
  }
  if (game.attack(weapon, angle, amount, target)) {
    power = amount;
    cancelInput();
  } else showToast("That item is not available.");
}
function startAi(): void {
  planner = null;
  aiRoute = planMovement(game);
  aiRouteIndex = 0;
  aiRetreat = null;
  aiRetreatIndex = 0;
  aiBest = null;
  aiReady = false;
  aiAge = 0;
  aiAim = -Math.PI * 0.75;
}
function updateAi(dt: number): void {
  if (game.active.team !== 1 || game.phase !== "aim") return;
  if (aiRoute && aiRouteIndex < aiRoute.commands.length) return;
  if (!game.active.grounded) return;
  if (!planner && !aiReady) planner = planShots(game);
  aiAge += dt;
  if (planner && !aiReady) {
    const deadline = performance.now() + 4;
    while (performance.now() < deadline) {
      const item = planner.next();
      aiBest = item.value;
      if (item.done) {
        aiReady = true;
        planner = null;
        break;
      }
    }
  }
  if (aiBest) {
    const difference = Math.atan2(
      Math.sin(aiBest.angle - aiAim),
      Math.cos(aiBest.angle - aiAim),
    );
    aiAim += difference * Math.min(1, dt * 4);
  }
  if (aiAge > 1.35 && aiReady && aiBest) {
    // Small fixed policy error; no trajectory correction or altered damage.
    const aimError = (game.random() - 0.5) * 0.018;
    const powerError = (game.random() - 0.5) * 0.012;
    const attacked = game.attack(
      aiBest.weapon,
      aiBest.angle + aimError,
      clamp(aiBest.power + powerError, 0.15, 1),
      aiBest.target,
    );
    if (attacked) {
      aiRetreat = planMovement(game, true);
      aiRetreatIndex = 0;
    } else game.endTurn();
  } else if (aiAge > 5.0) {
    if (aiBest)
      game.attack(aiBest.weapon, aiBest.angle, aiBest.power, aiBest.target);
    else game.endTurn();
    planner = null;
  }
}
function updateHud(): void {
  for (const w of game.worms) el(`hp-${w.id}`).style.width = `${w.hp}%`;
  [0, 1].forEach(
    (team) =>
      (el(`team-hp-${team}`).textContent = String(
        game.worms
          .filter((w) => w.team === team)
          .reduce((sum, w) => sum + w.hp, 0),
      )),
  );
  el("wind-arrow").textContent = game.wind < 0 ? "←" : "→";
  el("wind-value").textContent = String(Math.abs(game.wind));
  el("round-label").textContent =
    `ROUND ${String(game.round).padStart(2, "0")}${game.round > 10 ? " · RISING WATER" : ""}`;
  const mine = game.active.team === 0;
  const banner = el("turn-banner");
  banner.classList.toggle("hidden", !running || game.phase === "over");
  banner.classList.toggle("ai", !mine);
  const seconds = Math.ceil(
    (game.phase === "retreat" ? game.retreatTicks : game.turnTicks) / 60,
  );
  banner.classList.toggle("urgent", seconds <= 10);
  el("timer").textContent =
    game.phase === "settle"
      ? "··"
      : String(Math.max(0, seconds)).padStart(2, "0");
  el("turn-caption").textContent =
    game.phase === "retreat"
      ? "Make yourself scarce!"
      : game.phase === "settle"
        ? "Let the dust settle"
        : mine
          ? "Your move"
          : "Their move";
  el("turn-detail").textContent =
    game.phase === "retreat"
      ? "A little distance helps"
      : mine
        ? `${game.active.name} is up`
        : `${game.active.name} · ${aiRoute && aiRouteIndex < aiRoute.commands.length ? aiRoute.label.toLowerCase() : "lining up a shot"}`;
  quickSlots.forEach((k, i) => {
    const b = el<HTMLButtonElement>(`quick-${i}`);
    b.disabled =
      !canAct() ||
      game.inventory[game.active.team][k] === 0 ||
      (k === "medkit" && game.active.hp >= 100);
    b.classList.toggle("selected", k === weapon);
    b.setAttribute("aria-pressed", String(k === weapon));
    const count = game.inventory[running ? game.active.team : 0][k];
    el(`quick-stock-${i}`).textContent = count < 0 ? "∞" : String(count);
  });
  el<HTMLButtonElement>("arsenal-button").disabled = !canAct();
  el("aim-readout").classList.toggle(
    "no-power",
    WEAPONS[weapon].mode !== "lob",
  );
  el<HTMLButtonElement>("skip-button").disabled = !canAct();
  const shownPower = charging ? clamp(0.15 + charge / 1.55, 0.15, 1) : power;
  el("angle-readout").textContent =
    `${Math.round((Math.abs(angle) * 180) / Math.PI)}°`;
  el("power-value").textContent = `${Math.round(shownPower * 100)}%`;
  el("power-bar").style.width = `${shownPower * 100}%`;
  el("aim-readout").classList.toggle("charging", charging);
  el("weapon-hint").textContent = !running
    ? "A little artillery. A lot of consequences."
    : !mine
      ? "The other lot are plotting…"
      : game.phase === "retreat"
        ? "A / D + Space · Time to move"
        : game.phase === "settle"
          ? "Every action has consequences"
          : WEAPONS[weapon].mode === "place"
            ? game.canPlace(weapon, target.x, target.y).reason
            : WEAPONS[weapon].mode === "self"
              ? `${WEAPONS[weapon].hint} Press F.`
              : WEAPONS[weapon].mode === "direct"
                ? "Aim directly · Tap F to fire"
                : weapon === "shove"
                  ? "Close range · Tap F to shove"
                  : charging
                    ? "Release to fire"
                    : `${WEAPONS[weapon].range} · Hold F to charge`;
}
function showResult(): void {
  resultShown = true;
  cancelInput();
  const win = game.winner === 0,
    draw = game.winner === -1;
  el("result-title").textContent = draw
    ? "Nobody owns this crater."
    : win
      ? "A small, decisive victory."
      : "The soil has other plans.";
  el("result-copy").textContent = draw
    ? "Both crews went down together. That calls for a rematch."
    : win
      ? "The garden is technically yours. Try to leave some of it standing next time."
      : "The Night Shift kept the field. A different angle might settle this.";
  el("stat-rounds").textContent = String(game.round);
  el("stat-shots").textContent = String(game.stats.shots);
  el("stat-craters").textContent = String(game.stats.craters);
  closeDialogs();
  el<HTMLDialogElement>("result-dialog").showModal();
}

el("start-button").onclick = () => start();
el("start-help").onclick = showHelp;
el("help-button").onclick = showHelp;
el("close-help").onclick = closeHelp;
el("help-done").onclick = closeHelp;
el("pause-button").onclick = pause;
el("resume-button").onclick = resume;
el("restart-button").onclick = () => start(game.seed);
el("rematch-button").onclick = () => start(game.seed);
el("new-button").onclick = () => start(randomSeed(game.seed));
el("result-new").onclick = () => start(randomSeed(game.seed));
el("sound-button").onclick = () => {
  audio.unlock();
  audio.setMuted(!audio.muted);
  syncSettings();
  storeSettings();
};
el<HTMLInputElement>("sound-setting").onchange = (e) => {
  audio.setMuted(!(e.target as HTMLInputElement).checked);
  syncSettings();
  storeSettings();
};
el<HTMLInputElement>("motion-setting").onchange = (e) => {
  scene.reducedMotion = (e.target as HTMLInputElement).checked;
  storeSettings();
};
el("close-arsenal").onclick = closeArsenal;
el<HTMLInputElement>("arsenal-search").oninput = renderArsenal;
el("arsenal-categories").onclick = (e) => {
  const button = (e.target as HTMLElement).closest<HTMLButtonElement>(
    "[data-category]",
  );
  if (button) {
    arsenalCategory = button.dataset.category!;
    renderArsenal();
    el("arsenal-categories")
      .querySelector<HTMLButtonElement>(`[data-category="${arsenalCategory}"]`)
      ?.focus();
  }
};
el("arsenal-grid").onclick = (e) => {
  const button = (e.target as HTMLElement).closest<HTMLButtonElement>(
    "[data-item]",
  );
  if (!button || button.getAttribute("aria-disabled") === "true") return;
  const next = button.dataset.item as Weapon;
  closeArsenal();
  if (!quickSlots.includes(next)) {
    quickSlots[3] = next;
    buildDock();
  }
  selectWeapon(next);
};
for (const type of ["pointerover", "focusin"])
  el("arsenal-grid").addEventListener(type, (e) => {
    const button = (e.target as HTMLElement).closest<HTMLButtonElement>(
      "[data-item]",
    );
    if (button) describeItem(button.dataset.item as Weapon);
  });
el("test-voice").onclick = () => audio.previewVoice();
el<HTMLInputElement>("voice-volume").oninput = (e) => {
  audio.setVoiceVolume(Number((e.target as HTMLInputElement).value) / 100);
  storeSettings();
};
el<HTMLInputElement>("voice-setting").onchange = (e) => {
  audio.setVoices((e.target as HTMLInputElement).checked);
  storeSettings();
};
el("shuffle-seed").onclick = () => {
  game = new Game(randomSeed(game.seed));
  scene.reset();
  el<HTMLInputElement>("seed-input").value = String(game.seed);
  el("field-seed").textContent = String(game.seed);
  el("map-layout").textContent = `${game.terrain.layout} / skirmish`;
};
buildDock();
el<HTMLInputElement>("seed-input").value = String(game.seed);
el("field-seed").textContent = String(game.seed);
el("map-layout").textContent = `${game.terrain.layout} / skirmish`;
dialogs.forEach((d) =>
  d.addEventListener("cancel", (e) => {
    e.preventDefault();
    if (d.id === "help-dialog") closeHelp();
    else if (d.id === "pause-dialog") resume();
    else if (d.id === "arsenal-dialog") closeArsenal();
  }),
);

const gameCanvas = field.querySelector("canvas")!;
gameCanvas.tabIndex = 0;
gameCanvas.addEventListener("contextmenu", (e) => e.preventDefault());
gameCanvas.addEventListener("pointerdown", (e) => {
  if (!running || paused) return;
  gameCanvas.focus();
  target = scene.screenToWorld(e.clientX, e.clientY);
  pointerKnown = true;
  if (e.button === 2) {
    dragging = true;
    dragX = e.clientX;
    dragY = e.clientY;
    gameCanvas.setPointerCapture(e.pointerId);
  } else if (e.button === 0) {
    if (canAct()) {
      angle = Math.atan2(
        target.y - (game.active.y - 18),
        target.x - game.active.x,
      );
      beginCharge();
      gameCanvas.setPointerCapture(e.pointerId);
    }
  }
});
gameCanvas.addEventListener("pointermove", (e) => {
  if (dragging) {
    scene.pan(e.clientX - dragX, e.clientY - dragY);
    dragX = e.clientX;
    dragY = e.clientY;
    return;
  }
  target = scene.screenToWorld(e.clientX, e.clientY);
  pointerKnown = true;
  if (canAct()) {
    angle = Math.atan2(
      target.y - (game.active.y - 18),
      target.x - game.active.x,
    );
    game.active.facing = Math.cos(angle) < 0 ? -1 : 1;
  }
});
gameCanvas.addEventListener("pointerup", (e) => {
  if (e.button === 2) dragging = false;
  else if (e.button === 0) fire();
  if (gameCanvas.hasPointerCapture(e.pointerId))
    gameCanvas.releasePointerCapture(e.pointerId);
});
gameCanvas.addEventListener("pointercancel", cancelInput);
gameCanvas.addEventListener(
  "wheel",
  (e) => {
    e.preventDefault();
    if (running && !paused)
      scene.zoomBy(e.deltaY, scene.screenToWorld(e.clientX, e.clientY));
  },
  { passive: false },
);
window.addEventListener("keydown", (e) => {
  if (e.code === "Escape") {
    e.preventDefault();
    if (arsenalOpen) closeArsenal();
    else if (el<HTMLDialogElement>("help-dialog").open) closeHelp();
    else if (el<HTMLDialogElement>("pause-dialog").open) resume();
    else if (running && !paused) pause();
    return;
  }
  if (e.target instanceof HTMLInputElement) return;
  if (e.code === "KeyQ" && !e.repeat) {
    e.preventDefault();
    if (arsenalOpen) closeArsenal();
    else openArsenal();
    return;
  }
  if (!running || paused || arsenalOpen || game.phase === "over") return;
  if (
    e.target instanceof HTMLButtonElement &&
    ["Space", "Enter"].includes(e.code)
  )
    return;
  if (
    [
      "Space",
      "ArrowUp",
      "ArrowDown",
      "ArrowLeft",
      "ArrowRight",
      "KeyF",
    ].includes(e.code)
  )
    e.preventDefault();
  keys.add(e.code);
  if (e.repeat) return;
  if (e.code === "Space" && game.active.team === 0) game.jump(e.shiftKey);
  if (e.code === "KeyF") beginCharge();
  if (e.code === "KeyR") scene.recenter(game, e.shiftKey);
  const slot = ["Digit1", "Digit2", "Digit3", "Digit4"].indexOf(e.code);
  if (slot >= 0) selectWeapon(quickSlots[slot]);
});
window.addEventListener("keyup", (e) => {
  keys.delete(e.code);
  if (e.code === "KeyF") fire();
});
window.addEventListener("blur", () => {
  cancelInput();
  if (running && !paused && game.phase !== "over") pause();
});
document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    wasHidden = true;
    cancelInput();
    if (running && !paused && game.phase !== "over") pause();
  } else if (wasHidden) {
    lastTime = performance.now();
    wasHidden = false;
  }
});
gameCanvas.addEventListener("webglcontextlost", (e) => {
  e.preventDefault();
  pause();
  showToast("Graphics paused. Restore the browser window to continue.");
});
gameCanvas.addEventListener("webglcontextrestored", () =>
  showToast("Graphics restored. Resume when you are ready."),
);

function frame(time: number): void {
  const dt = Math.min(0.06, (time - lastTime) / 1000 || STEP);
  lastTime = time;
  if (running && !paused && !arsenalOpen && game.phase !== "over") {
    if (lastTurn !== game.turn) {
      lastTurn = game.turn;
      weapon = "rocket";
      angle = game.active.facing > 0 ? -Math.PI / 4 : (-Math.PI * 3) / 4;
      charging = false;
      if (game.active.team === 1) startAi();
      say({
        type: "turn",
        x: game.active.x,
        y: game.active.y,
        actor: game.activeId,
      });
    }
    if (charging) charge = Math.min(1.4, charge + dt);
    if (canAct()) {
      const adjust =
        (keys.has("ArrowUp") ? -1 : 0) + (keys.has("ArrowDown") ? 1 : 0);
      if (adjust) angle += adjust * dt * 0.8;
    }
    updateAi(dt);
    accumulator += dt;
    let count = 0;
    while (accumulator >= STEP && count++ < 5) {
      if (game.active.team === 0 && game.acting)
        game.move(
          (keys.has("KeyD") || keys.has("ArrowRight") ? 1 : 0) -
            (keys.has("KeyA") || keys.has("ArrowLeft") ? 1 : 0),
        );
      if (game.active.team === 1) {
        if (
          aiRoute &&
          game.phase === "aim" &&
          aiRoute.terrainRevision !== game.terrain.revision
        ) {
          aiRoute = planMovement(game);
          aiRouteIndex = 0;
          planner = null;
          aiReady = false;
          aiBest = null;
          aiAge = 0;
        }
        if (
          aiRetreat &&
          game.phase === "retreat" &&
          aiRetreat.terrainRevision !== game.terrain.revision
        ) {
          aiRetreat = planMovement(game, true);
          aiRetreatIndex = 0;
        }

        if (
          game.phase === "aim" &&
          aiRoute &&
          aiRouteIndex < aiRoute.commands.length
        )
          executeMove(game, aiRoute.commands[aiRouteIndex++]);
        else if (
          game.phase === "retreat" &&
          aiRetreat &&
          aiRetreatIndex < aiRetreat.commands.length
        )
          executeMove(game, aiRetreat.commands[aiRetreatIndex++]);
      }
      game.tick();
      accumulator -= STEP;
      if (game.winner !== null) break;
    }
    if (count > 5) accumulator = 0;
    for (const event of game.events) {
      scene.event(event);
      audio.event(event);
    }
    const chatter = chatterEvent(game.events);
    if (chatter) say(chatter);
    game.events = [];
  }
  const displayAngle = game.active.team === 1 ? aiAim : angle;
  scene.render(
    game,
    displayAngle,
    game.active.team === 1 ? (aiBest?.weapon ?? "rocket") : weapon,
    target,
    time,
    running && !paused && !arsenalOpen,
  );
  if (time - lastHud > 65) {
    updateHud();
    lastHud = time;
  }
  if (time > toastUntil) el("toast").classList.remove("show");
  if (time > banterUntil) el("banter").classList.remove("show");
  if (game.phase === "over" && !resultShown) showResult();
  requestAnimationFrame(frame);
}
el<HTMLDialogElement>("start-dialog").showModal();
requestAnimationFrame(frame);

// Read-only inspection supports browser smoke tests; no cheat controls are
// exposed in production. Tests exercise normal input and the pure simulation.
if (import.meta.env.DEV) {
  Object.defineProperty(window, "__burrow", {
    configurable: true,
    get: () => ({
      seed: game.seed,
      phase: game.phase,
      turn: game.turn,
      active: game.activeId,
      team: game.active.team,
      turnTicks: game.turnTicks,
      retreatTicks: game.retreatTicks,
      paused,
      running,
      weapon,
      angle,
      power,
      terrainRevision: game.terrain.revision,
      projectile: game.projectile
        ? {
            x: game.projectile.x,
            y: game.projectile.y,
            kind: game.projectile.kind,
          }
        : null,
      winner: game.winner,
      worms: game.worms.map((w) => ({
        id: w.id,
        x: w.x,
        y: w.y,
        hp: w.hp,
        grounded: w.grounded,
      })),
      stats: { ...game.stats },
    }),
  });
}

const readMatch = () => ({
  running,
  paused: paused || arsenalOpen,
  arsenalOpen,
  sound: {
    muted: audio.muted,
    voices: audio.voicesEnabled,
    voiceVolume: audio.voiceVolume,
    voicePlayback: audio.voiceState,
    clipsPlayed: audio.clipsPlayed,
  },
  layout: game.terrain.layout,
  seed: game.seed,
  turn: game.turn,
  round: game.round,
  phase: game.phase,
  active: game.activeId,
  team: game.active.team,
  secondsLeft: Math.ceil(
    (game.phase === "retreat" ? game.retreatTicks : game.turnTicks) / 60,
  ),
  wind: game.wind,
  water: game.water,
  terrainRevision: game.terrain.revision,
  projectiles: game.projectiles.map((p) => ({
    kind: p.kind,
    fuseSeconds: p.fuse > 0 ? Math.round(p.fuse / 6) / 10 : null,
    x: Math.round(p.x),
    y: Math.round(p.y),
  })),
  winner: game.winner,
  weapon,
  stats: { ...game.stats },
  worms: game.worms.map((w) => ({
    id: w.id,
    name: w.name,
    team: w.team,
    x: Math.round(w.x),
    y: Math.round(w.y),
    hp: w.hp,
  })),
  inventory: { ...game.inventory[0] },
});
const inputRecord = (input: unknown): Record<string, unknown> => {
  if (!input || typeof input !== "object" || Array.isArray(input))
    throw new Error("Expected an input object.");
  return input as Record<string, unknown>;
};
registerGameTools([
  {
    name: "read_match",
    description:
      "Read the visible local skirmish state, worm positions, health, inventory, wind, and turn. Does not advance time or alter the match.",
    inputSchema: {
      type: "object",
      properties: {},
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true, untrustedContentHint: false },
    execute: () => readMatch(),
  },
  {
    name: "start_skirmish",
    description:
      "Start or restart the local 2-versus-2 game at the given map seed. Replaces the current match, exactly like the Start/Restart buttons.",
    inputSchema: {
      type: "object",
      properties: { seed: { type: "integer", minimum: 1, maximum: 999999 } },
      required: ["seed"],
      additionalProperties: false,
    },
    execute: (input) => {
      const { seed } = inputRecord(input);
      if (
        typeof seed !== "number" ||
        !Number.isInteger(seed) ||
        seed < 1 ||
        seed > 999999
      )
        throw new Error("Seed must be an integer from 1 to 999999.");
      start(seed);
      return readMatch();
    },
  },
  {
    name: "fire_weapon",
    description:
      "Commit the human worm’s attack during its action phase, using the same ammo, terrain, and damage rules as the UI. Angle is degrees in screen coordinates: 0 right, -90 up, -180 left. Power ranges from 0.15 to 1. Bridge, teleport and airstrike also require targetX/targetY in world pixels. Direct weapons ignore power.",
    inputSchema: {
      type: "object",
      properties: {
        weapon: { type: "string", enum: kinds },
        angleDegrees: { type: "number", minimum: -180, maximum: 180 },
        power: { type: "number", minimum: 0.15, maximum: 1 },
        targetX: { type: "number" },
        targetY: { type: "number" },
      },
      required: ["weapon", "angleDegrees", "power"],
      additionalProperties: false,
    },
    execute: (input) => {
      const v = inputRecord(input);
      if (!canAct())
        throw new Error("A human action turn must be active and unpaused.");
      if (
        !kinds.includes(v.weapon as Weapon) ||
        typeof v.angleDegrees !== "number" ||
        !Number.isFinite(v.angleDegrees) ||
        Math.abs(v.angleDegrees) > 180 ||
        typeof v.power !== "number" ||
        !Number.isFinite(v.power) ||
        v.power < 0.15 ||
        v.power > 1
      )
        throw new Error("Invalid weapon, angle, or power.");
      const aim = (v.angleDegrees * Math.PI) / 180;
      const placement =
        typeof v.targetX === "number" && typeof v.targetY === "number"
          ? { x: v.targetX, y: v.targetY }
          : undefined;
      if (!game.attack(v.weapon as Weapon, aim, v.power, placement))
        throw new Error(
          "Attack rejected: check ammo, health, and placement validity.",
        );
      weapon = v.weapon as Weapon;
      if (!quickSlots.includes(weapon)) {
        quickSlots[3] = weapon;
        buildDock();
      }
      angle = aim;
      power = v.power;
      cancelInput();
      updateHud();
      return readMatch();
    },
  },
  {
    name: "end_turn",
    description:
      "End the human worm’s current unused action turn. Existing physics settle before the computer acts.",
    inputSchema: {
      type: "object",
      properties: {},
      additionalProperties: false,
    },
    execute: () => {
      if (!canAct())
        throw new Error("A human action turn must be active and unpaused.");
      game.endTurn();
      cancelInput();
      updateHud();
      return readMatch();
    },
  },
  {
    name: "set_match_paused",
    description:
      "Pause or resume the active local match through the same controls as the pause dialog.",
    inputSchema: {
      type: "object",
      properties: { paused: { type: "boolean" } },
      required: ["paused"],
      additionalProperties: false,
    },
    execute: (input) => {
      const v = inputRecord(input);
      if (typeof v.paused !== "boolean")
        throw new Error("paused must be a boolean.");
      if (!running || game.phase === "over")
        throw new Error("There is no active match.");
      if (v.paused) pause();
      else resume();
      updateHud();
      return readMatch();
    },
  },
]);
