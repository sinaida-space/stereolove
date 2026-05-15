import { DEFAULT_EYE, PALETTE } from "./config.js";
import { clamp, projectPoint, rotate2 } from "./projection.js";
import { QUESTIONS } from "./questions.js";

const BOX_DEPTH = 16;
const WALL_DOT_LIMIT = 110;

export function createScene(screen, random = Math.random) {
  const box = createBox(screen);
  const wallGlyphs = createWallGlyphs(box, random);
  const field = createField(screen, random);
  const rosettes = createRosettes(random);
  const frames = createFrames(screen);

  return { box, wallGlyphs, field, rosettes, frames };
}

export function drawScene(ctx, scene, state) {
  const { viewport } = state;

  ctx.fillStyle = PALETTE.background;
  ctx.fillRect(0, 0, viewport.width, viewport.height);

  const box = makeOpenedBox(scene.box, state);

  drawOuterDarkness(ctx, state);
  drawBackWall(ctx, box, state);
  drawWall(ctx, box.ceiling, state, "ceiling");
  drawWall(ctx, box.floor, state, "floor");
  drawWall(ctx, box.left, state, "left");
  drawWall(ctx, box.right, state, "right");
  drawWallPatterns(ctx, box, state);
  drawRetinalField(ctx, scene.field, state);
  drawWallGlyphs(ctx, scene.wallGlyphs, box, state);
  drawFrames(ctx, scene.frames, state);
  drawRosettes(ctx, scene.rosettes, state);
  drawApertureRim(ctx, scene.box, state);
  drawVignette(ctx, viewport);
}

export function createBox(screen) {
  const halfW = screen.width * 0.5;
  const halfH = screen.height * 0.5;
  const frontZ = -0.05;
  const backZ = -BOX_DEPTH;

  return {
    halfW,
    halfH,
    frontZ,
    backZ,
    left: [
      { x: -halfW, y: -halfH, z: frontZ },
      { x: -halfW, y: halfH, z: frontZ },
      { x: -halfW, y: halfH, z: backZ },
      { x: -halfW, y: -halfH, z: backZ },
    ],
    right: [
      { x: halfW, y: -halfH, z: frontZ },
      { x: halfW, y: -halfH, z: backZ },
      { x: halfW, y: halfH, z: backZ },
      { x: halfW, y: halfH, z: frontZ },
    ],
    ceiling: [
      { x: -halfW, y: halfH, z: frontZ },
      { x: halfW, y: halfH, z: frontZ },
      { x: halfW, y: halfH, z: backZ },
      { x: -halfW, y: halfH, z: backZ },
    ],
    floor: [
      { x: -halfW, y: -halfH, z: frontZ },
      { x: -halfW, y: -halfH, z: backZ },
      { x: halfW, y: -halfH, z: backZ },
      { x: halfW, y: -halfH, z: frontZ },
    ],
    back: [
      { x: -halfW, y: -halfH, z: backZ },
      { x: halfW, y: -halfH, z: backZ },
      { x: halfW, y: halfH, z: backZ },
      { x: -halfW, y: halfH, z: backZ },
    ],
  };
}

export function makeOpenedBox(box, state) {
  const { eye, time } = state;
  const openX = clamp(Math.abs(eye.x) / 1.5, 0, 1);
  const openY = clamp(Math.abs(eye.y) / 1.0, 0, 1);
  const pulse = Math.sin(time * 0.8) * 0.08;
  const leftOpen = (0.25 + Math.max(0, -eye.x) * 0.28 + openX * 0.4 + pulse) * box.halfW;
  const rightOpen = (0.25 + Math.max(0, eye.x) * 0.28 + openX * 0.4 - pulse) * box.halfW;
  const topOpen = (0.15 + Math.max(0, eye.y) * 0.18 + openY * 0.24) * box.halfH;
  const bottomOpen = (0.15 + Math.max(0, -eye.y) * 0.18 + openY * 0.24) * box.halfH;

  const opened = structuredClone(box);

  opened.left[2].x -= leftOpen;
  opened.left[3].x -= leftOpen;
  opened.right[1].x += rightOpen;
  opened.right[2].x += rightOpen;
  opened.ceiling[2].y += topOpen;
  opened.ceiling[3].y += topOpen;
  opened.floor[1].y -= bottomOpen;
  opened.floor[2].y -= bottomOpen;

  opened.back = [opened.floor[1], opened.floor[2], opened.ceiling[2], opened.ceiling[3]];

  return opened;
}

function drawWall(ctx, corners, state, name) {
  const projected = corners.map((corner) =>
    projectPoint(corner, state.eye, state.screen, state.viewport, state.dpr),
  );
  if (projected.some((point) => !point.visible)) return;

  const gradient = ctx.createLinearGradient(
    projected[0].x,
    projected[0].y,
    projected[2].x,
    projected[2].y,
  );
  const tint = wallTint(name);
  gradient.addColorStop(0, `rgba(${tint}, 0.22)`);
  gradient.addColorStop(0.55, "rgba(5, 6, 9, 0.34)");
  gradient.addColorStop(1, `rgba(${tint}, 0.08)`);

  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.moveTo(projected[0].x, projected[0].y);
  for (let i = 1; i < projected.length; i += 1) ctx.lineTo(projected[i].x, projected[i].y);
  ctx.closePath();
  ctx.fill();
}

function drawBackWall(ctx, box, state) {
  drawWall(ctx, box.back, state, "back");
  const center = bilerp(box.back, 0.5, 0.5);
  const radius = 1.2 + Math.sin(state.time * 0.7) * 0.2;
  for (let ring = 0; ring < 10; ring += 1) {
    const points = [];
    const count = 48;
    for (let i = 0; i <= count; i += 1) {
      const angle = (i / count) * Math.PI * 2 + ring * 0.11;
      points.push({
        x: center.x + Math.cos(angle) * radius * (ring + 1) * 0.11,
        y: center.y + Math.sin(angle * 3) * radius * (ring + 1) * 0.05,
        z: center.z - 0.02,
      });
    }
    drawPolyline(ctx, points, state, ring % 2 ? PALETTE.violet : PALETTE.cyan, 0.18, 1);
  }
}

function drawWallPatterns(ctx, box, state) {
  for (const [name, corners] of Object.entries({
    left: box.left,
    right: box.right,
    ceiling: box.ceiling,
    floor: box.floor,
  })) {
    const tint = wallTint(name);
    const focus = wallFocus(name, state.eye);
    const lineAlpha = 0.12 + focus * 0.22;

    for (let i = 0; i <= 18; i += 1) {
      const u = i / 18;
      drawSurfaceLine(ctx, corners, u, 0, u, 1, state, tint, lineAlpha, 0.7);
    }

    for (let i = 0; i <= 10; i += 1) {
      const v = i / 10;
      drawSurfaceLine(ctx, corners, 0, v, 1, v, state, PALETTE.ink, 0.08 + focus * 0.1, 0.7);
    }

    for (let i = 0; i < 16; i += 1) {
      const offset = (i / 16 + state.time * 0.015) % 1;
      drawSurfaceLine(
        ctx,
        corners,
        0,
        offset,
        1,
        1 - offset,
        state,
        tint,
        0.05 + focus * 0.08,
        0.6,
      );
    }
  }
}

function drawWallGlyphs(ctx, glyphs, box, state) {
  const surfaces = {
    left: box.left,
    right: box.right,
    ceiling: box.ceiling,
    floor: box.floor,
    back: box.back,
  };

  for (const glyph of glyphs) {
    const corners = surfaces[glyph.wall];
    const focus = wallFocus(glyph.wall, state.eye);
    const alpha = glyph.baseAlpha + focus * 0.62;

    for (const dot of glyph.dots) {
      const u = clamp(glyph.u + dot.x * glyph.width, 0.025, 0.975);
      const v = clamp(glyph.v + dot.y * glyph.height, 0.045, 0.955);
      const world = bilerp(corners, u, v);
      const p = projectPoint(world, state.eye, state.screen, state.viewport, state.dpr);
      if (!p.visible) continue;

      const size = clamp((glyph.size + dot.weight * 0.9) * p.scale * 13, 0.55, 5.2);
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(glyph.rotation + state.time * glyph.spin);
      ctx.fillStyle = `rgba(${glyph.color}, ${alpha})`;
      ctx.fillRect(-size / 2, -size / 2, size, size);
      ctx.restore();
    }
  }
}

function drawFrames(ctx, frames, state) {
  const { time, depth, screen } = state;
  for (const frame of frames) {
    const z = frame.z * depth;
    const rot = frame.rot + Math.sin(time * frame.speed) * 0.025;
    const corners = [
      rotate2(-screen.width / 2, -screen.height / 2, rot),
      rotate2(screen.width / 2, -screen.height / 2, rot),
      rotate2(screen.width / 2, screen.height / 2, rot),
      rotate2(-screen.width / 2, screen.height / 2, rot),
    ].map((point) => ({ x: point.x * frame.scale, y: point.y * frame.scale, z }));

    for (let i = 0; i < corners.length; i += 1) {
      drawWorldLine(
        ctx,
        corners[i],
        corners[(i + 1) % corners.length],
        state,
        i % 2 ? PALETTE.ink : frame.color,
        frame.opacity,
        1.2,
      );
    }
  }
}

function drawRosettes(ctx, rosettes, state) {
  const { time, depth } = state;
  for (const rosette of rosettes) {
    const z = rosette.z * depth;
    for (let i = 0; i < rosette.arms; i += 1) {
      const angle = (i / rosette.arms) * Math.PI * 2 + time * rosette.speed + rosette.phase;
      const inner = {
        x: rosette.x + Math.cos(angle) * rosette.radius * 0.08,
        y: rosette.y + Math.sin(angle) * rosette.radius * 0.08,
        z,
      };
      const outer = {
        x: rosette.x + Math.cos(angle * rosette.fold) * rosette.radius,
        y: rosette.y + Math.sin(angle) * rosette.radius,
        z: z - rosette.depth,
      };
      drawWorldLine(ctx, inner, outer, state, rosette.color, 0.16, 1.1);
    }
  }
}

function drawRetinalField(ctx, points, state) {
  for (const point of points) {
    const z = point.z * state.depth;
    const p = projectPoint(
      {
        x: point.x + Math.sin(state.time * point.speed + point.phase) * 0.025,
        y: point.y + Math.cos(state.time * point.speed + point.phase) * 0.012,
        z,
      },
      state.eye,
      state.screen,
      state.viewport,
      state.dpr,
    );
    if (!p.visible) continue;

    ctx.fillStyle = `rgba(${point.color}, ${clamp(0.08 + p.depth * 0.42, 0.05, 0.45)})`;
    ctx.beginPath();
    ctx.arc(p.x, p.y, Math.max(0.45, p.scale * point.size), 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawApertureRim(ctx, box, state) {
  const front = [
    { x: -box.halfW, y: -box.halfH, z: box.frontZ },
    { x: box.halfW, y: -box.halfH, z: box.frontZ },
    { x: box.halfW, y: box.halfH, z: box.frontZ },
    { x: -box.halfW, y: box.halfH, z: box.frontZ },
  ];

  for (let i = 0; i < front.length; i += 1) {
    drawWorldLine(ctx, front[i], front[(i + 1) % front.length], state, PALETTE.ink, 0.78, 2.4);
  }

  for (let inset = 1; inset <= 5; inset += 1) {
    const scale = 1 - inset * 0.018;
    const corners = front.map((point) => ({
      x: point.x * scale,
      y: point.y * scale,
      z: point.z - inset * 0.035,
    }));
    for (let i = 0; i < corners.length; i += 1) {
      drawWorldLine(
        ctx,
        corners[i],
        corners[(i + 1) % corners.length],
        state,
        PALETTE.cyan,
        0.1,
        1,
      );
    }
  }
}

function drawOuterDarkness(ctx, state) {
  const { viewport } = state;
  const gradient = ctx.createLinearGradient(0, 0, viewport.width, viewport.height);
  gradient.addColorStop(0, "rgba(4, 5, 8, 1)");
  gradient.addColorStop(0.5, "rgba(7, 8, 12, 1)");
  gradient.addColorStop(1, "rgba(3, 4, 7, 1)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, viewport.width, viewport.height);
}

function drawVignette(ctx, viewport) {
  const gradient = ctx.createRadialGradient(
    viewport.width / 2,
    viewport.height / 2,
    viewport.height * 0.2,
    viewport.width / 2,
    viewport.height / 2,
    viewport.height * 0.88,
  );
  gradient.addColorStop(0, "rgba(5, 6, 9, 0)");
  gradient.addColorStop(1, "rgba(5, 6, 9, 0.62)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, viewport.width, viewport.height);
}

function drawSurfaceLine(ctx, corners, u0, v0, u1, v1, state, color, alpha, lineWidth = 1) {
  drawWorldLine(
    ctx,
    bilerp(corners, u0, v0),
    bilerp(corners, u1, v1),
    state,
    color,
    alpha,
    lineWidth,
  );
}

function drawWorldLine(ctx, a, b, state, color, alpha, lineWidth = 1) {
  const pa = projectPoint(a, state.eye, state.screen, state.viewport, state.dpr);
  const pb = projectPoint(b, state.eye, state.screen, state.viewport, state.dpr);
  if (!pa.visible && !pb.visible) return;

  ctx.strokeStyle = `rgba(${color}, ${alpha})`;
  ctx.lineWidth = lineWidth * state.dpr;
  ctx.beginPath();
  ctx.moveTo(pa.x, pa.y);
  ctx.lineTo(pb.x, pb.y);
  ctx.stroke();
}

function drawPolyline(ctx, points, state, color, alpha, lineWidth) {
  const projected = points.map((point) =>
    projectPoint(point, state.eye, state.screen, state.viewport, state.dpr),
  );
  if (projected.every((point) => !point.visible)) return;

  ctx.strokeStyle = `rgba(${color}, ${alpha})`;
  ctx.lineWidth = lineWidth * state.dpr;
  ctx.beginPath();
  projected.forEach((point, index) => {
    if (index === 0) ctx.moveTo(point.x, point.y);
    else ctx.lineTo(point.x, point.y);
  });
  ctx.stroke();
}

export function bilerp(corners, u, v) {
  const a = mixPoint(corners[0], corners[1], v);
  const b = mixPoint(corners[3], corners[2], v);
  return mixPoint(a, b, u);
}

function mixPoint(a, b, t) {
  return {
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t,
    z: a.z + (b.z - a.z) * t,
  };
}

function wallTint(name) {
  return {
    left: PALETTE.violet,
    right: PALETTE.cyan,
    ceiling: PALETTE.gold,
    floor: PALETTE.green,
    back: PALETTE.red,
  }[name];
}

export function wallFocus(name, eye) {
  const byWall = {
    left: clamp(-eye.x / 1.25, 0, 1),
    right: clamp(eye.x / 1.25, 0, 1),
    ceiling: clamp(eye.y / 0.85, 0, 1),
    floor: clamp(-eye.y / 0.85, 0, 1),
    back: clamp((DEFAULT_EYE.z - eye.z + 1.2) / 2.2, 0, 1),
  };
  return byWall[name] ?? 0.15;
}

function createWallGlyphs(box, random) {
  const walls = ["left", "right", "ceiling", "floor", "back"];
  const colors = [PALETTE.cyan, PALETTE.violet, PALETTE.gold, PALETTE.green, PALETTE.red];

  return QUESTIONS.map((question, index) => {
    const wall = walls[index % walls.length];
    const row = Math.floor(index / walls.length);
    const column = index % 3;
    const dots = sampleQuestion(question, random);

    return {
      wall,
      dots,
      u: 0.16 + column * 0.3 + random() * 0.025,
      v: 0.16 + (row % 4) * 0.22 + random() * 0.025,
      width: wall === "back" ? 0.24 : 0.18,
      height: wall === "back" ? 0.12 : 0.1,
      size: 0.85 + random() * 0.35,
      color: colors[index % colors.length],
      rotation: random() * Math.PI,
      spin: (random() - 0.5) * 0.012,
      baseAlpha: wall === "back" ? 0.2 : 0.12,
    };
  });
}

function sampleQuestion(text, random) {
  const canvas = document.createElement("canvas");
  canvas.width = 620;
  canvas.height = 220;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#fff";
  ctx.font = "700 30px Arial, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  const lines = wrapText(ctx, text.toUpperCase(), 520);
  const lineHeight = 34;
  const startY = canvas.height / 2 - ((lines.length - 1) * lineHeight) / 2;
  lines.forEach((line, index) => ctx.fillText(line, canvas.width / 2, startY + index * lineHeight));

  const image = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
  const candidates = [];
  for (let y = 0; y < canvas.height; y += 4) {
    for (let x = 0; x < canvas.width; x += 4) {
      if (image[(y * canvas.width + x) * 4] > 80 && random() > 0.18) {
        candidates.push({
          x: x / canvas.width - 0.5,
          y: y / canvas.height - 0.5,
          weight: random(),
        });
      }
    }
  }

  return shuffle(candidates, random).slice(0, WALL_DOT_LIMIT);
}

function wrapText(ctx, text, maxWidth) {
  const words = text.split(" ");
  const lines = [];
  let line = "";

  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines.slice(0, 4);
}

function createFrames(screen) {
  return Array.from({ length: 14 }, (_, i) => ({
    z: -1.15 - i * 0.9,
    scale: 1 - i * 0.018,
    rot: (i % 2 === 0 ? 1 : -1) * 0.01 * i,
    opacity: i % 3 === 0 ? 0.22 : 0.1,
    speed: 0.25 + i * 0.02,
    color: i % 2 ? PALETTE.violet : PALETTE.cyan,
    screen,
  }));
}

function createField(screen, random) {
  const palette = [
    PALETTE.cyan,
    PALETTE.red,
    PALETTE.ink,
    PALETTE.gold,
    PALETTE.violet,
    PALETTE.green,
  ];
  return Array.from({ length: 3200 }, () => {
    const z = -1.2 - random() * 14;
    const spread = 1.25 + Math.abs(z) * 0.11;
    return {
      x: (random() - 0.5) * screen.width * spread,
      y: (random() - 0.5) * screen.height * spread,
      z,
      size: 0.55 + random() * 1.25,
      speed: 0.35 + random() * 0.65,
      phase: random() * Math.PI * 2,
      color: palette[Math.floor(random() * palette.length)],
    };
  });
}

function createRosettes(random) {
  const palette = [PALETTE.cyan, PALETTE.red, PALETTE.gold, PALETTE.violet, PALETTE.green];
  return Array.from({ length: 7 }, (_, i) => ({
    x: ((i % 3) - 1) * 1.45,
    y: (Math.floor(i / 3) - 1) * 0.72,
    z: -5.2 - i * 1.35,
    radius: 0.5 + random() * 0.42,
    depth: 0.6 + random() * 1.1,
    arms: 20 + (i % 3) * 10,
    fold: 2 + (i % 4),
    speed: (i % 2 ? -1 : 1) * (0.035 + random() * 0.04),
    phase: random() * Math.PI * 2,
    color: palette[i % palette.length],
  }));
}

function shuffle(items, random) {
  for (let i = items.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
  return items;
}
