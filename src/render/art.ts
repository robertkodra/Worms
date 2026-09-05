import { CanvasTexture, SRGBColorSpace, LinearFilter } from "three";
import {
  seededRandom,
  Terrain,
  WORLD_WIDTH,
  WORLD_HEIGHT,
} from "../game/terrain";

export const COLORS = {
  coral: "#ff9784",
  mint: "#a4e4bd",
  ink: "#132b31",
  cream: "#fff2cf",
};
export function canvas(
  width: number,
  height: number,
): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const el = document.createElement("canvas");
  el.width = width;
  el.height = height;
  return [el, el.getContext("2d")!];
}
export function texture(el: HTMLCanvasElement): CanvasTexture {
  const tex = new CanvasTexture(el);
  tex.colorSpace = SRGBColorSpace;
  tex.minFilter = LinearFilter;
  tex.magFilter = LinearFilter;
  tex.generateMipmaps = false;
  return tex;
}

export function skyArt(
  theme: "garden" | "canyon" | "frost" = "garden",
): HTMLCanvasElement {
  const [el, c] = canvas(WORLD_WIDTH, WORLD_HEIGHT);
  const r = seededRandom(920);
  const sky = c.createLinearGradient(0, 0, 0, 900);
  const palette =
    theme === "canyon"
      ? ["#41314e", "#c07772", "#efd09f", "#643f49"]
      : theme === "frost"
        ? ["#263650", "#729eb5", "#d5e5e8", "#344a64"]
        : ["#203f50", "#6b9c9a", "#c9d0ad", "#203c43"];
  sky.addColorStop(0, palette[0]);
  sky.addColorStop(0.48, palette[1]);
  sky.addColorStop(0.8, palette[2]);
  sky.addColorStop(1, palette[3]);
  c.fillStyle = sky;
  c.fillRect(0, 0, 1600, 900);
  const glow = c.createRadialGradient(1200, 190, 15, 1200, 190, 235);
  glow.addColorStop(0, "#ffdfab45");
  glow.addColorStop(1, "#ffdfab00");
  c.fillStyle = glow;
  c.fillRect(950, 0, 500, 460);
  c.fillStyle = "#ffebbf";
  c.beginPath();
  c.arc(1200, 190, 51, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = "#e6d5ad";
  c.globalAlpha = 0.35;
  for (let i = 0; i < 8; i++) {
    c.beginPath();
    c.arc(1167 + r() * 65, 157 + r() * 65, 3 + r() * 8, 0, Math.PI * 2);
    c.fill();
  }
  c.globalAlpha = 1;
  for (let i = 0; i < 80; i++) {
    const x = r() * 1600,
      y = 30 + r() * 290;
    c.globalAlpha = 0.18 + r() * 0.45;
    c.fillStyle = "#fff6dd";
    c.beginPath();
    c.arc(x, y, 0.6 + r(), 0, Math.PI * 2);
    c.fill();
  }
  c.globalAlpha = 1;
  // Painted, two-dimensional distance layers. They never become collision.
  for (let layer = 0; layer < 3; layer++) {
    c.fillStyle = (
      theme === "canyon"
        ? ["#ac7b79", "#8a585f", "#653e4e"]
        : theme === "frost"
          ? ["#8baebb", "#648498", "#426377"]
          : ["#658e8a", "#47756f", "#2e5d5c"]
    )[layer];
    c.beginPath();
    c.moveTo(0, 900);
    for (let x = 0; x <= 1600; x += 8)
      c.lineTo(
        x,
        490 +
          layer * 64 +
          (theme === "canyon"
            ? 65 * Math.round(Math.sin(x * 0.008 + layer * 2))
            : 35 * Math.sin(x * 0.008 + layer * 2)) +
          26 * Math.sin(x * 0.015 + layer),
      );
    c.lineTo(1600, 900);
    c.closePath();
    c.fill();
  }
  c.globalAlpha = 0.2;
  c.strokeStyle = "#254c4b";
  c.lineWidth = 5;
  for (let i = 0; i < 22; i++) {
    const x = r() * 1600,
      y = 540 + r() * 90;
    c.beginPath();
    c.moveTo(x, 760);
    c.quadraticCurveTo(x - 15, y + 30, x + 8, y);
    c.stroke();
    for (let j = 0; j < 3; j++) {
      c.beginPath();
      c.ellipse(
        x + (j % 2 ? 14 : -9),
        y + 25 + j * 30,
        19,
        7,
        j % 2 ? -0.5 : 0.5,
        0,
        Math.PI * 2,
      );
      c.fillStyle = "#274f4d";
      c.fill();
    }
  }
  c.globalAlpha = 1;
  return el;
}

export function terrainArt(
  terrain: Terrain,
  theme: "garden" | "canyon" | "frost" = "garden",
): HTMLCanvasElement {
  const [el, c] = canvas(terrain.width, terrain.height);
  const pixels = c.createImageData(terrain.width, terrain.height);
  const data = pixels.data;
  for (let y = 0; y < terrain.height; y++)
    for (let x = 0; x < terrain.width; x++) {
      const kind = terrain.cells[y * terrain.width + x];
      if (!kind) continue;
      const i = (y * terrain.width + x) * 4;
      const noise =
        (((Math.imul(x, 374761393) ^ Math.imul(y, 668265263)) >>> 0) % 17) - 8;
      const edge =
        !terrain.solid(x, y - 1) ||
        !terrain.solid(x - 1, y) ||
        !terrain.solid(x + 1, y);
      const grass = kind === 1 && !terrain.solid(x, y - 7);
      const layer = Math.sin(y * 0.055 + Math.sin(x * 0.009) * 1.8);
      const lower = Math.max(0, (y - 470) / 440);
      let red = 126 - lower * 33 + layer * 8 + noise,
        green = 85 - lower * 25 + layer * 5 + noise,
        blue = 60 - lower * 8 + noise * 0.6;
      if (grass) {
        red = 109 + noise;
        green = 146 + noise;
        blue = 87 + noise;
      }
      if (theme === "canyon" && kind === 1) {
        red += 42;
        green += 12;
        blue += 17;
      }
      if (theme === "frost" && kind === 1) {
        red = grass ? 210 + noise : red - 30;
        green = grass ? 229 + noise : green + 15;
        blue = grass ? 235 + noise : blue + 40;
      }
      if (kind === 2) {
        red = 133 + noise;
        green = 178 + noise;
        blue = 94 + noise;
      }
      if (edge) {
        red *= 0.53;
        green *= 0.6;
        blue *= 0.6;
      }
      data[i] = red;
      data[i + 1] = green;
      data[i + 2] = blue;
      data[i + 3] = 255;
    }
  c.putImageData(pixels, 0, 0);
  // Material details clip to the same authoritative mask.
  c.globalCompositeOperation = "source-atop";
  const r = seededRandom(91552);
  for (let i = 0; i < 2100; i++) {
    const x = r() * 1600,
      y = 430 + r() * 470,
      s = 1 + r() * 4;
    c.fillStyle = i % 3 ? "#d5b48623" : "#241f273f";
    c.beginPath();
    c.ellipse(x, y, s * 1.6, s, 0.3, 0, Math.PI * 2);
    c.fill();
  }
  c.lineWidth = 1.4;
  c.strokeStyle = "#d2b58b23";
  for (let i = 0; i < 36; i++) {
    const x = r() * 1600,
      y = 480 + r() * 260;
    c.beginPath();
    c.moveTo(x, y);
    c.bezierCurveTo(x + 18, y + 30, x - 22, y + 55, x + 8, y + 95);
    c.stroke();
  }
  c.globalCompositeOperation = "source-over";
  c.strokeStyle =
    theme === "frost" ? "#d8e9ee" : theme === "canyon" ? "#ccaa78" : "#9caf68";
  c.lineWidth = 2;
  for (let x = 65; x < 1530; x += 7) {
    const y = terrain.surface(x);
    if (y > 795) continue;
    const h = 3 + ((x * 17) % 7);
    c.beginPath();
    c.moveTo(x, y);
    c.lineTo(x - 2, y - h);
    c.moveTo(x + 1, y);
    c.lineTo(x + 4, y - h * 0.65);
    c.stroke();
  }
  return el;
}

export function wormArt(team: number, hurt = false): HTMLCanvasElement {
  const [el, c] = canvas(112, 112);
  c.lineJoin = "round";
  c.lineCap = "round";
  const body = c.createLinearGradient(24, 20, 67, 97);
  body.addColorStop(0, "#ffd8b0");
  body.addColorStop(0.55, "#f5ae8b");
  body.addColorStop(1, "#cc796a");
  c.fillStyle = body;
  c.strokeStyle = "#442e38";
  c.lineWidth = 4;
  c.beginPath();
  c.moveTo(16, 94);
  c.bezierCurveTo(33, 82, 36, 67, 36, 53);
  c.bezierCurveTo(28, 36, 39, 17, 54, 17);
  c.bezierCurveTo(75, 16, 81, 35, 76, 48);
  c.bezierCurveTo(69, 63, 63, 69, 72, 83);
  c.bezierCurveTo(77, 90, 88, 87, 91, 94);
  c.bezierCurveTo(84, 103, 58, 99, 49, 96);
  c.bezierCurveTo(36, 101, 24, 102, 16, 94);
  c.closePath();
  c.fill();
  c.stroke();
  c.strokeStyle = "#ac645d66";
  c.lineWidth = 2;
  for (let i = 0; i < 4; i++) {
    const y = 63 + i * 8;
    c.beginPath();
    c.moveTo(36 - i * 2, y);
    c.quadraticCurveTo(48, y + 6, 62 + i * 2, y + 1);
    c.stroke();
  }
  // Two distinct scarf markers, independent of the team color alone.
  c.fillStyle = team === 0 ? COLORS.coral : COLORS.mint;
  c.strokeStyle = "#463e3d";
  c.lineWidth = 2;
  c.beginPath();
  c.moveTo(36, 57);
  c.quadraticCurveTo(56, 65, 69, 54);
  c.lineTo(66, 64);
  c.quadraticCurveTo(52, 70, 36, 64);
  c.closePath();
  c.fill();
  c.stroke();
  c.beginPath();
  c.moveTo(37, 63);
  c.lineTo(24, 78);
  c.lineTo(team === 0 ? 34 : 20, 78);
  c.lineTo(43, 65);
  c.fill();
  c.stroke();
  c.fillStyle = "#fff7df";
  c.strokeStyle = "#47323c";
  c.lineWidth = 2.3;
  c.beginPath();
  c.ellipse(58, 37, 9, 12, -0.08, 0, Math.PI * 2);
  c.fill();
  c.stroke();
  c.beginPath();
  c.ellipse(73, 36, 8, 10, 0.1, 0, Math.PI * 2);
  c.fill();
  c.stroke();
  c.fillStyle = "#24333b";
  if (hurt) {
    c.strokeStyle = "#24333b";
    for (const x of [60, 74]) {
      c.beginPath();
      c.moveTo(x - 3, 33);
      c.lineTo(x + 3, 39);
      c.moveTo(x + 3, 33);
      c.lineTo(x - 3, 39);
      c.stroke();
    }
  } else {
    c.beginPath();
    c.ellipse(61, 38, 3.1, 5, 0, 0, Math.PI * 2);
    c.ellipse(76, 36, 2.7, 4.5, 0, 0, Math.PI * 2);
    c.fill();
  }
  c.strokeStyle = "#56323c";
  c.lineWidth = 2.5;
  c.beginPath();
  c.moveTo(59, 52);
  c.quadraticCurveTo(66, hurt ? 58 : 55, 72, 49);
  c.stroke();
  c.fillStyle = "#fff0c850";
  c.beginPath();
  c.ellipse(43, 29, 3, 6, 0.4, 0, Math.PI * 2);
  c.fill();
  return el;
}

export function weaponArt(kind: string): HTMLCanvasElement {
  const [el, c] = canvas(140, 62);
  c.lineCap = "round";
  c.lineJoin = "round";
  c.strokeStyle = "#25343b";
  c.lineWidth = 4;
  if (["shotgun", "sniper", "mortar"].includes(kind)) {
    c.fillStyle =
      kind === "sniper" ? "#99c9cf" : kind === "mortar" ? "#b7a474" : "#ad7d59";
    c.beginPath();
    c.roundRect(18, 22, kind === "sniper" ? 106 : 84, 18, 5);
    c.fill();
    c.stroke();
    c.fillStyle = "#3a4547";
    c.fillRect(85, 20, 35, 12);
    c.fillStyle = "#d6ba8b";
    c.beginPath();
    c.roundRect(47, 36, 17, 20, 4);
    c.fill();
    c.stroke();
    if (kind === "sniper") {
      c.fillStyle = "#405664";
      c.beginPath();
      c.roundRect(48, 8, 42, 10, 4);
      c.fill();
      c.stroke();
    }
    if (kind === "shotgun") {
      c.fillStyle = "#344044";
      c.fillRect(90, 32, 32, 8);
    }
    if (kind === "mortar") {
      c.fillStyle = "#dcc992";
      c.beginPath();
      c.moveTo(40, 48);
      c.lineTo(102, 48);
      c.lineTo(76, 31);
      c.closePath();
      c.fill();
      c.stroke();
    }
  } else if (kind === "cluster") {
    for (const [x, y] of [
      [51, 36],
      [82, 35],
      [67, 20],
    ]) {
      c.fillStyle = "#c79551";
      c.beginPath();
      c.arc(x, y, 15, 0, Math.PI * 2);
      c.fill();
      c.stroke();
      c.fillStyle = "#e6c889";
      c.beginPath();
      c.arc(x - 4, y - 5, 4, 0, Math.PI * 2);
      c.fill();
    }
    c.strokeStyle = "#ffe3a0";
    c.beginPath();
    c.moveTo(70, 7);
    c.lineTo(83, 2);
    c.stroke();
  } else if (kind === "dynamite") {
    for (let i = 0; i < 3; i++) {
      c.fillStyle = ["#c56958", "#e68c70", "#b75a4b"][i];
      c.beginPath();
      c.roundRect(37 + i * 21, 12, 22, 43, 5);
      c.fill();
      c.stroke();
    }
    c.fillStyle = "#eed0a0";
    c.fillRect(34, 27, 69, 9);
    c.strokeStyle = "#f1d391";
    c.beginPath();
    c.moveTo(69, 11);
    c.quadraticCurveTo(90, -3, 99, 8);
    c.stroke();
  } else if (kind === "airstrike") {
    c.fillStyle = "#c4addb";
    c.beginPath();
    c.moveTo(18, 27);
    c.lineTo(121, 27);
    c.lineTo(81, 38);
    c.lineTo(53, 38);
    c.closePath();
    c.fill();
    c.stroke();
    c.fillStyle = "#a8c47f";
    for (let i = 0; i < 3; i++) {
      c.beginPath();
      c.ellipse(46 + i * 23, 49, 5, 8, -0.25, 0, Math.PI * 2);
      c.fill();
      c.stroke();
    }
    c.fillStyle = "#ece0b5";
    c.beginPath();
    c.moveTo(51, 25);
    c.lineTo(69, 8);
    c.lineTo(83, 25);
    c.fill();
    c.stroke();
  } else if (kind === "teleport") {
    c.strokeStyle = "#a7dbe6";
    c.lineWidth = 6;
    c.beginPath();
    c.ellipse(70, 32, 32, 23, -0.2, 0, Math.PI * 2);
    c.stroke();
    c.fillStyle = "#dfd3f0";
    c.beginPath();
    c.moveTo(73, 7);
    c.lineTo(55, 34);
    c.lineTo(70, 34);
    c.lineTo(63, 57);
    c.lineTo(87, 25);
    c.lineTo(73, 26);
    c.closePath();
    c.fill();
  } else if (kind === "medkit") {
    c.fillStyle = "#efe0b5";
    c.beginPath();
    c.roundRect(32, 13, 76, 42, 8);
    c.fill();
    c.stroke();
    c.strokeStyle = "#d28a77";
    c.lineWidth = 9;
    c.beginPath();
    c.moveTo(70, 23);
    c.lineTo(70, 44);
    c.moveTo(59, 33);
    c.lineTo(81, 33);
    c.stroke();
    c.strokeStyle = "#25343b";
    c.lineWidth = 4;
    c.beginPath();
    c.roundRect(57, 5, 26, 8, 3);
    c.stroke();
  } else if (kind === "rocket") {
    c.fillStyle = "#9dab6c";
    c.beginPath();
    c.roundRect(16, 13, 104, 30, 7);
    c.fill();
    c.stroke();
    c.fillStyle = "#d4ca8f";
    c.fillRect(22, 15, 7, 25);
    c.fillRect(87, 15, 8, 25);
    c.fillStyle = "#3b4a46";
    c.beginPath();
    c.ellipse(119, 28, 8, 15, 0, 0, Math.PI * 2);
    c.fill();
    c.stroke();
    c.fillStyle = "#a28062";
    c.beginPath();
    c.roundRect(62, 42, 17, 15, 4);
    c.fill();
    c.stroke();
    c.fillStyle = "#e5dbad";
    c.fillRect(60, 8, 17, 5);
  } else if (kind === "grenade") {
    c.fillStyle = "#849662";
    c.beginPath();
    c.ellipse(68, 36, 22, 22, 0, 0, Math.PI * 2);
    c.fill();
    c.stroke();
    c.strokeStyle = "#4a6549";
    c.lineWidth = 2;
    for (let i = -1; i <= 1; i++) {
      c.beginPath();
      c.moveTo(49, 36 + i * 9);
      c.lineTo(86, 36 + i * 9);
      c.stroke();
    }
    c.strokeStyle = "#e6d49b";
    c.lineWidth = 4;
    c.beginPath();
    c.moveTo(70, 14);
    c.quadraticCurveTo(68, 2, 86, 4);
    c.stroke();
    c.fillStyle = "#ffd780";
    c.beginPath();
    c.arc(87, 5, 4, 0, Math.PI * 2);
    c.fill();
  } else if (kind === "shove") {
    c.fillStyle = "#dac49d";
    c.beginPath();
    c.roundRect(30, 15, 55, 33, 12);
    c.fill();
    c.stroke();
    c.fillStyle = "#b19bd1";
    c.beginPath();
    c.ellipse(90, 30, 20, 15, 0, 0, Math.PI * 2);
    c.fill();
    c.stroke();
  } else {
    c.fillStyle = "#a9c274";
    c.beginPath();
    c.moveTo(20, 45);
    c.bezierCurveTo(45, -2, 109, 7, 123, 17);
    c.bezierCurveTo(100, 54, 49, 59, 20, 45);
    c.fill();
    c.stroke();
    c.strokeStyle = "#546d49";
    c.lineWidth = 3;
    c.beginPath();
    c.moveTo(21, 45);
    c.lineTo(118, 18);
    c.stroke();
  }
  return el;
}

export function puffArt(): HTMLCanvasElement {
  const [el, c] = canvas(64, 64);
  const g = c.createRadialGradient(32, 32, 0, 32, 32, 31);
  g.addColorStop(0, "#ffffffff");
  g.addColorStop(0.5, "#ffffffbb");
  g.addColorStop(1, "#ffffff00");
  c.fillStyle = g;
  c.fillRect(0, 0, 64, 64);
  return el;
}
