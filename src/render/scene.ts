import * as THREE from "three";
import { WaterEffects } from "./water";
import { Game, Weapon, GameEvent, clamp } from "../game/simulation";
import {
  WEAPON_IDS,
  WEAPONS,
  BALLISTICS,
  ProjectileKind,
} from "../game/weapons";
import { WORLD_WIDTH, WORLD_HEIGHT } from "../game/terrain";
import {
  skyArt,
  terrainArt,
  wormArt,
  weaponArt,
  projectileArt,
  puffArt,
  texture,
  COLORS,
} from "./art";

interface Particle {
  sprite: THREE.Sprite;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  size: number;
  gravity: boolean;
}
interface FloatText {
  el: HTMLDivElement;
  x: number;
  y: number;
  life: number;
}

export class GameScene {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.OrthographicCamera(
    -800,
    800,
    450,
    -450,
    0.1,
    100,
  );
  private skyMesh: THREE.Mesh;
  private terrainMesh: THREE.Mesh;
  private terrainRevision = -1;
  private terrainSource: TerrainIdentity | null = null;
  private wormSprites: THREE.Mesh<
    THREE.PlaneGeometry,
    THREE.MeshBasicMaterial
  >[] = [];
  private wormTextures: THREE.CanvasTexture[] = [];
  private labels: HTMLDivElement[] = [];
  private weapons: Record<Weapon, THREE.CanvasTexture>;
  private held: THREE.Mesh;
  private ammunition: Record<ProjectileKind, THREE.CanvasTexture>;
  private landingSquash = new Map<number, number>();
  private lastTrailTick = -1;
  private rings: { line: THREE.LineLoop; life: number; radius: number }[] = [];
  private bullets: THREE.Sprite[] = [];
  private fuseLabels: HTMLDivElement[] = [];
  private tracers: { line: THREE.Line; life: number }[] = [];
  private water: THREE.Mesh;
  private waterEdge: THREE.Line;
  private waterEffects: WaterEffects;
  private aim: THREE.Line;
  private bridge: THREE.Mesh;
  private particles: Particle[] = [];
  private floats: FloatText[] = [];
  private puff = texture(puffArt());
  private zoom = 1;
  private center = { x: 800, y: 450 };
  private manualUntil = 0;
  private shake = 0;
  private width = 1;
  private height = 1;
  private lastTime = 0;
  private resizeObserver: ResizeObserver;
  readonly icons: Record<Weapon, string>;
  reducedMotion = false;
  get waterSequenceActive(): boolean {
    return this.waterEffects.sinking;
  }
  private theme: "garden" | "canyon" | "frost" = "garden";
  setTheme(theme: "garden" | "canyon" | "frost"): void {
    if (this.theme === theme) return;
    this.theme = theme;
    const material = this.skyMesh.material as THREE.MeshBasicMaterial;
    material.map?.dispose();
    material.map = texture(skyArt(theme));
    material.needsUpdate = true;
    this.terrainRevision = -1;
  }

  constructor(
    readonly container: HTMLElement,
    readonly labelLayer: HTMLElement,
  ) {
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: "high-performance",
    });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.localClippingEnabled = true;
    this.renderer.setClearColor("#203f50");
    this.renderer.domElement.setAttribute(
      "aria-label",
      "Side-on destructible battlefield",
    );
    container.prepend(this.renderer.domElement);
    this.camera.position.set(800, 450, 30);
    this.skyMesh = this.plane(texture(skyArt()), 1600, 900);
    this.skyMesh.position.set(800, 450, -10);
    this.scene.add(this.skyMesh);
    this.terrainMesh = this.plane(null, 1600, 900);
    this.terrainMesh.position.set(800, 450, 0);
    this.scene.add(this.terrainMesh);
    this.wormTextures = [
      texture(wormArt(0)),
      texture(wormArt(1)),
      texture(wormArt(0, true)),
      texture(wormArt(1, true)),
    ];
    const kinds = WEAPON_IDS;
    this.weapons = Object.fromEntries(
      kinds.map((k) => [k, texture(weaponArt(k))]),
    ) as Record<Weapon, THREE.CanvasTexture>;
    this.ammunition = Object.fromEntries(
      Object.keys(BALLISTICS).map((kind) => [
        kind,
        texture(projectileArt(kind)),
      ]),
    ) as Record<ProjectileKind, THREE.CanvasTexture>;
    this.icons = Object.fromEntries(
      kinds.map((k) => [
        k,
        (this.weapons[k].image as HTMLCanvasElement).toDataURL(),
      ]),
    ) as Record<Weapon, string>;
    for (let i = 0; i < 8; i++) {
      const sprite = new THREE.Mesh(
        new THREE.PlaneGeometry(1, 1),
        new THREE.MeshBasicMaterial({
          map: this.wormTextures[i < 4 ? 0 : 1],
          transparent: true,
          depthTest: false,
        }),
      );
      sprite.renderOrder = 5;
      this.wormSprites.push(sprite);
      this.scene.add(sprite);
      const label = document.createElement("div");
      label.className = `worm-label team-${i < 4 ? 0 : 1}`;
      label.append(document.createTextNode(""), document.createElement("span"));
      labelLayer.append(label);
      this.labels.push(label);
    }
    this.held = this.plane(this.weapons.rocket, 45, 20);
    this.held.renderOrder = 6;
    this.scene.add(this.held);
    for (let i = 0; i < 12; i++) {
      const bullet = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: this.weapons.grenade,
          depthTest: false,
        }),
      );
      bullet.scale.set(16, 10, 1);
      bullet.renderOrder = 8;
      bullet.visible = false;
      const fuse = document.createElement("div");
      fuse.className = "fuse-label";
      fuse.hidden = true;
      labelLayer.append(fuse);
      this.fuseLabels.push(fuse);
      this.bullets.push(bullet);
      this.scene.add(bullet);
    }
    this.water = new THREE.Mesh(
      new THREE.PlaneGeometry(3000, 1000),
      new THREE.MeshBasicMaterial({
        color: "#285768",
        transparent: true,
        opacity: 0.78,
        depthTest: false,
      }),
    );
    this.water.renderOrder = 9;
    this.scene.add(this.water);
    this.waterEdge = new THREE.Line(
      new THREE.BufferGeometry(),
      new THREE.LineBasicMaterial({
        color: "#a8ddcf",
        transparent: true,
        opacity: 0.55,
      }),
    );
    this.waterEdge.renderOrder = 10;
    this.scene.add(this.waterEdge);
    this.waterEffects = new WaterEffects(this.scene, this.wormTextures);
    this.aim = new THREE.Line(
      new THREE.BufferGeometry(),
      new THREE.LineDashedMaterial({
        color: COLORS.cream,
        dashSize: 5,
        gapSize: 6,
        transparent: true,
        opacity: 0.65,
        depthTest: false,
      }),
    );
    this.aim.renderOrder = 6;
    this.scene.add(this.aim);
    this.bridge = new THREE.Mesh(
      new THREE.PlaneGeometry(86, 7),
      new THREE.MeshBasicMaterial({
        color: "#a4e4bd",
        transparent: true,
        opacity: 0.7,
        depthTest: false,
      }),
    );
    this.bridge.renderOrder = 7;
    this.scene.add(this.bridge);
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(container);
    this.resize();
  }

  private plane(
    map: THREE.Texture | null,
    width: number,
    height: number,
  ): THREE.Mesh {
    const material = new THREE.MeshBasicMaterial({
      map,
      transparent: true,
      depthTest: false,
      alphaTest: 0.01,
    });
    return new THREE.Mesh(new THREE.PlaneGeometry(width, height), material);
  }

  private resize(): void {
    // The battlefield is hidden on the title screen. Keep its camera finite
    // until ResizeObserver receives the visible game dimensions.
    this.width = Math.max(1, this.container.clientWidth);
    this.height = Math.max(1, this.container.clientHeight);
    this.renderer.setSize(this.width, this.height);
    this.updateCamera();
  }
  private updateCamera(): void {
    const aspect = this.width / Math.max(this.height, 1),
      h = Math.max(900, 1600 / aspect) / this.zoom,
      w = h * aspect;
    this.camera.left = -w / 2;
    this.camera.right = w / 2;
    this.camera.top = h / 2;
    this.camera.bottom = -h / 2;
    this.camera.updateProjectionMatrix();
    this.camera.position.set(this.center.x, WORLD_HEIGHT - this.center.y, 30);
    this.camera.updateMatrixWorld();
  }
  screenToWorld(clientX: number, clientY: number): { x: number; y: number } {
    const bounds = this.container.getBoundingClientRect();
    const p = new THREE.Vector3(
      ((clientX - bounds.left) / bounds.width) * 2 - 1,
      (-(clientY - bounds.top) / bounds.height) * 2 + 1,
      0,
    ).unproject(this.camera);
    return { x: p.x, y: WORLD_HEIGHT - p.y };
  }
  worldToScreen(x: number, y: number): { x: number; y: number } {
    const p = new THREE.Vector3(x, WORLD_HEIGHT - y, 0).project(this.camera);
    return {
      x: ((p.x + 1) / 2) * this.width,
      y: ((1 - p.y) / 2) * this.height,
    };
  }
  zoomBy(delta: number, around: { x: number; y: number }): void {
    this.zoom = clamp(this.zoom * (delta > 0 ? 0.9 : 1.1), 1, 2.1);
    this.center.x = this.zoom === 1 ? 800 : clamp(around.x, 390, 1210);
    this.center.y = this.zoom === 1 ? 450 : clamp(around.y, 280, 590);
    this.manualUntil = performance.now() + 6000;
    this.updateCamera();
  }
  pan(dx: number, dy: number): void {
    const scale = (this.camera.right - this.camera.left) / this.width;
    this.center.x = clamp(this.center.x - dx * scale, 300, 1300);
    this.center.y = clamp(this.center.y - dy * scale, 200, 650);
    this.manualUntil = performance.now() + 10000;
    this.updateCamera();
  }
  recenter(game: Game, overview = false): void {
    this.zoom = overview ? 1 : 1.35;
    this.center = {
      x: overview ? 800 : clamp(game.active.x, 540, 1060),
      y: overview ? 450 : 470,
    };
    this.manualUntil = 0;
    this.updateCamera();
  }
  reset(): void {
    this.waterEffects.reset();
    this.lastTrailTick = -1;
    this.landingSquash.clear();
    for (const ring of this.rings) {
      this.scene.remove(ring.line);
      ring.line.geometry.dispose();
      (ring.line.material as THREE.Material).dispose();
    }
    this.rings = [];
    this.zoom = 1;
    this.center = { x: 800, y: 450 };
    this.manualUntil = 0;
    for (const p of this.particles) {
      this.scene.remove(p.sprite);
      p.sprite.material.dispose();
    }
    this.particles = [];
    for (const f of this.floats) f.el.remove();
    this.floats = [];
    for (const tracer of this.tracers) {
      this.scene.remove(tracer.line);
      tracer.line.geometry.dispose();
      (tracer.line.material as THREE.Material).dispose();
    }
    this.tracers = [];
    this.fuseLabels.forEach((label) => {
      label.hidden = true;
    });
  }

  event(event: GameEvent): void {
    this.waterEffects.event(event, this.reducedMotion);
    if (event.type === "blast" && event.medium === "water") {
      this.shake = this.reducedMotion ? 0 : 1.5;
      return;
    }
    if (event.type === "blast") {
      const radius = event.value ?? 60;
      this.burst(event.x, event.y, 18, radius * 0.65, "#a98c70");
      this.burst(event.x, event.y, 9, radius * 0.3, "#f3ce8d");
      this.shake = this.reducedMotion ? 0 : 3 + radius * 0.04;
      const points = Array.from({ length: 48 }, (_, i) => {
        const a = (i / 48) * Math.PI * 2;
        return new THREE.Vector3(Math.cos(a), Math.sin(a), 0);
      });
      const ring = new THREE.LineLoop(
        new THREE.BufferGeometry().setFromPoints(points),
        new THREE.LineBasicMaterial({
          color: "#f5d99e",
          transparent: true,
          opacity: 0.65,
          depthTest: false,
        }),
      );
      ring.position.set(event.x, WORLD_HEIGHT - event.y, 7);
      ring.renderOrder = 9;
      this.scene.add(ring);
      this.rings.push({ line: ring, life: 0.26, radius });
    }
    if (event.type === "land") {
      const strength = Math.min(1, (event.value ?? 100) / 300);
      if (event.actor !== undefined && !this.reducedMotion)
        this.landingSquash.set(event.actor, strength * 0.18);
      this.burst(
        event.x,
        event.y - 2,
        3 + Math.round(strength * 4),
        6 + strength * 6,
        "#c5b596",
      );
    }
    if (event.type === "bounce") this.burst(event.x, event.y, 2, 4, "#d4c49f");
    if (event.type === "shove") this.burst(event.x, event.y, 15, 25, "#c9bad9");
    if (event.type === "bridge")
      this.burst(event.x, event.y, 12, 15, "#c5dd92");
    if (event.type === "death" && event.medium !== "water")
      this.burst(event.x, event.y, 18, 24, "#cae7cf");
    if (event.type === "teleport")
      this.burst(event.x, event.y, 35, 35, "#a7dbe6");
    if (event.type === "heal") this.burst(event.x, event.y, 18, 22, "#b7e6a4");
    if (event.type === "tracer") {
      const line = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(event.x, WORLD_HEIGHT - event.y, 7),
          new THREE.Vector3(event.endX!, WORLD_HEIGHT - event.endY!, 7),
        ]),
        new THREE.LineBasicMaterial({
          color: event.weapon === "sniper" ? "#bbecff" : "#ffdd94",
          transparent: true,
          opacity: 0.95,
          depthTest: false,
        }),
      );
      line.renderOrder = 8;
      this.scene.add(line);
      this.tracers.push({ line, life: 0.24 });
    }
    if (event.type === "damage" || event.type === "heal") {
      const el = document.createElement("div");
      el.className = "damage-float";
      el.textContent = `${event.type === "heal" ? "+" : "−"}${event.value}`;
      if (event.type === "heal") el.style.color = "#bcf3ad";
      this.labelLayer.append(el);
      this.floats.push({ el, x: event.x, y: event.y, life: 1.7 });
    }
  }
  private burst(
    x: number,
    y: number,
    count: number,
    size: number,
    color?: string,
  ): void {
    if (this.reducedMotion) count = Math.min(5, Math.ceil(count * 0.25));
    for (let i = 0; i < count && this.particles.length < 240; i++) {
      const a = Math.random() * Math.PI * 2,
        speed =
          (25 + Math.random() * size * 3) * (this.reducedMotion ? 0.15 : 1);
      const tint = color ?? ["#ffd889", "#ffb56b", "#dfc6a4", "#7c6455"][i % 4];
      const mat = new THREE.SpriteMaterial({
        map: this.puff,
        color: tint,
        transparent: true,
        depthTest: false,
      });
      const sprite = new THREE.Sprite(mat);
      sprite.renderOrder = 8;
      this.scene.add(sprite);
      this.particles.push({
        sprite,
        x,
        y,
        vx: Math.cos(a) * speed,
        vy: Math.sin(a) * speed - 20,
        life: 0.6 + Math.random() * 0.8,
        max: 1.4,
        size: 7 + Math.random() * size * 0.45,
        gravity: i % 3 === 0,
      });
    }
  }

  render(
    game: Game,
    angle: number,
    weapon: Weapon,
    target: { x: number; y: number },
    time: number,
    playing: boolean,
  ): void {
    const dt = playing
      ? Math.min(0.05, (time - this.lastTime) / 1000 || 0.016)
      : 0;
    this.lastTime = time;
    if (
      this.terrainRevision !== game.terrain.revision ||
      this.terrainSource !== game.terrain
    ) {
      const material = this.terrainMesh.material as THREE.MeshBasicMaterial;
      material.map?.dispose();
      material.map = texture(terrainArt(game.terrain, this.theme));
      material.needsUpdate = true;
      this.terrainRevision = game.terrain.revision;
      this.terrainSource = game.terrain;
    }
    if (this.zoom > 1 && time > this.manualUntil && playing) {
      const focus = game.projectile ?? game.active;
      this.center.x +=
        (clamp(focus.x, 430, 1170) - this.center.x) * Math.min(1, dt * 3);
      this.center.y +=
        (clamp(focus.y - 60, 310, 530) - this.center.y) * Math.min(1, dt * 2);
    }
    this.updateCamera();
    if (this.reducedMotion) this.shake = 0;
    if (this.shake > 0 && dt > 0) {
      this.camera.position.x += (Math.random() - 0.5) * this.shake;
      this.camera.position.y += (Math.random() - 0.5) * this.shake;
      this.shake *= 0.87;
      this.camera.updateMatrixWorld();
    }
    // Fill the viewport when the playfield is panned or zoomed.
    this.skyMesh.position.set(
      this.camera.position.x,
      this.camera.position.y,
      -10,
    );
    this.skyMesh.scale.set(
      (this.camera.right - this.camera.left) / 1600,
      (this.camera.top - this.camera.bottom) / 900,
      1,
    );
    for (let i = 0; i < this.wormSprites.length; i++) {
      if (!game.worms[i]) {
        this.wormSprites[i].visible = false;
        this.labels[i].hidden = true;
        continue;
      }
      const w = game.worms[i],
        sprite = this.wormSprites[i],
        label = this.labels[i];
      sprite.visible = w.hp > 0;
      label.hidden = w.hp <= 0;
      if (w.hp <= 0) continue;
      const moving = w.grounded && Math.abs(w.vx) > 3;
      const landing = Math.max(0, (this.landingSquash.get(w.id) ?? 0) - dt);
      this.landingSquash.set(w.id, landing);
      const pulse = this.reducedMotion
        ? 0
        : (moving ? Math.sin(w.walk * 0.22) * 0.07 : 0) +
          (w.grounded ? landing : 0);
      sprite.material.map = this.wormTextures[w.team + (w.hurt > 0 ? 2 : 0)];
      sprite.scale.set(32 * (1 + pulse) * w.facing, 38 * (1 - pulse), 1);
      const tilt =
        !this.reducedMotion && !w.grounded
          ? clamp(w.vx * 0.0015, -0.3, 0.3)
          : 0;
      sprite.rotation.z = tilt;
      // The source art's foot pivot is (56, 101) in its 112px canvas.
      // Keep that point on the collider foot through squash and rotation.
      const footOffset = ((56 - 101) / 112) * sprite.scale.y;
      sprite.position.set(
        w.x + Math.sin(tilt) * footOffset,
        WORLD_HEIGHT - w.y - Math.cos(tilt) * footOffset,
        3,
      );
      const p = this.worldToScreen(w.x, w.y - 45);
      label.style.transform = `translate(${p.x}px,${p.y}px) translate(-50%,-100%)`;
      label.classList.toggle("active", playing && w.id === game.activeId);
      label.classList.toggle("team-0", w.team === 0);
      label.classList.toggle("team-1", w.team === 1);
      if (label.firstChild!.textContent !== w.name)
        label.firstChild!.textContent = w.name;
      label.lastChild!.textContent = String(w.hp);
    }
    // Lay labels out in screen space; eight names must remain legible when
    // the full battlefield is fitted into a narrow desktop panel.
    const occupied: { x: number; y: number; width: number }[] = [];
    for (const w of [...game.worms]
      .filter((w) => w.hp > 0)
      .sort((a, b) => a.x - b.x)) {
      const label = this.labels[w.id],
        p = this.worldToScreen(w.x, w.y - 45);
      const width = label.offsetWidth + 8;
      let y = p.y;
      for (let lane = 0; lane < 8; lane++) {
        y = p.y - lane * 20;
        if (
          !occupied.some(
            (other) =>
              Math.abs(other.x - p.x) < (other.width + width) / 2 &&
              Math.abs(other.y - y) < 19,
          )
        )
          break;
      }
      occupied.push({ x: p.x, y, width });
      label.style.transform = `translate(${p.x}px,${y}px) translate(-50%,-100%)`;
    }
    const active = game.active;
    this.held.visible = playing && active.hp > 0 && game.phase === "aim";
    if (this.held.visible) {
      (this.held.material as THREE.MeshBasicMaterial).map =
        this.weapons[weapon];
      this.held.position.set(
        active.x + Math.cos(angle) * 15,
        WORLD_HEIGHT - active.y + 19 - Math.sin(angle) * 15,
        4,
      );
      this.held.rotation.z = -angle;
      this.held.scale.y = Math.cos(angle) < 0 ? -1 : 1;
    }
    this.aim.visible =
      playing &&
      active.team === 0 &&
      game.phase === "aim" &&
      !["place", "self"].includes(WEAPONS[weapon].mode);
    if (this.aim.visible) {
      const points = [30, 70].map(
        (d) =>
          new THREE.Vector3(
            active.x + Math.cos(angle) * d,
            WORLD_HEIGHT - active.y + 18 - Math.sin(angle) * d,
            5,
          ),
      );
      this.aim.geometry.dispose();
      this.aim.geometry = new THREE.BufferGeometry().setFromPoints(points);
      this.aim.computeLineDistances();
    }
    this.bridge.visible =
      playing &&
      active.team === 0 &&
      game.phase === "aim" &&
      WEAPONS[weapon].mode === "place";
    if (this.bridge.visible) {
      const landing =
        weapon === "teleport" ? game.teleportLanding(target.x, target.y) : null;
      this.bridge.position.set(
        target.x,
        WORLD_HEIGHT -
          (landing?.y ?? target.y) -
          (weapon === "teleport" ? -14 : 3.5),
        5,
      );
      this.bridge.scale.set(
        weapon === "bridge" ? 1 : weapon === "teleport" ? 0.28 : 2.1,
        weapon === "bridge" ? 1 : weapon === "teleport" ? 4 : 0.6,
        1,
      );
      (this.bridge.material as THREE.MeshBasicMaterial).color.set(
        game.canPlace(weapon, target.x, target.y).valid ? "#c5e8a4" : "#ff9187",
      );
    }
    const emitTrail =
      playing &&
      !this.reducedMotion &&
      game.ticks % 4 === 0 &&
      game.ticks !== this.lastTrailTick;
    if (emitTrail) this.lastTrailTick = game.ticks;
    this.bullets.forEach((bullet, i) => {
      const p = game.projectiles[i];
      const fuse = this.fuseLabels[i];
      fuse.hidden = !p || p.fuse <= 0 || p.kind === "fragment";
      if (!fuse.hidden) {
        const position = this.worldToScreen(p.x, p.y - 24);
        const side = position.x > this.width - 60 ? -30 : 30;
        fuse.textContent = `${(p.fuse / 60).toFixed(1)}s${p.submergedTicks ? " · underwater" : ""}`;
        const margin = fuse.offsetWidth / 2 + 8;
        fuse.style.transform = `translate(${clamp(position.x + side, margin, this.width - margin)}px,${position.y + 8}px) translate(-50%,-100%)`;
        fuse.classList.toggle("submerged", p.submergedTicks > 0);
        fuse.classList.toggle("urgent", p.fuse <= 60);
      }
      bullet.visible = !!p;
      if (!p) return;
      bullet.position.set(p.x, WORLD_HEIGHT - p.y, 6);
      bullet.material.map = this.ammunition[p.kind];
      bullet.renderOrder = p.submergedTicks ? 9.6 : 8;
      bullet.material.color.set(p.submergedTicks ? "#a3dbd8" : "#ffffff");
      bullet.material.opacity = p.submergedTicks ? 0.8 : 1;
      bullet.scale.set(
        p.kind === "rocket" ? 24 : p.kind === "fragment" ? 12 : 20,
        p.kind === "rocket" ? 11 : 15,
        1,
      );
      bullet.material.rotation = -Math.atan2(p.vy, p.vx);
      if (emitTrail && !p.resting && this.particles.length < 240) {
        if (p.submergedTicks)
          this.waterEffects.bubble(p.x, p.y, this.reducedMotion);
        else this.burst(p.x, p.y, 1, 2, "#e4e1cf");
      }
    });
    this.rings = this.rings.filter((ring) => {
      ring.life -= dt;
      if (ring.life <= 0) {
        this.scene.remove(ring.line);
        ring.line.geometry.dispose();
        (ring.line.material as THREE.Material).dispose();
        return false;
      }
      const size =
        ring.radius *
        (this.reducedMotion ? 1 : 0.55 + 0.45 * (1 - ring.life / 0.26));
      ring.line.scale.set(size, size, 1);
      (ring.line.material as THREE.LineBasicMaterial).opacity =
        (ring.life / 0.26) * 0.65;
      return true;
    });
    this.tracers = this.tracers.filter((tracer) => {
      tracer.life -= dt;
      if (tracer.life <= 0) {
        this.scene.remove(tracer.line);
        tracer.line.geometry.dispose();
        (tracer.line.material as THREE.Material).dispose();
        return false;
      }
      (tracer.line.material as THREE.LineBasicMaterial).opacity =
        tracer.life / 0.24;
      return true;
    });
    this.water.position.set(800, WORLD_HEIGHT - game.water - 500, 5);
    const wave: THREE.Vector3[] = [];
    for (let x = -400; x <= 2000; x += 16)
      wave.push(
        new THREE.Vector3(
          x,
          WORLD_HEIGHT -
            game.water +
            Math.sin(x * 0.027 + (this.reducedMotion ? 0 : time * 0.0015)) * 2,
          6,
        ),
      );
    this.waterEdge.geometry.dispose();
    this.waterEdge.geometry = new THREE.BufferGeometry().setFromPoints(wave);
    this.particles = this.particles.filter((p) => {
      p.life -= dt;
      if (p.life <= 0) {
        this.scene.remove(p.sprite);
        p.sprite.material.dispose();
        return false;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.gravity) p.vy += 180 * dt;
      p.sprite.position.set(p.x, WORLD_HEIGHT - p.y, 6);
      p.sprite.material.opacity = Math.min(0.9, p.life / p.max);
      const s = p.size * (1 + (1 - p.life / p.max) * 0.7);
      p.sprite.scale.set(s, s, 1);
      return true;
    });
    this.floats = this.floats.filter((f) => {
      f.life -= dt;
      if (f.life <= 0) {
        f.el.remove();
        return false;
      }
      f.y -= 22 * dt;
      const p = this.worldToScreen(f.x, f.y);
      f.el.style.transform = `translate(${p.x}px,${p.y}px)`;
      f.el.style.opacity = String(Math.min(1, f.life * 2));
      return true;
    });
    this.waterEffects.update(game, dt, this.reducedMotion);
    // Keep the aim readout above the visible water so sinking bodies and fuses
    // remain readable. Clamp the offset when panning or sudden death floods.
    this.container.style.setProperty(
      "--water-space",
      `${clamp(this.height - this.worldToScreen(800, game.water).y - 10, 0, 100)}px`,
    );
    this.renderer.render(this.scene, this.camera);
  }
  dispose(): void {
    this.resizeObserver.disconnect();
    this.reset();
    this.waterEffects.dispose();
    this.scene.traverse((obj) => {
      if (obj instanceof THREE.Mesh || obj instanceof THREE.Line) {
        obj.geometry.dispose();
      }
      if ("material" in obj) {
        const m = (obj as THREE.Mesh).material;
        if (Array.isArray(m)) m.forEach((x) => x.dispose());
        else m.dispose();
      }
    });
    this.fuseLabels.forEach((label) => label.remove());
    Object.values(this.ammunition).forEach((t) => t.dispose());
    this.wormTextures.forEach((t) => t.dispose());
    Object.values(this.weapons).forEach((t) => t.dispose());
    this.puff.dispose();
    this.renderer.dispose();
  }
}
type TerrainIdentity = Game["terrain"];
