import { DEFAULT_EYE, PALETTE } from "./config.js";
import { clamp, projectPoint, rotate2 } from "./projection.js";
import { QUESTIONS } from "./questions.js";

const TUNNEL_DEPTH = -17.5;
const STAR_DEPTH = 17.8;
const BACKGROUND_COLORS = ["245, 241, 232", "198, 248, 255", "94, 242, 255"];
const TEXT_COLORS = ["64, 232, 255", "94, 242, 255", "142, 252, 255", "204, 255, 255"];
const QUALITY_PRESETS = {
  high: { frames: 32, spokes: 24, stars: 2400, outline: 480, fill: 680, sampleStep: 5 },
  balanced: { frames: 18, spokes: 18, stars: 1500, outline: 360, fill: 520, sampleStep: 6 },
  mobile: { frames: 12, spokes: 12, stars: 850, outline: 240, fill: 340, sampleStep: 7 },
  mobileLow: { frames: 9, spokes: 8, stars: 560, outline: 180, fill: 260, sampleStep: 8 },
  low: { frames: 12, spokes: 12, stars: 850, outline: 250, fill: 320, sampleStep: 7 },
  panic: { frames: 8, spokes: 6, stars: 360, outline: 130, fill: 180, sampleStep: 9 },
};

const GLOW_SPRITE_SIZE = 64;
const GLYPH_GLOW_SCALE = 0.5;
const glowSprites = new Map();
let backdropLayer = null;
let vignetteLayer = null;
let glyphGlowLayer = null;
let glyphGlowKey = "";

/**
 * A radial glow baked once into a small offscreen canvas.
 *
 * Setting ctx.shadowBlur while the context is in a non-"source-over" blend mode
 * makes the compositor allocate a full-bounds offscreen layer for every single
 * draw call. The scene issues ~950 glowing draws per frame, so that path cost
 * seconds per frame and starved the GPU process. Blitting a cached sprite under
 * "lighter" produces the same additive bloom for the price of one textured quad.
 */
function getGlowSprite(color) {
  const cached = glowSprites.get(color);
  if (cached) return cached;

  const sprite = document.createElement("canvas");
  sprite.width = GLOW_SPRITE_SIZE;
  sprite.height = GLOW_SPRITE_SIZE;
  const half = GLOW_SPRITE_SIZE / 2;
  const spriteCtx = sprite.getContext("2d");
  const gradient = spriteCtx.createRadialGradient(half, half, 0, half, half, half);
  gradient.addColorStop(0, `rgba(${color}, 0.9)`);
  gradient.addColorStop(0.18, `rgba(${color}, 0.42)`);
  gradient.addColorStop(0.45, `rgba(${color}, 0.12)`);
  gradient.addColorStop(0.72, `rgba(${color}, 0.03)`);
  gradient.addColorStop(1, `rgba(${color}, 0)`);
  spriteCtx.fillStyle = gradient;
  spriteCtx.fillRect(0, 0, GLOW_SPRITE_SIZE, GLOW_SPRITE_SIZE);

  glowSprites.set(color, sprite);
  return sprite;
}

/** Offscreen canvas reused while the viewport keeps its size. */
function acquireLayer(layer, width, height) {
  if (layer && layer.canvas.width === width && layer.canvas.height === height) return layer;

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  return { canvas, ctx: canvas.getContext("2d") };
}

export function createScene(screen, random = Math.random, quality = "high", questionSet = null) {
  const preset = QUALITY_PRESETS[quality] ?? QUALITY_PRESETS.high;
  const frames = createFrames(screen, random, preset);
  const spokes = createSpokes(screen, random, preset);
  const field = createField(screen, random, preset);
  const questionPlanes = createQuestionPlanes(screen, random, preset, questionSet);

  return { frames, spokes, field, questionPlanes };
}

export function drawScene(ctx, scene, state) {
  // A zero-area viewport (a hidden tab, a collapsed pane) would make the cached
  // layers zero-sized, and drawImage throws on a zero-sized source.
  if (state.viewport.width < 1 || state.viewport.height < 1) return;

  const activeQuestion = selectActiveQuestion(scene.questionPlanes, state.questionIndex);

  drawVoid(ctx, state);
  drawStarField(ctx, scene.field, state);
  drawTunnel(ctx, scene, state);
  drawQuestionConstellation(ctx, activeQuestion, state);
  drawQuestionLock(ctx, activeQuestion, state);
  drawAperture(ctx, state);
}

export function selectActiveQuestion(questionPlanes, index = 0) {
  if (!questionPlanes.length) return null;

  const slot = questionPlanes[Math.abs(Math.floor(index)) % questionPlanes.length];
  if (slot.build) {
    Object.assign(slot, slot.build());
    delete slot.build;
  }
  return slot;
}

export function createFrames(screen, random = Math.random, preset = QUALITY_PRESETS.high) {
  const count = preset.frames;
  return Array.from({ length: count }, (_, i) => {
    const depth = count <= 1 ? 0 : i / (count - 1);
    const z = -0.55 - depth * Math.abs(TUNNEL_DEPTH);
    const shimmer = (random() - 0.5) * 0.014;

    return {
      z,
      w: screen.width * (1.1 + shimmer),
      h: screen.height * (1.1 + shimmer * 0.7),
      x: 0,
      y: 0,
      rot: 0,
      opacity: 0.035 + (1 - depth) * 0.12 + (i % 6 === 0 ? 0.055 : 0),
      color: i % 3 === 0 ? PALETTE.cyan : BACKGROUND_COLORS[i % BACKGROUND_COLORS.length],
      facet: 0,
      near: 1 - depth,
    };
  });
}

function createSpokes(screen, random, preset = QUALITY_PRESETS.high) {
  const spokes = [];
  const count = preset.spokes;

  for (let i = 0; i < count; i += 1) {
    const side = i % 4;
    const t = (Math.floor(i / 4) + 0.5) / Math.ceil(count / 4);
    const point = perimeterPoint(screen, side, t);
    const wobble = (random() - 0.5) * 0.018;
    spokes.push({
      x: point.x + wobble,
      y: point.y + wobble * 0.62,
      color: i % 4 === 0 ? PALETTE.cyan : BACKGROUND_COLORS[i % BACKGROUND_COLORS.length],
      alpha: 0.026 + random() * 0.064,
      width: 0.12 + random() * 0.34,
    });
  }

  return spokes;
}

function perimeterPoint(screen, side, t) {
  if (side === 0) return { x: (t - 0.5) * screen.width * 1.12, y: -screen.height * 0.56 };
  if (side === 1) return { x: screen.width * 0.56, y: (0.5 - t) * screen.height * 1.12 };
  if (side === 2) return { x: (0.5 - t) * screen.width * 1.12, y: screen.height * 0.56 };
  return { x: -screen.width * 0.56, y: (t - 0.5) * screen.height * 1.12 };
}

function createField(screen, random, preset = QUALITY_PRESETS.high) {
  return Array.from({ length: preset.stars }, (_, i) => {
    const z = -0.55 - random() * STAR_DEPTH;
    const angle = random() * Math.PI * 2;
    const shell = Math.pow(random(), 0.28);
    const core = random() < 0.18;
    const radiusX = screen.width * (core ? 0.08 + random() * 0.28 : 0.2 + shell * 0.38);
    const radiusY = screen.height * (core ? 0.08 + random() * 0.26 : 0.2 + shell * 0.38);
    const comet = random() < (core ? 0.016 : 0.036);

    return {
      x: Math.cos(angle) * radiusX + (random() - 0.5) * screen.width * 0.05,
      y: Math.sin(angle) * radiusY + (random() - 0.5) * screen.height * 0.05,
      z,
      size: core ? 0.42 + random() * 0.78 : 0.52 + random() * 1.55,
      bloom: core ? 0.8 + random() * 1.4 : random() < 0.22 ? 0.35 + random() * 0.9 : 0,
      speed: core ? 0.036 + random() * 0.0345 : 0.04875 + random() * 0.05625,
      phase: random(),
      trail: comet ? 0.14 + random() * 0.16 : 0.04 + random() * 0.07,
      comet,
      color:
        BACKGROUND_COLORS[
          (i + Math.floor(random() * BACKGROUND_COLORS.length)) % BACKGROUND_COLORS.length
        ],
    };
  });
}

function createQuestionPlanes(screen, random, preset = QUALITY_PRESETS.high, questionSet = null) {
  const picked = questionSet?.length
    ? [...questionSet]
    : shuffle([...QUESTIONS], random).slice(0, 12);
  const touchFriendly =
    globalThis.innerWidth <= 820 ||
    globalThis.innerHeight <= 480 ||
    globalThis.matchMedia?.("(pointer: coarse)").matches === true;
  const revealRangeX = touchFriendly ? 0.34 : 0.52;
  const revealRangeY = touchFriendly ? 0.2 : 0.3;

  // Building one plane rasterises the question into an offscreen canvas and
  // scans every pixel, so twelve of them up front is a visible stall on load,
  // on resize and on every quality change. Only the plane being looked at is
  // ever drawn, so the rest are built on first access.
  return picked.map((question, index) => ({
    question,
    build: () => buildQuestionPlane(question, index, screen, random, preset, {
      revealRangeX,
      revealRangeY,
    }),
  }));
}

function buildQuestionPlane(question, index, screen, random, preset, ranges) {
  const x = Math.sin(index * 1.47) * screen.width * 0.1;
  const y = Math.cos(index * 1.21) * screen.height * 0.09;
  const rot = (random() - 0.5) * 0.09;
  const revealEye = {
    x: (random() - 0.5) * ranges.revealRangeX,
    y: (random() - 0.5) * ranges.revealRangeY,
    z: DEFAULT_EYE.z,
  };
  const points = createAnamorphicQuestionPoints(
    sampleQuestionPoints(question, random, preset),
    { x, y, rot, revealEye },
    screen,
    random,
  );

  return {
    question,
    lines: wrapQuestion(question),
    points,
    outlinePoints: points.filter((point) => point.edge).sort((a, b) => a.edgeOrder - b.edgeOrder),
    x,
    y,
    rot,
    revealEye,
    color: TEXT_COLORS[index % TEXT_COLORS.length],
  };
}

export function anamorphicPointForView(screenPoint, z, revealEye) {
  const scale = (revealEye.z - z) / revealEye.z;
  return {
    x: revealEye.x + (screenPoint.x - revealEye.x) * scale,
    y: revealEye.y + (screenPoint.y - revealEye.y) * scale,
    z,
  };
}

function createAnamorphicQuestionPoints(samples, question, screen, random) {
  const width = screen.width * 0.86;
  const height = screen.height * 0.72;

  return samples.map((sample, index) => {
    const rotated = rotate2(sample.x * width, sample.y * height, question.rot);
    const target = {
      x: question.x + rotated.x,
      y: question.y + rotated.y,
    };
    const z = -1.2 - random() * 12.8;
    const world = anamorphicPointForView(target, z, question.revealEye);

    return {
      ...world,
      weight: sample.weight,
      edge: sample.edge,
      edgeOrder: sample.edgeOrder,
      sampleX: sample.sampleX,
      sampleY: sample.sampleY,
      size: sample.edge ? 1.1 + random() * 1.42 : 0.76 + random() * 1.32,
      colorShift: index % TEXT_COLORS.length,
      scatterX: (random() - 0.5) * screen.width * (0.045 + random() * 0.08),
      scatterY: (random() - 0.5) * screen.height * (0.04 + random() * 0.065),
      scatterZ: (random() - 0.5) * 1.25,
      elastic: 0.35 + random() * 1.15,
      orbit: random() * Math.PI * 2,
    };
  });
}

function sampleQuestionPoints(text, random, preset = QUALITY_PRESETS.high) {
  const canvas = document.createElement("canvas");
  canvas.width = 980;
  canvas.height = 560;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#fff";
  ctx.font = '760 68px "Avenir Next", "Helvetica Neue", Arial, sans-serif';
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  const lines = wrapCanvasText(ctx, text.toUpperCase(), 540);
  const lineHeight = 76;
  const startY = canvas.height / 2 - ((lines.length - 1) * lineHeight) / 2;
  lines.forEach((line, index) => ctx.fillText(line, canvas.width / 2, startY + index * lineHeight));

  const image = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
  const fillCandidates = [];
  const edgeCandidates = [];
  let edgeOrder = 0;
  const step = preset.sampleStep;
  for (let y = 0; y < canvas.height; y += step) {
    for (let x = 0; x < canvas.width; x += step) {
      if (image[(y * canvas.width + x) * 4] > 80 && random() > 0.08) {
        const edge = isTextEdge(image, canvas.width, canvas.height, x, y);
        const sample = {
          x: x / canvas.width - 0.5,
          y: -(y / canvas.height - 0.5),
          weight: random(),
          edge,
          edgeOrder: edge ? edgeOrder : -1,
          sampleX: x / canvas.width,
          sampleY: y / canvas.height,
        };

        if (edge) {
          edgeOrder += 1;
          edgeCandidates.push(sample);
        } else {
          fillCandidates.push(sample);
        }
      }
    }
  }

  const outline = shuffle(edgeCandidates, random).slice(0, preset.outline);
  const fill = shuffle(fillCandidates, random).slice(0, preset.fill);
  return shuffle([...outline, ...fill], random);
}

function isTextEdge(image, width, height, x, y) {
  const offsets = [
    [-8, 0],
    [8, 0],
    [0, -8],
    [0, 8],
  ];

  return offsets.some(([dx, dy]) => {
    const nx = x + dx;
    const ny = y + dy;
    if (nx < 0 || ny < 0 || nx >= width || ny >= height) return true;
    return image[(ny * width + nx) * 4] < 80;
  });
}

function drawVoid(ctx, state) {
  const { viewport } = state;
  const vanishing = vanishingPoint(state);
  const flash = state.revealFlash ?? 0;

  // The background and its two full-screen gradients never change while the
  // viewport keeps its size, so they are baked once and blitted.
  const layer = acquireLayer(backdropLayer, viewport.width, viewport.height);
  if (layer !== backdropLayer) {
    backdropLayer = layer;
    layer.ctx.fillStyle = PALETTE.background;
    layer.ctx.fillRect(0, 0, viewport.width, viewport.height);
    drawDeepSpaceGradient(layer.ctx, state);
  }
  ctx.drawImage(backdropLayer.canvas, 0, 0);

  drawGalaxyMist(ctx, state, vanishing, flash);
}

function drawDeepSpaceGradient(ctx, state) {
  const { viewport } = state;
  const vertical = ctx.createLinearGradient(0, 0, 0, viewport.height);
  vertical.addColorStop(0, "rgba(1, 3, 6, 0.92)");
  vertical.addColorStop(0.34, "rgba(4, 9, 13, 0.22)");
  vertical.addColorStop(0.66, "rgba(3, 8, 12, 0.18)");
  vertical.addColorStop(1, "rgba(0, 2, 5, 0.88)");
  ctx.fillStyle = vertical;
  ctx.fillRect(0, 0, viewport.width, viewport.height);

  const horizontal = ctx.createLinearGradient(0, 0, viewport.width, 0);
  horizontal.addColorStop(0, "rgba(0, 0, 0, 0.34)");
  horizontal.addColorStop(0.5, "rgba(5, 16, 20, 0)");
  horizontal.addColorStop(1, "rgba(0, 0, 0, 0.4)");
  ctx.fillStyle = horizontal;
  ctx.fillRect(0, 0, viewport.width, viewport.height);
}

function drawGalaxyMist(ctx, state, vanishing, flash) {
  const { viewport } = state;
  const level = state.performanceLevel ?? 0;
  if (level >= 3) return;

  const size = Math.min(viewport.width, viewport.height);
  const outerRadius = size * (state.isCompact ? 0.78 : 0.64);
  const core = ctx.createRadialGradient(
    vanishing.x,
    vanishing.y,
    0,
    vanishing.x,
    vanishing.y,
    outerRadius,
  );
  core.addColorStop(0, `rgba(245, 241, 232, ${0.12 + flash * 0.08})`);
  core.addColorStop(0.16, `rgba(198, 248, 255, ${0.062 + flash * 0.04})`);
  core.addColorStop(0.42, `rgba(94, 242, 255, ${0.026 + flash * 0.02})`);
  core.addColorStop(0.74, "rgba(24, 72, 82, 0.012)");
  core.addColorStop(1, "rgba(5, 6, 9, 0)");
  ctx.fillStyle = core;

  // Outside outerRadius the gradient is fully transparent, so painting the
  // whole viewport just burns fill rate.
  const left = clamp(vanishing.x - outerRadius, 0, viewport.width);
  const top = clamp(vanishing.y - outerRadius, 0, viewport.height);
  const right = clamp(vanishing.x + outerRadius, 0, viewport.width);
  const bottom = clamp(vanishing.y + outerRadius, 0, viewport.height);
  ctx.fillRect(left, top, right - left, bottom - top);
}

function drawStarField(ctx, points, state) {
  const { depth, eye, screen, viewport, dpr, time } = state;
  const level = state.performanceLevel ?? 0;
  const stride = level >= 2 ? 2 : 1;
  const trails = level <= 1;

  ctx.save();
  ctx.globalCompositeOperation = "lighter";

  for (let i = 0; i < points.length; i += stride) {
    const point = points[i];
    const progress = (point.phase + time * point.speed) % 1;
    const current = starPosition(point, progress, depth, state);
    const shouldDrawTrail = trails && (point.comet || i % (state.isCompact ? 4 : 2) === 0);
    const previous = shouldDrawTrail
      ? starPosition(point, Math.max(0, progress - point.trail), depth, state)
      : null;
    const projected = projectPoint(current, eye, screen, viewport, dpr);
    if (!projected.visible) continue;

    const near = smoothstep(0.18, 0.96, progress);
    const alpha = clamp(0.12 + near * 0.78 + projected.depth * 0.2, 0.08, 0.9);
    const radius = clamp(point.size * projected.scale * (0.72 + near * 1.25), 0.42, 4.8);

    const trail = shouldDrawTrail ? projectPoint(previous, eye, screen, viewport, dpr) : null;
    if (trail?.visible && near > 0.08) {
      if (point.comet && level <= 1 && near > 0.18) {
        drawCometTail(ctx, point, trail, projected, radius, alpha, near, dpr);
      } else {
        ctx.strokeStyle = `rgba(${point.color}, ${alpha * 0.18})`;
        ctx.lineWidth = clamp(radius * 0.42, 0.24, 1.6);
        ctx.beginPath();
        ctx.moveTo(trail.x, trail.y);
        ctx.lineTo(projected.x, projected.y);
        ctx.stroke();
      }
    }

    drawStarDot(ctx, point, projected, radius, alpha, near, level, dpr);
  }

  ctx.restore();
}

function drawCometTail(ctx, point, trail, projected, radius, alpha, near, dpr) {
  const gradient = ctx.createLinearGradient(trail.x, trail.y, projected.x, projected.y);
  gradient.addColorStop(0, `rgba(${point.color}, 0)`);
  gradient.addColorStop(0.52, `rgba(${point.color}, ${alpha * 0.055})`);
  gradient.addColorStop(1, `rgba(${point.color}, ${alpha * (0.22 + near * 0.08)})`);

  ctx.save();
  ctx.lineCap = "round";
  ctx.strokeStyle = gradient;
  ctx.lineWidth = clamp(radius * (2.2 + near * 2.4), 1.2 * dpr, 8 * dpr);
  ctx.beginPath();
  ctx.moveTo(trail.x, trail.y);
  ctx.lineTo(projected.x, projected.y);
  ctx.stroke();

  ctx.strokeStyle = `rgba(${point.color}, ${alpha * 0.18})`;
  ctx.lineWidth = clamp(radius * 0.74, 0.45 * dpr, 2.4 * dpr);
  ctx.beginPath();
  ctx.moveTo(trail.x, trail.y);
  ctx.lineTo(projected.x, projected.y);
  ctx.stroke();
  ctx.restore();
}

function drawStarDot(ctx, point, projected, radius, alpha, near, level, dpr) {
  const bloom = point.bloom ?? 0;

  if (level <= 1 && bloom > 0.2) {
    const halo = clamp(radius * (3.2 + bloom * 3.1) * dpr, 3, 24);
    const previousAlpha = ctx.globalAlpha;
    ctx.globalAlpha = clamp((0.26 + near * 0.26) * alpha * 1.6, 0, 1);
    ctx.drawImage(
      getGlowSprite(point.color),
      projected.x - halo,
      projected.y - halo,
      halo * 2,
      halo * 2,
    );
    ctx.globalAlpha = previousAlpha;
  }

  ctx.fillStyle = `rgba(${point.color}, ${alpha})`;
  ctx.beginPath();
  ctx.arc(projected.x, projected.y, radius, 0, Math.PI * 2);
  ctx.fill();
}

function starPosition(point, progress, depth, state) {
  const motion = state.eyeMotion ?? { x: 0, y: 0, stretch: 0 };
  const isCompact = state.isCompact;
  const spin = state.transitionSpin ?? 0;
  const eased = Math.pow(progress, 1.45);
  const motionLength = Math.hypot(motion.x, motion.y);
  const dirX = motionLength > 0.02 ? motion.x / motionLength : 0;
  const dirY = motionLength > 0.02 ? motion.y / motionLength : 0;
  const along = point.x * dirX + point.y * dirY;
  const stretch = motion.stretch * (isCompact ? 0.035 : 0.055) * eased;
  return spinPoint(
    {
      x: point.x * (0.34 + eased * 0.88) + dirX * along * stretch,
      y: point.y * (0.34 + eased * 0.88) + dirY * along * stretch,
      z: (-0.5 - (1 - eased) * STAR_DEPTH) * depth,
    },
    spin * (0.24 + eased * 0.68),
  );
}

function spinPoint(point, amount) {
  if (!amount) return point;
  const radius = Math.hypot(point.x, point.y);
  const angle = amount * (0.32 + radius * 0.7);
  const rotated = rotate2(point.x, point.y, angle);
  return {
    x: rotated.x * (1 + amount * 0.025),
    y: rotated.y * (1 - amount * 0.018),
    z: point.z - amount * 0.16,
  };
}

function warpPoint(point, state) {
  const spin = state.transitionSpin ?? 0;
  if (!spin) return point;
  const depthSignal = clamp(Math.abs(point.z) / Math.abs(TUNNEL_DEPTH), 0, 1);
  return spinPoint(point, spin * (0.28 + depthSignal * 0.88));
}

function textPointWithTransition(point, state) {
  const spin = state.transitionSpin ?? 0;
  if (!spin) return point;
  const amount = spin * (0.72 + Math.abs(point.z) * 0.025);
  return spinPoint(
    {
      x: point.x,
      y: point.y,
      z: point.z - spin * 0.42,
    },
    amount,
  );
}

function drawTunnel(ctx, scene, state) {
  const { frames, spokes } = scene;
  const level = state.performanceLevel ?? 0;

  ctx.save();
  ctx.globalCompositeOperation = "lighter";

  if (level <= 1) {
    drawSpokes(ctx, spokes, state, 2.4, 0.035);
    drawFrames(ctx, frames, state, 2.2, 0.035);
  }
  if (level <= 2) drawSpokes(ctx, spokes, state, 0.66, 0.13);
  drawFrames(ctx, frames, state, 0.58, 0.46);

  ctx.restore();
}

function drawFrames(ctx, frames, state, widthScale = 1, alphaScale = 1) {
  const { depth } = state;

  for (const frame of frames) {
    const z = frame.z * depth;
    const corners = framePoints(frame, z);
    const nearGlow = 0.45 + frame.near * 1.65;
    const lineWidth = (frame.facet === 0 ? 0.58 : 0.34) * widthScale * nearGlow;

    for (let i = 0; i < corners.length; i += 1) {
      drawWorldLine(
        ctx,
        corners[i],
        corners[(i + 1) % corners.length],
        state,
        frame.color,
        frame.opacity * alphaScale * nearGlow,
        lineWidth,
      );
    }
  }
}

function framePoints(frame, z) {
  const w = frame.w / 2;
  const h = frame.h / 2;

  if (frame.facet === 1) {
    return [
      { x: -w * 0.86, y: -h, z },
      { x: w * 0.86, y: -h, z },
      { x: w, y: -h * 0.62, z },
      { x: w, y: h * 0.62, z },
      { x: w * 0.86, y: h, z },
      { x: -w * 0.86, y: h, z },
      { x: -w, y: h * 0.62, z },
      { x: -w, y: -h * 0.62, z },
    ];
  }

  if (frame.facet === 2) {
    return Array.from({ length: 18 }, (_, i) => {
      const angle = (i / 18) * Math.PI * 2;
      return {
        x: Math.cos(angle) * w,
        y: Math.sin(angle) * h,
        z,
      };
    });
  }

  return [
    { x: -w, y: -h, z },
    { x: w, y: -h, z },
    { x: w, y: h, z },
    { x: -w, y: h, z },
  ];
}

function drawSpokes(ctx, spokes, state, widthScale = 1, alphaScale = 1) {
  const { depth } = state;
  const nearZ = -0.5 * depth;
  const farZ = TUNNEL_DEPTH * depth;

  for (const spoke of spokes) {
    drawWorldLine(
      ctx,
      { x: spoke.x, y: spoke.y, z: nearZ },
      { x: spoke.x, y: spoke.y, z: farZ },
      state,
      spoke.color,
      spoke.alpha * alphaScale,
      spoke.width * widthScale,
    );
  }
}

function drawQuestionConstellation(ctx, question, state) {
  if (!question) return;

  const { eye, screen, viewport, dpr, time } = state;
  const reveal = activeReveal(question, eye);
  const lock = state.readingHold ?? 0;
  const grace = state.readingGrace > 0 ? 1 : 0;
  const smoke = state.readingSmoke ?? 0;
  const compactBoost = state.isCompact ? 0.18 : 0;
  const focus = Math.max(
    smoothstep(0.1, state.isCompact ? 0.58 : 0.72, lock + compactBoost) *
      Math.max(reveal, grace * 0.98, smoke * 0.64),
    smoke * 0.46,
  );
  const cloud = 1 - focus;

  ctx.save();
  ctx.globalCompositeOperation = "lighter";

  const level = state.performanceLevel ?? 0;
  const passes =
    level >= 2
      ? [{ alpha: 0.78, scale: level >= 3 ? 0.78 : 0.9 }]
      : state.isCompact
        ? [
            { alpha: 0.16, scale: 2.15 },
            { alpha: 0.76, scale: 0.9 },
          ]
        : [
            { alpha: 0.07, scale: 3.4 },
            { alpha: 0.18, scale: 1.65 },
            { alpha: 0.72, scale: 0.82 },
          ];
  const stride = level >= 3 ? 3 : level >= 2 ? 2 : 1;

  for (const pass of passes) {
    for (let i = 0; i < question.points.length; i += stride) {
      const dot = question.points[i];
      const color = TEXT_COLORS[dot.colorShift % TEXT_COLORS.length];
      const world = anamorphicQuestionPoint(dot, state, time);
      const projected = projectPoint(world, eye, screen, viewport, dpr);
      if (!projected.visible) continue;

      const twinkle = 0.86 + Math.sin(time * 1.25 + dot.orbit) * 0.14;
      const edgeSignal = dot.edge ? 1.34 + focus * 0.46 : 1;
      const lockFocus = dot.edge ? 1 + focus * 0.34 : 1 - focus * 0.44;
      const holdFade = (0.36 + cloud * 0.48 + focus * (dot.edge ? 0.48 : 0.08)) * twinkle;
      const glowFocus = (state.isCompact ? 0.36 : 0.44) + cloud * 0.34 + focus * 0.28;
      const compactScale = state.isCompact ? 0.72 : 1;
      const size = clamp(
        dot.size *
          projected.scale *
          (1 + Math.max(reveal, grace * 0.86) * (state.isCompact ? 1.9 : 2.18) + cloud * 0.48) *
          pass.scale *
          glowFocus *
          lockFocus *
          edgeSignal *
          compactScale,
        0.36,
        focus > 0.62 ? (state.isCompact ? 1.45 : 2.45) : state.isCompact ? 4.2 : 7,
      );
      ctx.fillStyle = `rgba(${color}, ${
        pass.alpha * (0.46 + Math.max(reveal, grace * 0.72)) * holdFade
      })`;
      ctx.beginPath();
      ctx.arc(projected.x, projected.y, size, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.restore();
}

function anamorphicQuestionPoint(dot, state, time) {
  const motion = state.eyeMotion ?? { x: 0, y: 0, stretch: 0 };
  const smoke = state.readingSmoke ?? 0;
  const smokeAge = 1 - smoke;
  const motionLength = Math.hypot(motion.x, motion.y);
  const dirX = motionLength > 0.02 ? motion.x / motionLength : Math.cos(dot.orbit);
  const dirY = motionLength > 0.02 ? motion.y / motionLength : Math.sin(dot.orbit);
  const perpX = -dirY;
  const perpY = dirX;
  const compact = state.isCompact ? 0.42 : 0.72;
  const stretchAmount = motion.stretch * compact;
  const stretch = 1 + stretchAmount * 0.62 * dot.elastic;
  const squeeze = 1 - stretchAmount * 0.14;
  const along = dot.scatterX * dirX + dot.scatterY * dirY;
  const cross = dot.scatterX * perpX + dot.scatterY * perpY;
  const breathing = Math.sin(time * 0.82 + dot.orbit) * stretchAmount * 0.018;
  const scatterX = (dirX * along * stretch + perpX * cross * squeeze) * stretchAmount;
  const scatterY = (dirY * along * stretch + perpY * cross * squeeze) * stretchAmount;
  const compression = 1 + stretchAmount * 0.035;
  const smokeDrift = smoke > 0 ? smokeAge * smokeAge : 0;
  const smokeWave = Math.sin(time * 1.6 + dot.orbit * 1.7) * smokeDrift;

  return textPointWithTransition(
    {
      x:
        dot.x * compression +
        scatterX +
        Math.cos(dot.orbit) * breathing +
        dot.scatterX * smokeDrift * 0.18 +
        smokeWave * 0.04,
      y:
        dot.y * compression +
        scatterY +
        Math.sin(dot.orbit) * breathing +
        dot.scatterY * smokeDrift * 0.1 +
        smokeDrift * 0.18,
      z:
        (dot.z +
          dot.scatterZ * stretchAmount -
          stretchAmount * dot.elastic * 0.24 +
          dot.scatterZ * smokeDrift * 1.15 -
          smokeDrift * dot.elastic * 0.9) *
        state.depth,
    },
    state,
  );
}

function drawQuestionLock(ctx, question, state) {
  if (!question) return;

  const lock = state.readingHold ?? 0;
  if (lock <= 0.04 || !question.outlinePoints.length) return;

  const { viewport, dpr, screen, eye, time } = state;
  const reveal = Math.max(activeReveal(question, eye), state.readingGrace > 0 ? 0.92 : 0);
  const grace = state.readingGrace > 0 ? 1 : 0;
  const smoke = state.readingSmoke ?? 0;
  const flash = state.revealFlash ?? 0;
  const lockAlpha = smoothstep(0.1, 0.68, lock);
  const hintAlpha = smoothstep(0.28, 0.9, reveal) * 0.24;
  const alpha = Math.max(lockAlpha * reveal, hintAlpha * reveal, grace * 0.92, smoke * 0.58);
  if (alpha <= 0.01) return;

  ctx.save();
  ctx.globalCompositeOperation = "lighter";

  const level = state.performanceLevel ?? 0;
  const stride = level >= 3 ? 3 : level >= 2 ? 2 : 1;

  // Two halo passes and the sparkle pass all read the same points, so project
  // each one once per frame instead of three times.
  const projectedDots = [];
  for (let i = 0; i < question.outlinePoints.length; i += stride) {
    const dot = question.outlinePoints[i];
    const projected = projectPoint(
      anamorphicQuestionPoint(dot, state, time),
      eye,
      screen,
      viewport,
      dpr,
    );
    if (projected.visible) projectedDots.push({ dot, projected });
  }

  for (const pass of [
    { radius: 3.4, alpha: 0.08 + flash * 0.04 },
    { radius: 1, alpha: 0.52 + flash * 0.12 },
  ]) {
    if (level >= 2 && pass.radius > 1.2) continue;
    if (state.isCompact && pass.radius > 1.2) continue;

    ctx.fillStyle = `rgba(245, 241, 232, ${Math.min(0.78, pass.alpha * alpha)})`;
    for (const { dot, projected } of projectedDots) {
      const compactScale = state.isCompact ? 0.72 : 1;
      const radius = clamp(
        dot.size * projected.scale * (1.65 + flash * 0.5) * compactScale * pass.radius,
        0.42,
        pass.radius > 1.2 ? (state.isCompact ? 3.2 : 7.4) : state.isCompact ? 2.0 : 3.1,
      );
      ctx.beginPath();
      ctx.arc(projected.x, projected.y, radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  const sparkleLimit = level >= 2 ? 80 : state.isCompact ? 140 : 220;
  const sparkleCount = Math.min(sparkleLimit, projectedDots.length);
  ctx.fillStyle = `rgba(${PALETTE.cyan}, ${Math.min(0.62, (0.32 + flash * 0.12) * alpha)})`;
  for (let i = 0; i < sparkleCount; i += 1) {
    const { dot, projected } = projectedDots[i];
    const compactScale = state.isCompact ? 0.68 : 1;
    const radius = clamp(
      dot.size * projected.scale * (1.7 + flash * 0.55) * compactScale,
      0.42,
      state.isCompact ? 2.2 : 3.3,
    );
    ctx.beginPath();
    ctx.arc(projected.x, projected.y, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  drawGlyphOutlineHint(ctx, question, state, alpha, flash);

  ctx.restore();
}

function drawGlyphOutlineHint(ctx, question, state, alpha, flash) {
  const { viewport, dpr, screen, eye, depth, time } = state;
  const smoke = state.readingSmoke ?? 0;
  const level = state.performanceLevel ?? 0;
  const smokeAge = 1 - smoke;
  const anchor = projectPoint(
    { x: question.x, y: question.y, z: -0.18 * depth },
    eye,
    screen,
    viewport,
    dpr,
  );
  if (!anchor.visible) return;

  const fontSize = clamp(
    anchor.scale * (state.isCompact ? 70 : 92),
    18 * dpr,
    (state.isCompact ? 38 : 62) * dpr,
  );
  const lineHeight = fontSize * 1.05;
  const maxWidth = Math.min(viewport.width * (state.isCompact ? 0.84 : 0.7), 700 * dpr);
  const totalHeight = (question.lines.length - 1) * lineHeight;
  const outlineAlpha = Math.max(smoothstep(0.24, 0.86, alpha) * 0.72, smoke * 0.34);
  if (outlineAlpha <= 0.01) return;

  const centerX = anchor.x + Math.sin(time * 1.3) * smokeAge * smoke * 10 * dpr;
  const centerY = anchor.y - smokeAge * smoke * 28 * dpr;
  const font = `650 ${fontSize}px "Avenir Next", "Helvetica Neue", Arial, sans-serif`;

  if (level <= 1) {
    drawGlyphGlow(ctx, question, {
      fontSize,
      dpr,
      flash,
      smoke,
      maxWidth,
      lineHeight,
      totalHeight,
      outlineAlpha,
      centerX,
      centerY,
    });
  }

  ctx.save();
  ctx.translate(centerX, centerY);
  ctx.rotate(question.rot * 0.18);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = font;
  ctx.globalCompositeOperation = "lighter";

  question.lines.forEach((line, index) => {
    const y = index * lineHeight - totalHeight / 2;
    const text = line.toUpperCase();

    ctx.lineWidth = Math.max(0.54, 1.46 * dpr);
    ctx.strokeStyle = `rgba(${PALETTE.cyan}, ${(0.34 + flash * 0.12) * outlineAlpha})`;
    ctx.strokeText(text, 0, y, maxWidth);

    if (level >= 2) return;

    ctx.lineWidth = Math.max(0.3, 0.56 * dpr);
    ctx.strokeStyle = `rgba(245, 241, 232, ${(0.48 + flash * 0.14) * outlineAlpha})`;
    ctx.strokeText(text, 0, y, maxWidth);
  });

  ctx.restore();
}

/**
 * The halo around the resolved question.
 *
 * shadowBlur is genuinely the right tool for this look, but it must not be set
 * while the destination context is in "lighter" mode. So the blur is rendered
 * into a small offscreen the size of the text block under plain source-over,
 * then composited additively as a single textured blit.
 */
function drawGlyphGlow(ctx, question, options) {
  const { fontSize, dpr, flash, smoke, maxWidth, lineHeight, totalHeight, outlineAlpha } = options;

  // A blur has no detail worth resolving, so it is rendered at a quarter of the
  // area and stretched back on the way out.
  const q = GLYPH_GLOW_SCALE;
  const spread = (14 + flash * 10 + smoke * 12) * dpr;
  const margin = Math.ceil(spread * 3);
  const blockWidth = maxWidth + margin * 2;
  const blockHeight = totalHeight + lineHeight + margin * 2;

  // Quantised so a slowly drifting font size does not reallocate every frame.
  const width = quantise(blockWidth * q, 32);
  const height = quantise(blockHeight * q, 32);
  const layer = acquireLayer(glyphGlowLayer, width, height);
  const key = [
    question.question,
    Math.round(fontSize),
    Math.round(flash * 8),
    Math.round(smoke * 8),
    Math.round(outlineAlpha * 16),
  ].join("|");
  const reusable = layer === glyphGlowLayer && key === glyphGlowKey;
  glyphGlowLayer = layer;
  glyphGlowKey = key;

  if (!reusable) paintGlyphGlow(layer, question, options, { q, spread, width, height });

  const drawWidth = width / q;
  const drawHeight = height / q;
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.drawImage(
    layer.canvas,
    options.centerX - drawWidth / 2,
    options.centerY - drawHeight / 2,
    drawWidth,
    drawHeight,
  );
  ctx.restore();
}

function paintGlyphGlow(layer, question, options, geometry) {
  const { fontSize, dpr, flash, smoke, maxWidth, lineHeight, totalHeight, outlineAlpha } = options;
  const { q, spread, width, height } = geometry;

  const glow = layer.ctx;
  glow.clearRect(0, 0, width, height);
  glow.save();
  glow.translate(width / 2, height / 2);
  glow.rotate(question.rot * 0.18);
  glow.textAlign = "center";
  glow.textBaseline = "middle";
  glow.font = `650 ${fontSize * q}px "Avenir Next", "Helvetica Neue", Arial, sans-serif`;

  question.lines.forEach((line, index) => {
    const y = (index * lineHeight - totalHeight / 2) * q;
    const text = line.toUpperCase();

    glow.lineWidth = Math.max(0.54, 1.46 * dpr) * q;
    glow.strokeStyle = `rgba(${PALETTE.cyan}, ${(0.34 + flash * 0.12) * outlineAlpha})`;
    glow.shadowColor = `rgba(${PALETTE.cyan}, ${(1 + flash * 0.28) * outlineAlpha})`;
    glow.shadowBlur = spread * q;
    glow.strokeText(text, 0, y, maxWidth * q);

    glow.lineWidth = Math.max(0.3, 0.56 * dpr) * q;
    glow.strokeStyle = `rgba(245, 241, 232, ${(0.48 + flash * 0.14) * outlineAlpha})`;
    glow.shadowColor = `rgba(245, 241, 232, ${(0.52 + flash * 0.16) * outlineAlpha})`;
    glow.shadowBlur = (5 + flash * 5 + smoke * 10) * dpr * q;
    glow.strokeText(text, 0, y, maxWidth * q);
  });

  glow.restore();
}

function quantise(value, step) {
  return Math.max(step, Math.ceil(value / step) * step);
}

function drawAperture(ctx, state) {
  const { viewport } = state;
  drawEdgeVignette(ctx, viewport);

  ctx.strokeStyle = "rgba(245, 241, 232, 0.2)";
  ctx.lineWidth = 1;
  ctx.strokeRect(7, 7, viewport.width - 14, viewport.height - 14);
}

function drawEdgeVignette(ctx, viewport) {
  // Static per viewport, so bake it once and blit.
  const layer = acquireLayer(vignetteLayer, viewport.width, viewport.height);
  if (layer !== vignetteLayer) {
    vignetteLayer = layer;
    paintEdgeVignette(layer.ctx, viewport);
  }
  ctx.drawImage(vignetteLayer.canvas, 0, 0);
}

function paintEdgeVignette(ctx, viewport) {
  const edgeX = Math.max(120, viewport.width * 0.18);
  const edgeY = Math.max(90, viewport.height * 0.2);

  const left = ctx.createLinearGradient(0, 0, edgeX, 0);
  left.addColorStop(0, "rgba(0, 0, 0, 0.72)");
  left.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = left;
  ctx.fillRect(0, 0, edgeX, viewport.height);

  const right = ctx.createLinearGradient(viewport.width, 0, viewport.width - edgeX, 0);
  right.addColorStop(0, "rgba(0, 0, 0, 0.74)");
  right.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = right;
  ctx.fillRect(viewport.width - edgeX, 0, edgeX, viewport.height);

  const top = ctx.createLinearGradient(0, 0, 0, edgeY);
  top.addColorStop(0, "rgba(0, 0, 0, 0.56)");
  top.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = top;
  ctx.fillRect(0, 0, viewport.width, edgeY);

  const bottom = ctx.createLinearGradient(0, viewport.height, 0, viewport.height - edgeY);
  bottom.addColorStop(0, "rgba(0, 0, 0, 0.62)");
  bottom.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = bottom;
  ctx.fillRect(0, viewport.height - edgeY, viewport.width, edgeY);
}

function drawWorldLine(ctx, a, b, state, color, alpha, lineWidth = 1) {
  const { eye, screen, viewport, dpr } = state;
  const pa = projectPoint(warpPoint(a, state), eye, screen, viewport, dpr);
  const pb = projectPoint(warpPoint(b, state), eye, screen, viewport, dpr);
  if (!pa.visible && !pb.visible) return;

  const scale = clamp((pa.scale + pb.scale) * 0.5, 0.05, 1.25);
  const edgeLight = clamp(
    Math.max(distanceFromCenter(pa, viewport), distanceFromCenter(pb, viewport)),
    0,
    1,
  );
  const headLight = clamp(1 + Math.hypot(state.eye.x, state.eye.y) * 0.08, 1, 1.18);
  const lineAlpha = clamp(alpha * (0.72 + edgeLight * 0.65) * headLight, 0, 0.86);
  const width = clamp(lineWidth * dpr * (0.42 + scale * 0.92 + edgeLight * 0.22), 0.12, 3.2);
  if ((state.performanceLevel ?? 0) <= 1 && lineAlpha > 0.04) {
    // Additive halo pass. Same reason as drawStarDot: no shadowBlur under "lighter".
    ctx.strokeStyle = `rgba(${color}, ${lineAlpha * 0.2})`;
    ctx.lineWidth = width + clamp(width * (2.6 + edgeLight * 2.4), 0.8, 8);
    ctx.beginPath();
    ctx.moveTo(pa.x, pa.y);
    ctx.lineTo(pb.x, pb.y);
    ctx.stroke();
  }

  ctx.strokeStyle = `rgba(${color}, ${lineAlpha})`;
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.moveTo(pa.x, pa.y);
  ctx.lineTo(pb.x, pb.y);
  ctx.stroke();
}

function distanceFromCenter(point, viewport) {
  return Math.hypot(point.x / viewport.width - 0.5, point.y / viewport.height - 0.5) * 1.72;
}

function vanishingPoint(state) {
  const point = projectPoint(
    { x: 0, y: 0, z: TUNNEL_DEPTH * state.depth },
    state.eye,
    state.screen,
    state.viewport,
    state.dpr,
  );

  return point.visible
    ? point
    : {
        x: state.viewport.width / 2,
        y: state.viewport.height / 2,
      };
}

function activeReveal(question, eye) {
  const gaze = clamp(
    1 - Math.hypot((question.revealEye.x - eye.x) * 0.44, (question.revealEye.y - eye.y) * 0.68),
    0,
    1,
  );
  return clamp(0.08 + gaze * 0.92, 0.08, 1);
}

function smoothstep(edge0, edge1, value) {
  const t = clamp((value - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

function wrapQuestion(text) {
  const words = text.split(" ");
  const lines = [];
  let line = "";
  const maxChars = 15;

  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (test.length > maxChars && line) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines.slice(0, 5);
}

function wrapCanvasText(ctx, text, maxWidth) {
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
  return lines.slice(0, 5);
}

function shuffle(items, random) {
  for (let i = items.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
  return items;
}
