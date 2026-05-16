import { DEFAULT_EYE, PALETTE } from "./config.js";
import { clamp, projectPoint, rotate2 } from "./projection.js";
import { QUESTIONS } from "./questions.js";

const TUNNEL_DEPTH = -17.5;

export function createScene(screen, random = Math.random) {
  const frames = createFrames(screen, random);
  const spokes = createSpokes(screen, random);
  const field = createField(screen, random);
  const questionPlanes = createQuestionPlanes(screen, random);

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

export function createFrames(screen, random = Math.random) {
  return Array.from({ length: 34 }, (_, i) => {
    const depth = i / 33;
    const z = -0.55 - depth * Math.abs(TUNNEL_DEPTH);
    const shimmer = (random() - 0.5) * 0.035;

    return {
      z,
      w: screen.width * (1.08 + shimmer),
      h: screen.height * (1.08 + shimmer * 0.7),
      x: 0,
      y: 0,
      rot: 0,
      opacity: 0.1 + (1 - depth) * 0.24 + (i % 5 === 0 ? 0.14 : 0),
      color: [PALETTE.ink, PALETTE.cyan, PALETTE.gold, PALETTE.violet, PALETTE.green][i % 5],
      facet: i % 3,
    };
  });
}

function createSpokes(screen, random) {
  const spokes = [];
  const count = 44;

  for (let i = 0; i < count; i += 1) {
    const angle = (i / count) * Math.PI * 2;
    const wobble = (random() - 0.5) * 0.025;
    spokes.push({
      x: Math.cos(angle) * screen.width * (0.54 + wobble),
      y: Math.sin(angle) * screen.height * (0.54 + wobble),
      color: [PALETTE.ink, PALETTE.cyan, PALETTE.gold, PALETTE.violet, PALETTE.green][i % 5],
      alpha: 0.08 + random() * 0.18,
      width: 0.35 + random() * 0.85,
    });
  }

  return spokes;
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

  return Array.from({ length: 7600 }, (_, i) => {
    const z = -0.55 - random() * 17.8;
    const angle = random() * Math.PI * 2;
    const shell = Math.pow(random(), 0.28);
    const core = random() < 0.18;
    const radiusX = screen.width * (core ? 0.08 + random() * 0.28 : 0.2 + shell * 0.38);
    const radiusY = screen.height * (core ? 0.08 + random() * 0.26 : 0.2 + shell * 0.38);

    return {
      x: Math.cos(angle) * radiusX + (random() - 0.5) * screen.width * 0.05,
      y: Math.sin(angle) * radiusY + (random() - 0.5) * screen.height * 0.05,
      z,
      size: core ? 0.45 + random() * 0.9 : 0.6 + random() * 1.9,
      halo: random() < 0.22 ? 1.6 + random() * 3.4 : 0,
      color: palette[(i + Math.floor(random() * palette.length)) % palette.length],
    };
  });
}

function createQuestionPlanes(screen, random) {
  const palette = [PALETTE.cyan, PALETTE.gold, PALETTE.green, PALETTE.violet, PALETTE.red];
  const picked = shuffle([...QUESTIONS], random).slice(0, 12);

  return picked.map((question, index) => {
    const x = Math.sin(index * 1.47) * screen.width * 0.1;
    const y = Math.cos(index * 1.21) * screen.height * 0.09;
    const rot = (random() - 0.5) * 0.09;
    const revealEye = {
      x: DEFAULT_EYE.x,
      y: DEFAULT_EYE.y,
      z: DEFAULT_EYE.z,
    };

    return {
      question,
      lines: wrapQuestion(question),
      points: createAnamorphicQuestionPoints(
        sampleQuestionPoints(question, random),
        { x, y, rot, revealEye },
        screen,
        random,
      ),
      x,
      y,
      rot,
      revealEye,
      color: palette[index % palette.length],
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
  const width = screen.width * 1.12;
  const height = screen.height * 0.54;

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
      size: 0.55 + random() * 1.25,
      colorShift: index % 9,
    };
  });
}

function sampleQuestionPoints(text, random) {
  const canvas = document.createElement("canvas");
  canvas.width = 1100;
  canvas.height = 340;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#fff";
  ctx.font = '760 48px "Avenir Next", "Helvetica Neue", Arial, sans-serif';
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  const lines = wrapCanvasText(ctx, text.toUpperCase(), 940);
  const lineHeight = 55;
  const startY = canvas.height / 2 - ((lines.length - 1) * lineHeight) / 2;
  lines.forEach((line, index) => ctx.fillText(line, canvas.width / 2, startY + index * lineHeight));

  const image = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
  const candidates = [];
  for (let y = 0; y < canvas.height; y += 4) {
    for (let x = 0; x < canvas.width; x += 4) {
      if (image[(y * canvas.width + x) * 4] > 80 && random() > 0.08) {
        candidates.push({
          x: x / canvas.width - 0.5,
          y: -(y / canvas.height - 0.5),
          weight: random(),
        });
      }
    }
  }

  return shuffle(candidates, random).slice(0, 960);
}

function drawVoid(ctx, state) {
  const { viewport } = state;
  const vanishing = vanishingPoint(state);

  ctx.fillStyle = PALETTE.background;
  ctx.fillRect(0, 0, viewport.width, viewport.height);

  const glow = ctx.createRadialGradient(
    vanishing.x,
    vanishing.y,
    viewport.height * 0.02,
    vanishing.x,
    vanishing.y,
    viewport.height * 0.92,
  );
  glow.addColorStop(0, "rgba(245, 241, 232, 0.15)");
  glow.addColorStop(0.18, "rgba(94, 242, 255, 0.08)");
  glow.addColorStop(0.46, "rgba(184, 121, 255, 0.04)");
  glow.addColorStop(1, "rgba(5, 6, 9, 0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, viewport.width, viewport.height);
}

function drawStarField(ctx, points, state) {
  const { depth, eye, screen, viewport, dpr } = state;

  ctx.save();
  ctx.globalCompositeOperation = "lighter";

  for (const point of points) {
    const projected = projectPoint(
      {
        x: point.x,
        y: point.y,
        z: point.z * depth,
      },
      eye,
      screen,
      viewport,
      dpr,
    );
    if (!projected.visible) continue;

    const alpha = clamp(0.08 + projected.depth * 0.54, 0.07, 0.58);
    const radius = clamp(point.size * projected.scale, 0.45, 3.4);

    if (point.halo) {
      ctx.fillStyle = `rgba(${point.color}, ${alpha * 0.06})`;
      ctx.beginPath();
      ctx.arc(projected.x, projected.y, radius * point.halo * dpr, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = `rgba(${point.color}, ${alpha})`;
    ctx.beginPath();
    ctx.arc(projected.x, projected.y, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

function drawTunnel(ctx, scene, state) {
  const { frames, spokes } = scene;

  ctx.save();
  ctx.globalCompositeOperation = "lighter";

  drawSpokes(ctx, spokes, state, 5.2, 0.055);
  drawFrames(ctx, frames, state, 5.4, 0.055);
  drawSpokes(ctx, spokes, state, 1.2, 0.2);
  drawFrames(ctx, frames, state, 1, 0.64);

  ctx.restore();
}

function drawFrames(ctx, frames, state, widthScale = 1, alphaScale = 1) {
  const { depth } = state;

  for (const frame of frames) {
    const z = frame.z * depth;
    const corners = framePoints(frame, z);
    const lineWidth = (frame.facet === 0 ? 1.1 : 0.62) * widthScale;

    for (let i = 0; i < corners.length; i += 1) {
      drawWorldLine(
        ctx,
        corners[i],
        corners[(i + 1) % corners.length],
        state,
        frame.color,
        frame.opacity * alphaScale,
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

  const { depth, eye, screen, viewport, dpr } = state;
  const reveal = activeReveal(question, eye);
  const lock = state.readingHold ?? 0;

  ctx.save();
  ctx.globalCompositeOperation = "lighter";

  for (const pass of [
    { alpha: 0.1, scale: 6.8 },
    { alpha: 0.24, scale: 3.1 },
    { alpha: 0.78, scale: 1 },
  ]) {
    for (const dot of question.points) {
      const color = dot.colorShift % 3 === 0 ? PALETTE.ink : question.color;
      const projected = projectPoint(
        {
          x: dot.x,
          y: dot.y,
          z: dot.z * depth,
        },
        eye,
        screen,
        viewport,
        dpr,
      );
      if (!projected.visible) continue;

      const lockFocus = 1 - lock * 0.48;
      const size = clamp(
        dot.size * projected.scale * (1.16 + reveal * 2.8) * pass.scale * lockFocus,
        0.5,
        9.2,
      );
      ctx.fillStyle = `rgba(${color}, ${pass.alpha * (0.36 + reveal) * (1 - lock * 0.2)})`;
      ctx.beginPath();
      ctx.arc(projected.x, projected.y, size, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.restore();
}

function drawQuestionLock(ctx, question, state) {
  if (!question) return;

  const lock = state.readingHold ?? 0;
  if (lock <= 0.03) return;

  const { viewport, dpr, screen, eye, depth } = state;
  const anchor = projectPoint(
    { x: question.x, y: question.y, z: -2.0 * depth },
    eye,
    screen,
    viewport,
    dpr,
  );
  if (!anchor.visible) return;

  const reveal = activeReveal(question, eye);
  const alpha = smoothstep(0.12, 0.72, lock) * reveal;
  if (alpha <= 0.01) return;

  const fontSize = clamp(anchor.scale * 88, 24 * dpr, 58 * dpr);
  const lineHeight = fontSize * 1.08;
  const maxWidth = Math.min(viewport.width * 0.84, 960 * dpr);
  const totalHeight = (question.lines.length - 1) * lineHeight;

  ctx.save();
  ctx.translate(anchor.x, anchor.y);
  ctx.rotate(question.rot * 0.24);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `620 ${fontSize}px "Avenir Next", "Helvetica Neue", Arial, sans-serif`;
  ctx.globalCompositeOperation = "lighter";

  question.lines.forEach((line, index) => {
    const y = index * lineHeight - totalHeight / 2;
    const text = line.toUpperCase();

    ctx.lineWidth = Math.max(1.2, 3.2 * dpr);
    ctx.strokeStyle = `rgba(${question.color}, ${0.16 * alpha})`;
    ctx.shadowColor = `rgba(${question.color}, ${0.75 * alpha})`;
    ctx.shadowBlur = 20 * dpr;
    ctx.strokeText(text, 0, y, maxWidth);

    ctx.lineWidth = Math.max(0.65, 0.88 * dpr);
    ctx.strokeStyle = `rgba(245, 241, 232, ${0.94 * alpha})`;
    ctx.shadowColor = `rgba(245, 241, 232, ${0.48 * alpha})`;
    ctx.shadowBlur = 6 * dpr;
    ctx.strokeText(text, 0, y, maxWidth);
  });

  ctx.restore();
}

function drawAperture(ctx, state) {
  const { viewport } = state;
  const vanishing = vanishingPoint(state);
  const gradient = ctx.createRadialGradient(
    vanishing.x,
    vanishing.y,
    viewport.height * 0.12,
    vanishing.x,
    vanishing.y,
    viewport.height * 0.9,
  );
  gradient.addColorStop(0, "rgba(5, 6, 9, 0)");
  gradient.addColorStop(0.64, "rgba(5, 6, 9, 0.04)");
  gradient.addColorStop(1, "rgba(5, 6, 9, 0.72)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, viewport.width, viewport.height);

  ctx.strokeStyle = "rgba(245, 241, 232, 0.2)";
  ctx.lineWidth = 1;
  ctx.strokeRect(7, 7, viewport.width - 14, viewport.height - 14);
}

function drawWorldLine(ctx, a, b, state, color, alpha, lineWidth = 1) {
  const { eye, screen, viewport, dpr } = state;
  const pa = projectPoint(a, eye, screen, viewport, dpr);
  const pb = projectPoint(b, eye, screen, viewport, dpr);
  if (!pa.visible && !pb.visible) return;

  ctx.strokeStyle = `rgba(${color}, ${alpha})`;
  ctx.lineWidth = lineWidth * dpr;
  ctx.beginPath();
  ctx.moveTo(pa.x, pa.y);
  ctx.lineTo(pb.x, pb.y);
  ctx.stroke();
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
    1 - Math.hypot((question.revealEye.x - eye.x) * 0.78, (question.revealEye.y - eye.y) * 1.15),
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
  const maxChars = 26;

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
  return lines.slice(0, 4);
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
  return lines.slice(0, 4);
}

function shuffle(items, random) {
  for (let i = items.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
  return items;
}
