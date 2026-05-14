import { describe, expect, it } from "vitest";
import {
  deriveFaceEye,
  derivePointerEye,
  makeScreen,
  projectPoint,
  projectScreenPointToDepth,
  rotate2,
} from "../src/projection.js";

describe("projection math", () => {
  it("keeps the screen center at the viewport center for a centered eye", () => {
    const screen = makeScreen(1440, 960);
    const projected = projectPoint(
      { x: 0, y: 0, z: -3 },
      { x: 0, y: 0, z: 3.2 },
      screen,
      { width: 1440, height: 960 },
      1,
    );

    expect(projected.visible).toBe(true);
    expect(projected.x).toBeCloseTo(720, 3);
    expect(projected.y).toBeCloseTo(480, 3);
  });

  it("projects an anamorphic screen point into depth and back to the same screen point", () => {
    const screen = makeScreen(1440, 960);
    const eye = { x: 0, y: 0, z: 3.2 };
    const world = projectScreenPointToDepth(0.9, -0.35, -7.4, eye.z);
    const projected = projectPoint(world, eye, screen, { width: 1440, height: 960 }, 1);

    expect(projected.x).toBeCloseTo((0.9 / screen.width + 0.5) * 1440, 3);
    expect(projected.y).toBeCloseTo((-(-0.35) / screen.height + 0.5) * 960, 3);
  });

  it("maps pointer movement to a bounded virtual eye target", () => {
    expect(derivePointerEye({ x: 1, y: -1 }, 1)).toEqual({ x: 1.18, y: -0.72, z: 3.2 });
  });

  it("clamps face-derived eye movement", () => {
    const eye = deriveFaceEye(
      { x: -10, y: 10, eyeSep: 0.001 },
      { x: 0.5, y: 0.5, eyeSep: 0.17 },
      makeScreen(1440, 960),
      2,
    );

    expect(eye.x).toBe(2.2);
    expect(eye.y).toBe(-1.45);
    expect(eye.z).toBe(5.8);
  });

  it("rotates two-dimensional points", () => {
    const rotated = rotate2(1, 0, Math.PI / 2);
    expect(rotated.x).toBeCloseTo(0, 6);
    expect(rotated.y).toBeCloseTo(1, 6);
  });
});
