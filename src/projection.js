import { DEFAULT_EYE } from "./config.js";

export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function lerp(a, b, amount) {
  return a + (b - a) * amount;
}

export function rotate2(x, y, angle) {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  return { x: x * c - y * s, y: x * s + y * c };
}

export function makeScreen(width, height, worldWidth = 4.8) {
  return {
    width: worldWidth,
    height: worldWidth / (width / height),
  };
}

export function projectPoint(point, eye, screen, viewport, dpr = 1) {
  const denom = point.z - eye.z;
  if (denom >= -0.02) {
    return { visible: false, x: 0, y: 0, scale: 0, depth: 0 };
  }

  const k = -eye.z / denom;
  const sx = eye.x + (point.x - eye.x) * k;
  const sy = eye.y + (point.y - eye.y) * k;

  return {
    visible: true,
    x: (sx / screen.width + 0.5) * viewport.width,
    y: (-sy / screen.height + 0.5) * viewport.height,
    scale: k * dpr,
    depth: clamp((Math.abs(point.z) - 0.5) / 13, 0, 1),
  };
}

export function projectScreenPointToDepth(x, y, z, eyeZ = DEFAULT_EYE.z) {
  const t = (eyeZ - z) / eyeZ;
  return { x: x * t, y: y * t, z };
}

export function derivePointerEye(pointer, sensitivity, idealEyeZ = DEFAULT_EYE.z) {
  return {
    x: pointer.x * 1.18 * sensitivity,
    y: pointer.y * 0.72 * sensitivity,
    z: idealEyeZ,
  };
}

export function deriveFaceEye(face, neutralFace, screen, sensitivity, idealEyeZ = DEFAULT_EYE.z) {
  return {
    x: clamp((neutralFace.x - face.x) * screen.width * 3.2 * sensitivity, -2.2, 2.2),
    y: clamp((neutralFace.y - face.y) * screen.height * 3 * sensitivity, -1.45, 1.45),
    z: clamp(idealEyeZ * (neutralFace.eyeSep / face.eyeSep), 1.55, 5.8),
  };
}
