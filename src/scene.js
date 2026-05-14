import { DEFAULT_EYE, PALETTE } from "./config.js";
import { clamp, projectPoint, projectScreenPointToDepth, rotate2 } from "./projection.js";
import { sampleTextPoints } from "./text-sampler.js";

export function createScene(screen, random = Math.random) {
  const frames = createFrames(screen);
  const bars = createBars(screen);
  const field = createField(screen, random);
  const rosettes = createRosettes(random);
  const textShards = sampleTextPoints("WHOSE REALITY?", {
    maxPoints: 1700,
    screen,
    subtitle: "attention edits the world",
    random,
  }).map((point, index) => {
    const z = -1.1 - random() * 10.5;
    const world = projectScreenPointToDepth(point.x, point.y, z, DEFAULT_EYE.z);
    const palette = [PALETTE.cyan, PALETTE.red, PALETTE.gold, PALETTE.violet, PALETTE.green];

    return {
      x: world.x,
      y: world.y,
      z,
      size: 0.018 + random() * 0.045,
      rot: random() * Math.PI,
      spin: 0.5 + random() * 1.4,
      phase: random() * Math.PI * 2,
      color: palette[index % palette.length],
    };
  });

  return { frames, bars, field, rosettes, textShards };
}

export function drawScene(ctx, scene, state) {
  const { viewport, dpr, screen, eye, time, depth } = state;

  ctx.fillStyle = PALETTE.background;
  ctx.fillRect(0, 0, viewport.width, viewport.height);

  drawRetinalField(ctx, scene.field, state);
  drawMoireCurtains(ctx, state);
  drawFloor(ctx, state);
  drawRosettes(ctx, scene.rosettes, state);
  drawBars(ctx, scene.bars, state);
  drawFrames(ctx, scene.frames, state);
  drawTextShards(ctx, scene.textShards, state);
  drawAperture(ctx, viewport);

  function drawRetinalField(context, points) {
    for (const point of points) {
      const z = point.z * depth;
      const projected = projectPoint(
        { x: point.x + Math.sin(time * point.speed + point.phase) * 0.025, y: point.y, z },
        eye,
        screen,
        viewport,
        dpr,
      );
      if (!projected.visible) continue;

      const alpha = clamp(0.12 + projected.depth * 0.68, 0.08, 0.62);
      context.fillStyle = `rgba(${point.color}, ${alpha})`;
      context.beginPath();
      context.arc(
        projected.x,
        projected.y,
        Math.max(0.55, projected.scale * point.size),
        0,
        Math.PI * 2,
      );
      context.fill();
    }
  }
}

function drawMoireCurtains(ctx, state) {
  const { screen, depth, time } = state;
  for (let layer = 0; layer < 5; layer += 1) {
    const z = (-1.2 - layer * 2.35) * depth;
    const color = layer % 2 ? PALETTE.violet : PALETTE.cyan;
    const alpha = 0.09 + layer * 0.015;
    const count = 28 + layer * 3;
    const phase = time * (0.15 + layer * 0.025);

    for (let i = 0; i < count; i += 1) {
      const x = (i / (count - 1) - 0.5) * screen.width * (1.2 + layer * 0.18);
      const wave = Math.sin(i * 0.65 + phase) * 0.36;
      drawWorldLine(
        ctx,
        { x: x + wave, y: -screen.height * 0.78, z },
        { x: -x * 0.55, y: screen.height * 0.78, z: z - 1.8 },
        state,
        color,
        alpha,
        0.8,
      );
    }
  }
}

function drawFloor(ctx, state) {
  const { screen, depth } = state;
  const y = -screen.height * 0.56;

  for (let i = -12; i <= 12; i += 1) {
    drawWorldLine(
      ctx,
      { x: i * 0.72, y, z: -0.6 * depth },
      { x: i * 1.45, y, z: -16 * depth },
      state,
      PALETTE.cyan,
      0.12,
    );
  }

  for (let z = -1; z >= -16; z -= 0.74) {
    drawWorldLine(
      ctx,
      { x: -8.5, y, z: z * depth },
      { x: 8.5, y, z: z * depth },
      state,
      PALETTE.ink,
      0.09,
    );
  }
}

function drawRosettes(ctx, rosettes, state) {
  const { time, depth } = state;

  for (const rosette of rosettes) {
    const z = rosette.z * depth;
    const arms = rosette.arms;
    const radius = rosette.radius;
    const spin = time * rosette.speed + rosette.phase;

    for (let i = 0; i < arms; i += 1) {
      const angle = (i / arms) * Math.PI * 2 + spin;
      const inner = {
        x: rosette.x + Math.cos(angle) * radius * 0.12,
        y: rosette.y + Math.sin(angle) * radius * 0.12,
        z,
      };
      const outer = {
        x: rosette.x + Math.cos(angle * rosette.fold) * radius,
        y: rosette.y + Math.sin(angle) * radius,
        z: z - rosette.depth,
      };

      drawWorldLine(ctx, inner, outer, state, rosette.color, 0.18, 1.2);
    }
  }
}

function drawBars(ctx, bars, state) {
  const { depth } = state;
  for (const bar of bars) {
    drawWorldLine(
      ctx,
      { x: bar.x, y: bar.y, z: -0.6 * depth },
      { x: bar.x * 1.5, y: bar.y, z: -14 * depth },
      state,
      bar.color,
      bar.color === PALETTE.gold ? 0.26 : 0.17,
      2,
    );
  }
}

function drawFrames(ctx, frames, state) {
  const { time, depth } = state;

  for (const frame of frames) {
    const z = frame.z * depth;
    const rot = frame.rot + Math.sin(time * frame.speed) * 0.035;
    const corners = [
      rotate2(-frame.w / 2, -frame.h / 2, rot),
      rotate2(frame.w / 2, -frame.h / 2, rot),
      rotate2(frame.w / 2, frame.h / 2, rot),
      rotate2(-frame.w / 2, frame.h / 2, rot),
    ].map((point) => ({ x: point.x, y: point.y, z }));

    for (let i = 0; i < corners.length; i += 1) {
      drawWorldLine(
        ctx,
        corners[i],
        corners[(i + 1) % corners.length],
        state,
        PALETTE.ink,
        frame.opacity,
        1.3,
      );
    }
  }
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

    const size = clamp(shard.size * projected.scale * 150, 1.5, 10);
    ctx.save();
    ctx.translate(projected.x, projected.y);
    ctx.rotate(shard.rot + Math.sin(time * shard.spin + shard.phase) * 0.25);
    ctx.fillStyle = `rgba(${shard.color}, ${clamp(0.38 + projected.depth, 0.35, 0.95)})`;
    ctx.fillRect(-size / 2, -size / 2, size, size);
    ctx.restore();
  }
}

function drawAperture(ctx, viewport) {
  const gradient = ctx.createRadialGradient(
    viewport.width / 2,
    viewport.height / 2,
    viewport.height * 0.18,
    viewport.width / 2,
    viewport.height / 2,
    viewport.height * 0.86,
  );
  gradient.addColorStop(0, "rgba(5, 6, 9, 0)");
  gradient.addColorStop(1, "rgba(5, 6, 9, 0.58)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, viewport.width, viewport.height);
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

function createFrames(screen) {
  return Array.from({ length: 21 }, (_, i) => {
    const scale = 1 + i * 0.075;
    return {
      z: -0.8 - i * 0.68,
      w: screen.width * scale,
      h: screen.height * scale,
      rot: (i % 2 === 0 ? 1 : -1) * 0.014 * i,
      opacity: i % 3 === 0 ? 0.47 : 0.16,
      speed: 0.35 + i * 0.02,
    };
  });
}

function createBars(screen) {
  const bars = [];
  for (let i = -5; i <= 5; i += 1) {
    bars.push({ x: i * 0.5, y: screen.height * 0.54, color: i % 2 ? PALETTE.cyan : PALETTE.gold });
    bars.push({
      x: i * 0.5,
      y: -screen.height * 0.54,
      color: i % 2 ? PALETTE.violet : PALETTE.gold,
    });
  }
  return bars;
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
  return Array.from({ length: 5200 }, () => {
    const z = -1 - random() * 17;
    const spread = 1.7 + Math.abs(z) * 0.23;
    return {
      x: (random() - 0.5) * screen.width * spread,
      y: (random() - 0.5) * screen.height * spread,
      z,
      size: 0.8 + random() * 1.8,
      speed: 0.4 + random() * 0.7,
      phase: random() * Math.PI * 2,
      color: palette[Math.floor(random() * palette.length)],
    };
  });
}

function createRosettes(random) {
  const palette = [PALETTE.cyan, PALETTE.red, PALETTE.gold, PALETTE.violet, PALETTE.green];
  return Array.from({ length: 9 }, (_, i) => ({
    x: ((i % 3) - 1) * 2.25,
    y: (Math.floor(i / 3) - 1) * 1.05,
    z: -3 - i * 1.35,
    radius: 0.72 + random() * 0.55,
    depth: 0.8 + random() * 1.2,
    arms: 24 + (i % 3) * 12,
    fold: 2 + (i % 4),
    speed: (i % 2 ? -1 : 1) * (0.04 + random() * 0.04),
    phase: random() * Math.PI * 2,
    color: palette[i % palette.length],
  }));
}
