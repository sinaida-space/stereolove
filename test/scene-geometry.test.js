import { describe, expect, it } from "vitest";
import { DEFAULT_EYE } from "../src/config.js";
import { bilerp, createBox, makeOpenedBox, wallFocus } from "../src/scene.js";

const screen = { width: 4.8, height: 2.7 };

describe("spatial chamber geometry", () => {
  it("anchors the chamber aperture to the screen plane", () => {
    const box = createBox(screen);

    expect(box.halfW).toBeCloseTo(2.4);
    expect(box.halfH).toBeCloseTo(1.35);
    expect(box.left[0].z).toBeCloseTo(-0.05);
    expect(box.right[0].z).toBeCloseTo(-0.05);
    expect(box.ceiling[0].z).toBeCloseTo(-0.05);
    expect(box.floor[0].z).toBeCloseTo(-0.05);
  });

  it("creates a deep back plane behind the screen", () => {
    const box = createBox(screen);

    for (const corner of box.back) {
      expect(corner.z).toBeLessThan(-10);
    }
  });

  it("opens the left wall when the virtual eye looks left", () => {
    const box = createBox(screen);
    const opened = makeOpenedBox(box, {
      eye: { ...DEFAULT_EYE, x: -1.2 },
      time: 0,
    });

    expect(opened.left[2].x).toBeLessThan(box.left[2].x);
    expect(opened.left[3].x).toBeLessThan(box.left[3].x);
  });

  it("opens the ceiling when the virtual eye looks upward", () => {
    const box = createBox(screen);
    const opened = makeOpenedBox(box, {
      eye: { ...DEFAULT_EYE, y: 0.9 },
      time: 0,
    });

    expect(opened.ceiling[2].y).toBeGreaterThan(box.ceiling[2].y);
    expect(opened.ceiling[3].y).toBeGreaterThan(box.ceiling[3].y);
  });

  it("raises focus on the wall matching the eye direction", () => {
    expect(wallFocus("right", { ...DEFAULT_EYE, x: 1.2 })).toBeGreaterThan(0.8);
    expect(wallFocus("left", { ...DEFAULT_EYE, x: -1.2 })).toBeGreaterThan(0.8);
    expect(wallFocus("ceiling", { ...DEFAULT_EYE, y: 0.9 })).toBe(1);
    expect(wallFocus("floor", { ...DEFAULT_EYE, y: -0.9 })).toBe(1);
  });

  it("interpolates points across a wall surface", () => {
    const box = createBox(screen);
    const center = bilerp(box.back, 0.5, 0.5);

    expect(center.x).toBeCloseTo(0);
    expect(center.y).toBeCloseTo(0);
    expect(center.z).toBeCloseTo(box.backZ);
  });
});
