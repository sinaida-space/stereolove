import { DEFAULT_EYE, PALETTE } from "./config.js";
import { clamp, projectPoint, projectScreenPointToDepth, rotate2 } from "./projection.js";
import { QUESTIONS } from "./questions.js";
import { sampleTextPoints } from "./text-sampler.js";

export function createScene(screen, random = Math.random) {
  const frames = createFrames(screen, random);
  const field = createField(screen, random);
  const rosettes = createRosettes(random);
  const rays = createRays(screen, random);
  const questionPlanes = createQuestionPlanes(screen, random);
  const textShards = sampleTextPoints("WHOSE REALITY?", {
    maxPoints: 1900,
    screen,
    subtitle: "your position edits the image",
    random,
  }).map((point, index) => {
    const z = -1.2 - random() * 11.5;
    const world = projectScreenPointToDepth(point.x, point.y, z, DEFAULT_EYE.z);
    const palette = [PALETTE.cyan, PALETTE.red, PALETTE.gold, PALETTE.violet, PALETTE.green];

    return {
      x: world.x,
      y: world.y,
      z,
      size: 0.018 + random() * 0.045,
      rot: random() * Math.PI,
      spin: 0.45 + random() * 1.3,
      phase: random() * Math.PI * 2,
      color: palette[index % palette.length],
    };
  });

  return { frames, field, rosettes, rays, questionPlanes, textShards };
}

export function drawScene(ctx, scene, state) {
  const { viewport } = state;
  const activeQuestion = selectActiveQuestion(scene.questionPlanes, state.questionIndex);

  drawVoid(ctx, state);
  drawRetinalField(ctx, scene.field, state);
  drawMoireCurtains(ctx, state);
  drawRosettes(ctx, scene.rosettes, state);
  drawRays(ctx, scene.rays, state);
  drawFrames(ctx, scene.frames, state);
  drawQuestionConstellation(ctx, activeQuestion, state);
  drawTextShards(ctx, scene.textShards, state);
  drawQuestionLock(ctx, activeQuestion, state);
  drawAperture(ctx, viewport);
}

export function selectActiveQuestion(questionPlanes, index = 0) {
  if (!questionPlanes.length) return null;
  return questionPlanes[Math.abs(Math.floor(index)) % questionPlanes.length];
}

export function createFrames(screen, random = Math.random) {
  return Array.from({ length: 26 }, (_, i) => {
    const scale = 0.82 + i * 0.082;
    const drift = i * 0.045;
    return {
      z: -0.72 - i * 0.58,
      w: screen.width * scale,
      h: screen.height * scale,
      x: Math.sin(i * 0.9) * drift,
      y: Math.cos(i * 0.74) * drift * 0.72,
      rot: (i % 2 === 0 ? 1 : -1) * (0.018 * i + random() * 0.035),
      opacity: i % 4 === 0 ? 0.48 : 0.16 + random() * 0.12,
      speed: 0.28 + i * 0.018 + random() * 0.04,
      color: [PALETTE.ink, PALETTE.gold, PALETTE.cyan, PALETTE.violet][i % 4],
    };
  });
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

  return Array.from({ length: 5200 }, (_, i) => {
    const z = -0.8 - random() * 17;
    const band = Math.sin(i * 0.018) * screen.height * 0.18;
    const spread = 1.4 + Math.abs(z) * 0.22;

    return {
      x: (random() - 0.5) * screen.width * spread,
      y: band + (random() - 0.5) * screen.height * 0.9,
      z,
      size: 0.75 + random() * 1.9,
      speed: 0.35 + random() * 0.75,
      phase: random() * Math.PI * 2,
      color: palette[Math.floor(random() * palette.length)],
    };
  });
}

function createRosettes(random) {
  const palette = [PALETTE.cyan, PALETTE.red, PALETTE.gold, PALETTE.violet, PALETTE.green];
  return Array.from({ length: 10 }, (_, i) => ({
    x: ((i % 5) - 2) * 1.2 + (random() - 0.5) * 0.45,
    y: (Math.floor(i / 5) - 0.5) * 1.05 + (random() - 0.5) * 0.35,
    z: -2.2 - i * 1.25,
    radius: 0.42 + random() * 0.82,
    depth: 0.7 + random() * 1.3,
    arms: 24 + (i % 4) * 10,
    fold: 2 + (i % 5),
    speed: (i % 2 ? -1 : 1) * (0.035 + random() * 0.055),
    phase: random() * Math.PI * 2,
    color: palette[i % palette.length],
  }));
}

function createRays(screen, random) {
  return Array.from({ length: 90 }, (_, i) => {
    const z = -1.2 - random() * 11.5;
    const angle = random() * Math.PI * 2;
    const radius = 0.35 + random() * 3.4;
    const origin = {
      x: Math.cos(angle) * radius,
      y: Math.sin(angle) * radius * 0.62,
      z,
    };

    return {
      origin,
      target: {
        x: Math.sin(i * 0.71) * screen.width * 0.1,
        y: Math.cos(i * 0.53) * screen.height * 0.08,
        z: z - 1.2 - random() * 4,
      },
      color: [PALETTE.ink, PALETTE.gold, PALETTE.cyan, PALETTE.violet, PALETTE.green][i % 5],
      alpha: 0.08 + random() * 0.18,
      width: 0.45 + random() * 1.25,
    };
  });
}

function createQuestionPlanes(screen, random) {
  const palette = [PALETTE.cyan, PALETTE.gold, PALETTE.green, PALETTE.violet, PALETTE.red];
  const picked = shuffle([...QUESTIONS], random).slice(0, 10);

  return picked.map((question, index) => {
    const x = Math.sin(index * 1.7) * screen.width * 0.16;
    const y = Math.cos(index * 1.13) * screen.height * 0.13;
    const rot = (random() - 0.5) * 0.22;
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
  const width = screen.width * 0.95;
  const height = screen.height * 0.42;

  return samples.map((sample, index) => {
    const rotated = rotate2(sample.x * width, sample.y * height, question.rot);
    const target = {
      x: question.x + rotated.x,
      y: question.y + rotated.y,
    };
    const z = -1.7 - random() * 10.8;
    const world = anamorphicPointForView(target, z, question.revealEye);

    return {
      ...world,
      weight: sample.weight,
      phase: random() * Math.PI * 2,
      size: 0.45 + random() * 1.05,
      colorShift: index % 7,
    };
  });
}

function sampleQuestionPoints(text, random) {
  const canvas = document.createElement("canvas");
  canvas.width = 900;
  canvas.height = 260;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#fff";
  ctx.font = "800 38px Arial, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  const lines = wrapCanvasText(ctx, text.toUpperCase(), 760);
  const lineHeight = 42;
  const startY = canvas.height / 2 - ((lines.length - 1) * lineHeight) / 2;
  lines.forEach((line, index) => ctx.fillText(line, canvas.width / 2, startY + index * lineHeight));

  const image = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
  const candidates = [];
  for (let y = 0; y < canvas.height; y += 5) {
    for (let x = 0; x < canvas.width; x += 5) {
      if (image[(y * canvas.width + x) * 4] > 80 && random() > 0.12) {
        candidates.push({
          x: x / canvas.width - 0.5,
          y: -(y / canvas.height - 0.5),
          weight: random(),
        });
      }
    }
  }

  return shuffle(candidates, random).slice(0, 620);
}

function drawVoid(ctx, state) {
  const { viewport } = state;
  ctx.fillStyle = PALETTE.background;
  ctx.fillRect(0, 0, viewport.width, viewport.height);

  const glow = ctx.createRadialGradient(
    viewport.width * 0.53,
    viewport.height * 0.46,
    viewport.height * 0.02,
    viewport.width * 0.5,
    viewport.height * 0.5,
    viewport.height * 0.82,
  );
  glow.addColorStop(0, "rgba(245, 241, 232, 0.18)");
  glow.addColorStop(0.16, "rgba(94, 242, 255, 0.09)");
  glow.addColorStop(0.44, "rgba(184, 121, 255, 0.04)");
  glow.addColorStop(1, "rgba(5, 6, 9, 0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, viewport.width, viewport.height);
}

function drawRetinalField(ctx, points, state) {
  const { time, depth, eye, screen, viewport, dpr } = state;
  for (const point of points) {
    const z = point.z * depth;
    const projected = projectPoint(
      {
        x: point.x + Math.sin(time * point.speed + point.phase) * 0.03,
        y: point.y + Math.cos(time * point.speed * 0.8 + point.phase) * 0.018,
        z,
      },
      eye,
      screen,
      viewport,
      dpr,
    );
    if (!projected.visible) continue;

    const alpha = clamp(0.1 + projected.depth * 0.62, 0.08, 0.68);
    ctx.fillStyle = `rgba(${point.color}, ${alpha})`;
    ctx.beginPath();
    ctx.arc(projected.x, projected.y, Math.max(0.55, projected.scale * point.size), 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawMoireCurtains(ctx, state) {
  const { screen, depth, time } = state;
  for (let layer = 0; layer < 6; layer += 1) {
    const z = (-0.95 - layer * 1.85) * depth;
    const color = [PALETTE.gold, PALETTE.ink, PALETTE.cyan, PALETTE.violet][layer % 4];
    const alpha = 0.08 + layer * 0.012;
    const count = 20 + layer * 4;
    const phase = time * (0.12 + layer * 0.025);

    for (let i = 0; i < count; i += 1) {
      const x = (i / (count - 1) - 0.5) * screen.width * (1.05 + layer * 0.23);
      const wave = Math.sin(i * 0.73 + phase) * 0.5;
      drawWorldLine(
        ctx,
        { x: x + wave, y: -screen.height * 0.72, z },
        { x: -x * 0.58 + Math.cos(phase + i) * 0.25, y: screen.height * 0.72, z: z - 2.4 },
        state,
        color,
        alpha,
        0.75,
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
      drawWorldLine(ctx, inner, outer, state, rosette.color, 0.2, 1.1);
    }
  }
}

function drawRays(ctx, rays, state) {
  const pulse = 0.72 + Math.sin(state.time * 1.1) * 0.28;
  for (const ray of rays) {
    drawWorldLine(ctx, ray.origin, ray.target, state, ray.color, ray.alpha * pulse, ray.width);
  }
}

function drawFrames(ctx, frames, state) {
  const { time, depth } = state;
  for (const frame of frames) {
    const z = frame.z * depth;
    const rot = frame.rot + Math.sin(time * frame.speed) * 0.045;
    const corners = [
      rotate2(-frame.w / 2, -frame.h / 2, rot),
      rotate2(frame.w / 2, -frame.h / 2, rot),
      rotate2(frame.w / 2, frame.h / 2, rot),
      rotate2(-frame.w / 2, frame.h / 2, rot),
    ].map((point) => ({ x: point.x + frame.x, y: point.y + frame.y, z }));

    for (let i = 0; i < corners.length; i += 1) {
      drawWorldLine(
        ctx,
        corners[i],
        corners[(i + 1) % corners.length],
        state,
        frame.color,
        frame.opacity,
        i % 2 ? 0.9 : 1.35,
      );
    }
  }
}

function drawQuestionConstellation(ctx, question, state) {
  if (!question) return;

  const { time, depth, eye, screen, viewport, dpr } = state;
  const reveal = activeReveal(question, eye, time);
  const lock = state.readingHold ?? 0;

  ctx.save();
  ctx.globalCompositeOperation = "lighter";

  for (const pass of [
    { alpha: 0.14, scale: 6.2 },
    { alpha: 0.3, scale: 2.9 },
    { alpha: 0.72, scale: 1 },
  ]) {
    for (const dot of question.points) {
      const pulse = Math.sin(time * 0.9 + dot.phase) * 0.018;
      const color = dot.colorShift % 3 === 0 ? PALETTE.ink : question.color;
      const projected = projectPoint(
        {
          x: dot.x,
          y: dot.y,
          z: (dot.z + pulse) * depth,
        },
        eye,
        screen,
        viewport,
        dpr,
      );
      if (!projected.visible) continue;

      const lockFocus = 1 - lock * 0.42;
      const size = clamp(
        dot.size * projected.scale * (1.1 + reveal * 2.4) * pass.scale * lockFocus,
        0.45,
        7.5,
      );
      ctx.fillStyle = `rgba(${color}, ${pass.alpha * (0.42 + reveal * 0.9) * (1 - lock * 0.18)})`;
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

  const { viewport, dpr, screen, eye, depth, time } = state;
  const anchor = projectPoint(
    { x: question.x, y: question.y, z: -2.2 * depth },
    eye,
    screen,
    viewport,
    dpr,
  );
  if (!anchor.visible) return;

  const reveal = activeReveal(question, eye, time);
  const alpha = smoothstep(0.16, 0.76, lock) * reveal;
  if (alpha <= 0.01) return;

  const fontSize = clamp(anchor.scale * 54, 16 * dpr, 34 * dpr);
  const lineHeight = fontSize * 1.18;
  const maxWidth = Math.min(viewport.width * 0.74, 820 * dpr);
  const totalHeight = (question.lines.length - 1) * lineHeight;

  ctx.save();
  ctx.translate(anchor.x, anchor.y);
  ctx.rotate(question.rot * 0.38 + eye.x * 0.018);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `700 ${fontSize}px Inter, Arial, sans-serif`;
  ctx.globalCompositeOperation = "lighter";

  question.lines.forEach((line, index) => {
    const y = index * lineHeight - totalHeight / 2;
    ctx.lineWidth = Math.max(1, 5.5 * dpr);
    ctx.strokeStyle = `rgba(${question.color}, ${0.12 * alpha})`;
    ctx.shadowColor = `rgba(${question.color}, ${0.55 * alpha})`;
    ctx.shadowBlur = 18 * dpr;
    ctx.strokeText(line, 0, y, maxWidth);

    ctx.lineWidth = Math.max(0.7, 1.1 * dpr);
    ctx.strokeStyle = `rgba(245, 241, 232, ${0.82 * alpha})`;
    ctx.shadowBlur = 7 * dpr;
    ctx.strokeText(line, 0, y, maxWidth);
  });

  ctx.restore();
}

function drawTextShards(ctx, shards, state) {
  const { time, depth, eye, screen, viewport, dpr } = state;

  for (const shard of shards) {
    const projected = projectPoint(
      { x: shard.x, y: shard.y, z: shard.z * depth },
      eye,
      screen,
      viewport,
      dpr,
    );
    if (!projected.visible) continue;

    const size = clamp(shard.size * projected.scale * 150, 1.2, 9.5);
    ctx.save();
    ctx.translate(projected.x, projected.y);
    ctx.rotate(shard.rot + Math.sin(time * shard.spin + shard.phase) * 0.25);
    ctx.fillStyle = `rgba(${shard.color}, ${clamp(0.34 + projected.depth, 0.32, 0.88)})`;
    ctx.fillRect(-size / 2, -size / 2, size, size);
    ctx.restore();
  }
}

function drawAperture(ctx, viewport) {
  const gradient = ctx.createRadialGradient(
    viewport.width / 2,
    viewport.height / 2,
    viewport.height * 0.16,
    viewport.width / 2,
    viewport.height / 2,
    viewport.height * 0.86,
  );
  gradient.addColorStop(0, "rgba(5, 6, 9, 0)");
  gradient.addColorStop(0.62, "rgba(5, 6, 9, 0.06)");
  gradient.addColorStop(1, "rgba(5, 6, 9, 0.68)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, viewport.width, viewport.height);

  ctx.strokeStyle = "rgba(245, 241, 232, 0.22)";
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

function activeReveal(question, eye, time) {
  const gaze = clamp(
    1 - Math.hypot((question.revealEye.x - eye.x) * 0.78, (question.revealEye.y - eye.y) * 1.15),
    0,
    1,
  );
  return clamp(0.08 + gaze * 0.92 + Math.sin(time * 0.75) * 0.05, 0.08, 1);
}

function smoothstep(edge0, edge1, value) {
  const t = clamp((value - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

function wrapQuestion(text) {
  const words = text.split(" ");
  const lines = [];
  let line = "";
  const maxChars = 30;

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
