import * as THREE from "three";
import { Game, GameEvent, clamp } from "../game/simulation";
import { SEABED_Y, WORLD_HEIGHT } from "../game/terrain";
import { texture } from "./art";
import { advanceSinkingBody, sinkingBody, SinkingBody } from "./sinking";

interface WaterParticle {
  sprite: THREE.Sprite;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  size: number;
  bubble: boolean;
}
interface WaterRing {
  line: THREE.LineLoop;
  life: number;
  max: number;
  radius: number;
  surface: boolean;
}

/** Bounded, pausable water presentation, separate from authoritative physics. */
export class WaterEffects {
  private particles: WaterParticle[] = [];
  private rings: WaterRing[] = [];
  private corpses = new Map<
    number,
    {
      body: SinkingBody;
      mesh: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
    }
  >();
  private arrivals = new Set<number>();
  private bubbleTexture: THREE.CanvasTexture;
  private bedTexture: THREE.CanvasTexture;
  private glowTexture: THREE.CanvasTexture;
  private surfaceClip = new THREE.Plane(new THREE.Vector3(0, -1, 0), 98);
  private bedClip = new THREE.Plane(
    new THREE.Vector3(0, 1, 0),
    -(WORLD_HEIGHT - SEABED_Y),
  );
  private flashes: { sprite: THREE.Sprite; life: number; radius: number }[] =
    [];
  private bed: THREE.Mesh;

  get sinking(): boolean {
    return [...this.corpses.values()].some(
      ({ body }) => !body.settled && body.age < 3,
    );
  }

  constructor(
    private scene: THREE.Scene,
    private worms: THREE.CanvasTexture[],
  ) {
    const bubble = document.createElement("canvas");
    bubble.width = bubble.height = 32;
    const c = bubble.getContext("2d")!;
    const gradient = c.createRadialGradient(12, 10, 2, 16, 16, 14);
    gradient.addColorStop(0, "#dfffff20");
    gradient.addColorStop(0.7, "#91dbdb18");
    gradient.addColorStop(1, "#b4eeebaa");
    c.fillStyle = gradient;
    c.beginPath();
    c.arc(16, 16, 13, 0, Math.PI * 2);
    c.fill();
    c.strokeStyle = "#e3ffef";
    c.lineWidth = 2;
    c.beginPath();
    c.arc(16, 16, 10, Math.PI * 1.12, Math.PI * 1.53);
    c.stroke();
    this.bubbleTexture = texture(bubble);
    const glow = document.createElement("canvas");
    glow.width = glow.height = 64;
    const g = glow.getContext("2d")!;
    const light = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    light.addColorStop(0, "#edfff8");
    light.addColorStop(0.2, "#b1fff0cc");
    light.addColorStop(0.55, "#64e7e15a");
    light.addColorStop(1, "#4cbcd900");
    g.fillStyle = light;
    g.fillRect(0, 0, 64, 64);
    this.glowTexture = texture(glow);

    const bed = document.createElement("canvas");
    bed.width = 512;
    bed.height = 32;
    const b = bed.getContext("2d")!;
    const sand = b.createLinearGradient(0, 0, 0, 32);
    sand.addColorStop(0, "#7c9180");
    sand.addColorStop(0.16, "#526e67");
    sand.addColorStop(1, "#244e59");
    b.fillStyle = sand;
    b.fillRect(0, 0, 512, 32);
    for (let i = 0; i < 90; i++) {
      b.fillStyle = i % 2 ? "#b1b6a344" : "#143f4f66";
      b.beginPath();
      b.ellipse(
        (i * 137) % 512,
        3 + ((i * 17) % 24),
        1 + (i % 3),
        0.8,
        0,
        0,
        Math.PI * 2,
      );
      b.fill();
    }
    this.bedTexture = texture(bed);
    this.bedTexture.wrapS = THREE.RepeatWrapping;
    this.bedTexture.repeat.x = 6;
    this.bed = new THREE.Mesh(
      new THREE.PlaneGeometry(3000, 32),
      new THREE.MeshBasicMaterial({
        map: this.bedTexture,
        transparent: true,
        opacity: 0.72,
        depthTest: false,
      }),
    );
    this.bed.position.set(800, WORLD_HEIGHT - SEABED_Y - 16, 6);
    this.bed.renderOrder = 9.2;
    scene.add(this.bed);
  }

  event(e: GameEvent, reduced: boolean): void {
    if (e.type === "death" && e.medium === "water" && e.actor !== undefined)
      this.arrivals.add(e.actor);
    if (e.type === "splash")
      this.splash(e.x, e.y, clamp((e.value ?? 120) / 300, 0.3, 1), reduced);
    if (e.type === "blast" && e.medium === "water") {
      const radius = e.value ?? 60,
        water = e.waterLevel ?? e.y;
      if (this.flashes.length < 12) {
        const sprite = new THREE.Sprite(
          new THREE.SpriteMaterial({
            map: this.glowTexture,
            transparent: true,
            depthTest: false,
            clippingPlanes: [this.surfaceClip, this.bedClip],
          }),
        );
        sprite.position.set(e.x, WORLD_HEIGHT - e.y, 7);
        sprite.renderOrder = 10.5;
        this.scene.add(sprite);
        this.flashes.push({ sprite, life: 0.45, radius });
      }
      this.ring(e.x, e.y, radius * 1.2, false);
      this.ring(e.x, e.y, radius * 0.7, false);
      const count = reduced ? 6 : 28;
      for (let i = 0; i < count; i++) {
        const a = Math.random() * Math.PI * 2;
        this.particle(
          e.x + Math.cos(a) * 8,
          e.y + Math.sin(a) * 8,
          Math.cos(a) * (reduced ? 10 : 75),
          -28 + Math.sin(a) * (reduced ? 10 : 65),
          5 + Math.random() * 11,
          true,
          2.6 + Math.random() * 1.2,
        );
      }
      const strength = clamp(1 - (e.y - water) / (radius * 2.5), 0, 1);
      if (strength > 0.08) this.splash(e.x, water, strength, reduced, true);
    }
  }

  private ring(x: number, y: number, radius: number, surface: boolean): void {
    if (this.rings.length >= 32) return;
    const points = Array.from({ length: 40 }, (_, i) => {
      const a = (i / 40) * Math.PI * 2;
      return new THREE.Vector3(Math.cos(a), Math.sin(a), 0);
    });
    const line = new THREE.LineLoop(
      new THREE.BufferGeometry().setFromPoints(points),
      new THREE.LineBasicMaterial({
        color: surface ? "#cdf6df" : "#93efe8",
        transparent: true,
        opacity: 0.75,
        depthTest: false,
      }),
    );
    line.position.set(x, WORLD_HEIGHT - y, 8);
    line.renderOrder = 11;
    if (!surface)
      (line.material as THREE.LineBasicMaterial).clippingPlanes = [
        this.surfaceClip,
        this.bedClip,
      ];
    this.scene.add(line);
    const life = surface ? 1.15 : 0.65;
    this.rings.push({ line, life, max: life, radius, surface });
  }

  private splash(
    x: number,
    water: number,
    strength: number,
    reduced: boolean,
    plume = false,
  ): void {
    this.ring(x, water, 18 + strength * 42, true);
    const count = reduced ? 3 : plume ? 20 : 12;
    for (let i = 0; i < count; i++) {
      this.particle(
        x + (Math.random() - 0.5) * 10,
        water - 1,
        (Math.random() - 0.5) * (plume ? 105 : 145) * strength,
        -(35 + Math.random() * (plume ? 175 : 105)) *
          (reduced ? 0.25 : 1) *
          strength,
        3 + Math.random() * (plume ? 6 : 3),
        false,
        1.8,
      );
    }
  }

  bubble(x: number, y: number, reduced: boolean): void {
    if (!reduced)
      this.particle(
        x,
        y,
        (Math.random() - 0.5) * 12,
        -26 - Math.random() * 16,
        3 + Math.random() * 4,
        true,
        3.5,
      );
  }

  private particle(
    x: number,
    y: number,
    vx: number,
    vy: number,
    size: number,
    bubble: boolean,
    life: number,
  ): void {
    if (this.particles.length >= 140) return;
    const sprite = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: this.bubbleTexture,
        color: bubble ? "#c2f5ed" : "#e1faed",
        transparent: true,
        depthTest: false,
      }),
    );
    sprite.renderOrder = 11;
    this.scene.add(sprite);
    this.particles.push({
      sprite,
      x,
      y,
      vx,
      vy,
      life,
      max: life,
      size,
      bubble,
    });
  }

  update(game: Game, dt: number, reduced: boolean): void {
    this.surfaceClip.constant = WORLD_HEIGHT - game.water;
    this.flashes = this.flashes.filter((flash) => {
      flash.life -= dt;
      if (flash.life <= 0) {
        this.scene.remove(flash.sprite);
        flash.sprite.material.dispose();
        return false;
      }
      const fade = flash.life / 0.45;
      const size = flash.radius * (reduced ? 1 : 1 + (1 - fade) * 0.7);
      flash.sprite.scale.set(size, size, 1);
      flash.sprite.material.opacity = fade * fade * (reduced ? 0.25 : 0.8);
      return true;
    });
    for (const [id, corpse] of this.corpses) {
      if (!game.worms[id]?.drowned || game.worms[id].hp > 0) {
        this.scene.remove(corpse.mesh);
        corpse.mesh.geometry.dispose();
        corpse.mesh.material.dispose();
        this.corpses.delete(id);
      }
    }
    for (const w of game.worms) {
      if (!w.drowned || w.hp > 0 || this.corpses.has(w.id)) continue;
      const body = sinkingBody(w);
      // A continued match restores resting remains without replaying a death.
      if (!this.arrivals.has(w.id)) {
        for (let i = 0; i < 2400 && !body.settled; i++)
          advanceSinkingBody(body, game.terrain, 1 / 60);
        body.angle = (-body.facing * Math.PI) / 2;
      }
      const mesh = new THREE.Mesh(
        new THREE.PlaneGeometry(32, 38),
        new THREE.MeshBasicMaterial({
          map: this.worms[w.team + 2],
          color: "#92c6c7",
          transparent: true,
          opacity: 0.75,
          depthTest: false,
        }),
      );
      mesh.renderOrder = 9.5;
      this.scene.add(mesh);
      this.corpses.set(w.id, { body, mesh });
    }
    this.arrivals.clear();
    for (const { body, mesh } of this.corpses.values()) {
      const wasSettled = body.settled;
      const previousBubble = Math.floor(body.age * 5);
      advanceSinkingBody(body, game.terrain, dt);
      if (
        !body.settled &&
        body.y > game.water &&
        Math.floor(body.age * 5) !== previousBubble
      )
        this.bubble(body.x, body.y - 5, reduced);
      if (!wasSettled && body.settled && !reduced)
        for (let i = 0; i < 3; i++)
          this.bubble(body.x + (i - 1) * 6, body.y, false);
      mesh.position.set(body.x, WORLD_HEIGHT - body.y, 7);
      mesh.rotation.z = reduced ? (-body.facing * Math.PI) / 2 : body.angle;
      mesh.scale.x = body.facing;
      mesh.material.opacity = clamp(
        0.85 - (body.y - game.water) / 550,
        0.35,
        0.85,
      );
    }
    this.rings = this.rings.filter((r) => {
      r.life -= dt;
      if (r.life <= 0) {
        this.scene.remove(r.line);
        r.line.geometry.dispose();
        (r.line.material as THREE.Material).dispose();
        return false;
      }
      const progress = 1 - r.life / r.max;
      const size = r.radius * (reduced ? 0.8 : 0.2 + progress * 0.8);
      r.line.scale.set(size, size * (r.surface ? 0.16 : 0.8), 1);
      if (r.surface) r.line.position.y = WORLD_HEIGHT - game.water;
      (r.line.material as THREE.LineBasicMaterial).opacity =
        (1 - progress) * 0.75;
      return true;
    });
    this.particles = this.particles.filter((p) => {
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.bubble) {
        p.vx *= Math.exp(-1.3 * dt);
        p.vy += (-36 - p.vy) * (1 - Math.exp(-2 * dt));
      } else p.vy += 260 * dt;
      const surface = p.bubble
        ? p.y <= game.water
        : p.y >= game.water && p.vy > 0;
      if (
        p.life <= 0 ||
        surface ||
        (p.bubble && game.terrain.solid(p.x, p.y))
      ) {
        if (surface && !reduced && p.size > 5)
          this.ring(p.x, game.water, 8 + p.size, true);
        this.scene.remove(p.sprite);
        p.sprite.material.dispose();
        return false;
      }
      p.sprite.position.set(p.x, WORLD_HEIGHT - p.y, 8);
      p.sprite.material.opacity = Math.min(0.8, p.life / 0.4);
      const size = p.size * (p.bubble ? 1 + (1 - p.life / p.max) * 0.5 : 1);
      p.sprite.scale.set(size, size * (p.bubble ? 1 : 1.6), 1);
      return true;
    });
  }

  reset(): void {
    for (const f of this.flashes) {
      this.scene.remove(f.sprite);
      f.sprite.material.dispose();
    }
    this.flashes = [];
    for (const p of this.particles) {
      this.scene.remove(p.sprite);
      p.sprite.material.dispose();
    }
    for (const r of this.rings) {
      this.scene.remove(r.line);
      r.line.geometry.dispose();
      (r.line.material as THREE.Material).dispose();
    }
    for (const c of this.corpses.values()) {
      this.scene.remove(c.mesh);
      c.mesh.geometry.dispose();
      c.mesh.material.dispose();
    }
    this.particles = [];
    this.rings = [];
    this.corpses.clear();
    this.arrivals.clear();
  }

  dispose(): void {
    this.reset();
    this.scene.remove(this.bed);
    this.bed.geometry.dispose();
    (this.bed.material as THREE.Material).dispose();
    this.bedTexture.dispose();
    this.bubbleTexture.dispose();
    this.glowTexture.dispose();
  }
}
