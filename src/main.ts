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
    <div class="field-tag">Moonlit garden / skirmish</div>
    <div class="dock-area"><div class="aim-readout" id="aim-readout"><span>ANGLE <strong id="angle-readout">45°</strong></span><span>POWER <strong id="power-value">70%</strong><span class="power-track"><i id="power-bar"></i></span></span><span class="readout-note" id="weapon-hint">Hold F or click to charge</span></div><div class="weapon-dock" id="weapon-dock"></div></div>
    <div class="toast" id="toast" role="status"></div>
  </section>
  <footer class="controls-line"><span><kbd>A / D</kbd> Move <span class="spacer">·</span><kbd>Space</kbd> Jump <span class="spacer">·</span> Pointer Aim <span class="spacer">·</span> Hold <kbd>F</kbd> Fire <span class="spacer">·</span><kbd>1–4</kbd> Items <span class="camera-help"><span class="spacer">·</span> Scroll Zoom <span class="spacer">·</span><kbd>R</kbd> Recenter</span></span><a class="studio" href="/credits.html" target="_blank" rel="noopener">CREDITS / PROTOTYPE 01</a></footer>
</main>
<dialog id="start-dialog" aria-labelledby="start-title"><div class="dialog-inner"><div class="eyebrow">Welcome to the garden</div><h1 class="title-heading" id="start-title">Little worms.<br><em>Big grudges.</em></h1><p class="dialog-description">Two worms on your side. Two with other ideas.<br>Judge the wind, pick your shot, and leave your mark on the landscape.</p><div class="start-meta"><span><i></i> You vs. computer</span><span><i></i> 4 ways to cause trouble</span></div><div class="start-actions"><button class="primary-button" id="start-button">Start skirmish ${svg("arrow")}</button><button class="secondary-button" id="start-help">A quick field guide</button></div></div><div class="dialog-foot"><label for="seed-input">Battlefield seed <input id="seed-input" inputmode="numeric" type="number" min="1" max="999999" value="41823" /></label><span>LOCAL PROTOTYPE · 01</span></div></dialog>
<dialog id="pause-dialog" aria-labelledby="pause-title"><div class="dialog-inner"><div class="eyebrow">Taking a breather</div><h2 class="dialog-heading" id="pause-title">The garden can wait.</h2><p class="dialog-description">Your turn is right where you left it.</p><label class="settings-row">Sound effects<input type="checkbox" id="sound-setting" checked /></label><label class="settings-row">Reduce motion and screen shake<input type="checkbox" id="motion-setting" /></label><div class="dialog-buttons"><button class="primary-button" id="resume-button">Back to the garden ${svg("arrow")}</button><button class="secondary-button" id="restart-button">Restart this battlefield</button><button class="secondary-button" id="new-button">New battlefield</button></div></div></dialog>
<dialog id="help-dialog" aria-labelledby="help-title"><button class="dialog-dismiss" id="close-help" aria-label="Close field guide">×</button><div class="dialog-inner"><div class="eyebrow">The field guide</div><h2 class="dialog-heading" id="help-title">Aim small. Think big.</h2><p class="dialog-description">Take out the other crew. You get 45 seconds to move and attack, then 5 seconds to get out of trouble.</p><div class="help-list"><div><kbd>A / D or ← / →</kbd>Inch left / right</div><div><kbd>Space · Shift + Space</kbd>Jump · backward high jump</div><div><kbd>Pointer or ↑ / ↓</kbd>Set your aim</div><div><kbd>Hold F or left mouse</kbd>Charge; release to fire</div><div><kbd>1 · 2 · 3 · 4</kbd>Rocket · grenade · shove · bridge</div><div><kbd>Right-drag · Wheel · R</kbd>Pan · zoom · recenter</div></div><p class="help-note">Grenades have a 3-second fuse. Shoves need a nearby target. Bridges need empty space within reach. Water is fatal. Watch the wind—and mind your own crew.</p><div class="dialog-buttons"><button class="primary-button" id="help-done">Got it ${svg("arrow")}</button></div></div></dialog>
<dialog id="result-dialog" aria-labelledby="result-title"><div class="dialog-inner"><div class="eyebrow" id="result-eyebrow">The dust has settled</div><h2 class="dialog-heading" id="result-title">A small, decisive victory.</h2><p class="dialog-description" id="result-copy"></p><div class="stats-grid"><div><b id="stat-rounds">0</b><span>ROUNDS</span></div><div><b id="stat-shots">0</b><span>SHOTS</span></div><div><b id="stat-craters">0</b><span>NEW CRATERS</span></div></div><div class="dialog-buttons"><button class="primary-button" id="rematch-button">Same field. Settle the score. ${svg("arrow")}</button><button class="secondary-button" id="result-new">New battlefield</button></div></div></dialog>`;

const el = <T extends HTMLElement = HTMLElement>(id: string) =>
  document.getElementById(id) as T;
const dialogs = ["start", "pause", "help", "result"].map((s) =>
  el<HTMLDialogElement>(`${s}-dialog`),
);
const field = el("battlefield"),
  audio = new AudioBus();
let game = new Game(),
  scene: GameScene;
try {
  scene = new GameScene(field, el("labels"));
} catch {
  root.innerHTML =
    '<main class="compatibility"><h1>This garden needs WebGL 2.</h1><p>Please try a current desktop browser with hardware acceleration enabled.</p></main>';
  throw new Error("WebGL 2 unavailable");
}
el<HTMLImageElement>("brand-worm").src = wormArt(0).toDataURL();
const kinds: Weapon[] = ["rocket", "grenade", "shove", "bridge"];
el("weapon-dock").innerHTML =
  kinds
    .map(
      (kind, i) =>
        `<button class="weapon ${i === 0 ? "selected" : ""}" id="weapon-${kind}" data-weapon="${kind}" aria-label="${WEAPONS[kind].name}" aria-pressed="${i === 0}" title="${WEAPONS[kind].hint}" disabled><span class="key">${i + 1}</span><span class="stock" id="stock-${kind}">${i < 2 ? "∞" : i === 2 ? "3" : "2"}</span><img src="${scene.icons[kind]}" alt="" /><span class="weapon-name">${WEAPONS[kind].name}</span></button>`,
    )
    .join("") +
  `<button class="skip-button" id="skip-button" aria-label="End turn" title="End turn" disabled>${svg("skip")}<small>SKIP</small></button>`;

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
  lastTurn = -1,
  lastAiTick = -1;
let planner: Generator<ShotPlan, ShotPlan> | null = null,
  aiBest: ShotPlan | null = null,
  aiReady = false,
  aiAge = 0,
  aiAim = -Math.PI * 0.75;
let toastUntil = 0,
  banterUntil = 0,
  lastBanter = -10000;
let helpReturn: "start" | "pause" | "game" = "start";
let resultShown = false,
  wasHidden = false;
const sayLines: Record<string, string[]> = {
  turn: [
    "Right. Small steps.",
    "I’ve rehearsed the landing.",
    "The soil looks cooperative.",
  ],
  fire: [
    "Mind the punctuation.",
    "This seed has ambitions.",
    "A little more enthusiasm.",
  ],
  blast: [
    "Consider that landscaping.",
    "A firm garden handshake.",
    "The horizon had it coming.",
  ],
  bridge: ["A leaf of faith.", "Temporary confidence installed."],
  damage: [
    "Personal space, please.",
    "The basement is larger now.",
    "Complaint received.",
  ],
};

function storeSettings(): void {
  try {
    localStorage.setItem(
      "burrow-settings-v1",
      JSON.stringify({ muted: audio.muted, reduced: scene.reducedMotion }),
    );
  } catch {
    /* Storage is optional for a local match. */
  }
}
try {
  const saved = JSON.parse(localStorage.getItem("burrow-settings-v1") ?? "{}");
  audio.setMuted(saved.muted === true);
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
  el<HTMLInputElement>("motion-setting").checked = scene.reducedMotion;
}
syncSettings();
function closeDialogs(): void {
  dialogs.forEach((d) => d.close());
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
  const now = performance.now();
  if (now - lastBanter < 6500 || !sayLines[event.type]) return;
  const worm = game.worms.find((w) => w.id === event.actor) ?? game.active;
  const lines = sayLines[event.type];
  el("banter").replaceChildren();
  const b = document.createElement("b");
  b.textContent = worm.name;
  el("banter").append(
    b,
    document.createTextNode(
      lines[(game.turn + event.type.length) % lines.length],
    ),
  );
  el("banter").classList.add("show");
  banterUntil = now + 3300;
  lastBanter = now;
}
function start(seed = Number(el<HTMLInputElement>("seed-input").value)): void {
  closeDialogs();
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
  if (next === "bridge" && !pointerKnown)
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
  if (weapon === "bridge" && !game.canBridge(target.x, target.y).valid) {
    showToast(game.canBridge(target.x, target.y).reason);
    return;
  }
  if (game.attack(weapon, angle, amount, target)) {
    power = amount;
    cancelInput();
  } else showToast("That item is not available.");
}
function startAi(): void {
  planner = planShots(game);
  aiBest = null;
  aiReady = false;
  aiAge = 0;
  aiAim = -Math.PI * 0.75;
  lastAiTick = -1;
}
function updateAi(dt: number): void {
  if (game.active.team !== 1 || game.phase !== "aim") return;
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
    game.attack(
      aiBest.weapon,
      aiBest.angle + aimError,
      clamp(aiBest.power + powerError, 0.15, 1),
      aiBest.target,
    );
  } else if (aiAge > 3.0) {
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
        : `${game.active.name} is scheming`;
  for (const k of kinds) {
    const b = el<HTMLButtonElement>(`weapon-${k}`);
    b.disabled = !canAct() || game.inventory[game.active.team][k] === 0;
    b.classList.toggle("selected", k === weapon);
    b.setAttribute("aria-pressed", String(k === weapon));
    const count = game.inventory[running ? game.active.team : 0][k];
    el(`stock-${k}`).textContent = count < 0 ? "∞" : String(count);
  }
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
          : weapon === "bridge"
            ? game.canBridge(target.x, target.y).reason
            : weapon === "shove"
              ? "Close range · Release to shove"
              : charging
                ? "Release to fire"
                : weapon === "grenade"
                  ? "3-second fuse · Hold F to charge"
                  : "Hold F or click to charge";
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
el("new-button").onclick = () => start(1 + Math.floor(Math.random() * 999999));
el("result-new").onclick = () => start(1 + Math.floor(Math.random() * 999999));
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
kinds.forEach((k) => (el(`weapon-${k}`).onclick = () => selectWeapon(k)));
el("skip-button").onclick = () => {
  if (canAct()) {
    game.endTurn();
    cancelInput();
  }
};
dialogs.forEach((d) =>
  d.addEventListener("cancel", (e) => {
    e.preventDefault();
    if (d.id === "help-dialog") closeHelp();
    else if (d.id === "pause-dialog") resume();
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
  if (e.target instanceof HTMLInputElement) return;
  if (e.code === "Escape") {
    e.preventDefault();
    if (el<HTMLDialogElement>("help-dialog").open) closeHelp();
    else if (el<HTMLDialogElement>("pause-dialog").open) resume();
    else if (running && !paused) pause();
    return;
  }
  if (!running || paused) return;
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
  if (slot >= 0) selectWeapon(kinds[slot]);
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
  if (running && !paused && game.phase !== "over") {
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
      // A small retreat when a safe supported step is available.
      if (
        game.active.team === 1 &&
        game.phase === "retreat" &&
        lastAiTick !== game.ticks
      ) {
        lastAiTick = game.ticks;
        const w = game.active,
          dir = w.facing * -1;
        if (game.terrain.solid(w.x + dir * 16, w.y + 7)) game.move(dir);
      }
      game.tick();
      accumulator -= STEP;
      if (game.winner !== null) break;
    }
    if (count > 5) accumulator = 0;
    for (const event of game.events) {
      scene.event(event);
      audio.event(event);
      say(event);
    }
    game.events = [];
  }
  const displayAngle = game.active.team === 1 ? aiAim : angle;
  scene.render(
    game,
    displayAngle,
    game.active.team === 1 ? (aiBest?.weapon ?? "rocket") : weapon,
    target,
    time,
    running && !paused,
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
  paused,
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
      "Commit the human worm’s attack during its action phase, using the same ammo, terrain, and damage rules as the UI. Angle is degrees in screen coordinates: 0 right, -90 up, -180 left. Power ranges from 0.15 to 1. Bridge also requires targetX/targetY in world pixels.",
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
          "Attack rejected: check ammunition and bridge placement.",
        );
      weapon = v.weapon as Weapon;
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
