import { DEFAULT_EYE, PALETTE } from "./config.js";
import { clamp, projectPoint, rotate2 } from "./projection.js";
import { QUESTIONS } from "./questions.js";

const TUNNEL_DEPTH = -17.5;
const STAR_DEPTH = 17.8;
const BACKGROUND_COLORS = ["245, 241, 232", "198, 248, 255", "94, 242, 255"];
const TEXT_COLORS = ["64, 232, 255", "94, 242, 255", "142, 252, 255", "204, 255, 255"];
const QUALITY_PRESETS = {
  high: { frames: 32, spokes: 34, stars: 4200, outline: 520, fill: 760, sampleStep: 5 },
  balanced: { frames: 22, spokes: 26, stars: 2700, outline: 420, fill: 600, sampleStep: 6 },
  mobile: { frames: 16, spokes: 18, stars: 1500, outline: 300, fill: 430, sampleStep: 7 },
  mobileLow: { frames: 12, spokes: 14, stars: 1300, outline: 230, fill: 300, sampleStep: 8 },
  low: { frames: 16, spokes: 18, stars: 2200, outline: 320, fill: 420, sampleStep: 7 },
  panic: { frames: 10, spokes: 10, stars: 1400, outline: 190, fill: 220, sampleStep: 9 },
};

export function createScene(screen, random = Math.random, quality = "high", questionSet = null) {
  const preset = QUALITY_PRESETS[quality] ?? QUALITY_PRESETS.high;
  const frames = createFrames(screen, random, preset);
  const spokes = createSpokes(screen, random, preset);
  const field = createField(screen, random, preset);
  const questionPlanes = createQuestionPlanes(screen, random, preset, questionSet);

  return { frames, spokes, field, questionPlanes };
}

export function drawScene(ctx, scene, state) {
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
  return questionPlanes[Math.abs(Math.floor(index)) % questionPlanes.length];
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

    return {
      x: Math.cos(angle) * radiusX + (random() - 0.5) * screen.width * 0.05,
      y: Math.sin(angle) * radiusY + (random() - 0.5) * screen.height * 0.05,
      z,
      size: core ? 0.42 + random() * 0.78 : 0.52 + random() * 1.55,
      bloom: core ? 0.8 + random() * 1.4 : random() < 0.22 ? 0.35 + random() * 0.9 : 0,
      speed: core ? 0.048 + random() * 0.046 : 0.065 + random() * 0.075,
      phase: random(),
      trail: 0.04 + random() * 0.07,
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

  return picked.map((question, index) => {
    const x = Math.sin(index * 1.47) * screen.width * 0.1;
    const y = Math.cos(index * 1.21) * screen.height * 0.09;
    const rot = (random() - 0.5) * 0.09;
    const revealEye = {
      x: (random() - 0.5) * revealRangeX,
      y: (random() - 0.5) * revealRangeY,
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
  });
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

  ctx.fillStyle = PALETTE.background;
  ctx.fillRect(0, 0, viewport.width, viewport.height);

  drawDeepSpaceGradient(ctx, state);
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
  ctx.fillRect(0, 0, viewport.width, viewport.height);
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
    const previous = trails
      ? starPosition(point, Math.max(0, progress - point.trail), depth, state)
      : null;
    const projected = projectPoint(current, eye, screen, viewport, dpr);
    if (!projected.visible) continue;

    const near = smoothstep(0.18, 0.96, progress);
    const alpha = clamp(0.12 + near * 0.78 + projected.depth * 0.2, 0.08, 0.9);
    const radius = clamp(point.size * projected.scale * (0.72 + near * 1.25), 0.42, 4.8);

    const trail = trails ? projectPoint(previous, eye, screen, viewport, dpr) : null;
    if (trail?.visible && near > 0.08) {
      ctx.strokeStyle = `rgba(${point.color}, ${alpha * 0.24})`;
      ctx.lineWidth = clamp(radius * 0.5, 0.3, 2);
      ctx.beginPath();
      ctx.moveTo(trail.x, trail.y);
      ctx.lineTo(projected.x, projected.y);
      ctx.stroke();
    }

    drawStarDot(ctx, point, projected, radius, alpha, near, level, dpr);
  }

  ctx.restore();
}

function drawStarDot(ctx, point, projected, radius, alpha, near, level, dpr) {
  const bloom = point.bloom ?? 0;
  const canGlow = level <= 1 && bloom > 0.2;

  if (canGlow) {
    ctx.shadowColor = `rgba(${point.color}, ${0.22 + near * 0.22})`;
    ctx.shadowBlur = clamp(radius * (4 + bloom * 3.8) * dpr, 2.5, 18);
  }

  ctx.fillStyle = `rgba(${point.color}, ${alpha})`;
  ctx.beginPath();
  ctx.arc(projected.x, projected.y, radius, 0, Math.PI * 2);
  ctx.fill();

  if (canGlow) {
    ctx.shadowBlur = 0;
    ctx.shadowColor = "transparent";
  }
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
  for (const pass of [
    { radius: 3.4, alpha: 0.08 + flash * 0.04 },
    { radius: 1, alpha: 0.52 + flash * 0.12 },
  ]) {
    if (level >= 2 && pass.radius > 1.2) continue;
    if (state.isCompact && pass.radius > 1.2) continue;
    const stride = level >= 3 ? 3 : level >= 2 ? 2 : 1;
    for (let i = 0; i < question.outlinePoints.length; i += stride) {
      const dot = question.outlinePoints[i];
      const world = anamorphicQuestionPoint(dot, state, time);
      const projected = projectPoint(world, eye, screen, viewport, dpr);
      if (!projected.visible) continue;

      const compactScale = state.isCompact ? 0.72 : 1;
      const radius = clamp(
        dot.size * projected.scale * (1.65 + flash * 0.5) * compactScale * pass.radius,
        0.42,
        pass.radius > 1.2 ? (state.isCompact ? 3.2 : 7.4) : state.isCompact ? 2.0 : 3.1,
      );
      ctx.fillStyle = `rgba(245, 241, 232, ${Math.min(0.78, pass.alpha * alpha)})`;
      ctx.beginPath();
      ctx.arc(projected.x, projected.y, radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  const sparkleLimit = level >= 2 ? 80 : state.isCompact ? 140 : 220;
  for (const dot of question.outlinePoints.slice(0, sparkleLimit)) {
    const world = anamorphicQuestionPoint(dot, state, time);
    const projected = projectPoint(world, eye, screen, viewport, dpr);
    if (!projected.visible) continue;

    const compactScale = state.isCompact ? 0.68 : 1;
    const radius = clamp(
      dot.size * projected.scale * (1.7 + flash * 0.55) * compactScale,
      0.42,
      state.isCompact ? 2.2 : 3.3,
    );
    ctx.fillStyle = `rgba(${PALETTE.cyan}, ${Math.min(0.62, (0.32 + flash * 0.12) * alpha)})`;
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

  ctx.save();
  ctx.translate(
    anchor.x + Math.sin(time * 1.3) * smokeAge * smoke * 10 * dpr,
    anchor.y - smokeAge * smoke * 28 * dpr,
  );
  ctx.rotate(question.rot * 0.18);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `650 ${fontSize}px "Avenir Next", "Helvetica Neue", Arial, sans-serif`;
  ctx.globalCompositeOperation = "lighter";

  question.lines.forEach((line, index) => {
    const y = index * lineHeight - totalHeight / 2;
    const text = line.toUpperCase();

    ctx.lineWidth = Math.max(0.54, 1.46 * dpr);
    ctx.strokeStyle = `rgba(${PALETTE.cyan}, ${(0.34 + flash * 0.12) * outlineAlpha})`;
    ctx.shadowColor =
      level <= 1 ? `rgba(${PALETTE.cyan}, ${(1 + flash * 0.28) * outlineAlpha})` : "transparent";
    ctx.shadowBlur = level <= 1 ? (14 + flash * 10 + smoke * 12) * dpr : 0;
    ctx.strokeText(text, 0, y, maxWidth);

    if (level >= 2) return;

    ctx.lineWidth = Math.max(0.3, 0.56 * dpr);
    ctx.strokeStyle = `rgba(245, 241, 232, ${(0.48 + flash * 0.14) * outlineAlpha})`;
    ctx.shadowColor = `rgba(245, 241, 232, ${(0.52 + flash * 0.16) * outlineAlpha})`;
    ctx.shadowBlur = (5 + flash * 5 + smoke * 10) * dpr;
    ctx.strokeText(text, 0, y, maxWidth);
  });

  ctx.restore();
}

function drawAperture(ctx, state) {
  const { viewport } = state;
  drawEdgeVignette(ctx, viewport);

  ctx.strokeStyle = "rgba(245, 241, 232, 0.2)";
  ctx.lineWidth = 1;
  ctx.strokeRect(7, 7, viewport.width - 14, viewport.height - 14);
}

function drawEdgeVignette(ctx, viewport) {
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
    ctx.shadowColor = `rgba(${color}, ${lineAlpha * 0.42})`;
    ctx.shadowBlur = clamp(width * (2.6 + edgeLight * 2.4), 0.8, 8);
  }
  ctx.strokeStyle = `rgba(${color}, ${lineAlpha})`;
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.moveTo(pa.x, pa.y);
  ctx.lineTo(pb.x, pb.y);
  ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.shadowColor = "transparent";
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
