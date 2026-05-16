import { describe, expect, it } from "vitest";
import { projectPoint } from "../src/projection.js";
import { anamorphicPointForView, createFrames, selectActiveQuestion } from "../src/scene.js";

const screen = { width: 4.8, height: 2.7 };
const viewport = { width: 1200, height: 675 };

describe("perceptual field geometry", () => {
  it("builds layered wireframe panes behind the screen", () => {
    const frames = createFrames(screen, () => 0.5);

    expect(frames.length).toBeGreaterThan(20);
    expect(frames[0].z).toBeLessThan(0);
    expect(frames.at(-1).z).toBeLessThan(frames[0].z);
  });

  it("keeps frame layers wider as they recede", () => {
    const frames = createFrames(screen, () => 0.5);

    expect(frames.at(-1).w).toBeGreaterThan(frames[0].w);
    expect(frames.at(-1).h).toBeGreaterThan(frames[0].h);
  });

  it("avoids a rigid corridor by drifting and rotating frame layers", () => {
    const frames = createFrames(screen, () => 0.5);
    const hasDrift = frames.some((frame) => Math.abs(frame.x) > 0.05 || Math.abs(frame.y) > 0.05);
    const hasRotation = frames.some((frame) => Math.abs(frame.rot) > 0.1);

    expect(hasDrift).toBe(true);
    expect(hasRotation).toBe(true);
  });

  it("cycles one active question plane at a time", () => {
    const questions = [{ question: "first" }, { question: "second" }, { question: "third" }];

    expect(selectActiveQuestion(questions, 0).question).toBe("first");
    expect(selectActiveQuestion(questions, 13).question).toBe("second");
    expect(selectActiveQuestion(questions, 26).question).toBe("third");
    expect(selectActiveQuestion(questions, 39).question).toBe("first");
  });

  it("places anamorphic points on the sightline of a reveal eye", () => {
    const revealEye = { x: 0.75, y: -0.22, z: 3.2 };
    const target = { x: -0.6, y: 0.34 };
    const point = anamorphicPointForView(target, -6.4, revealEye);
    const projected = projectPoint(point, revealEye, screen, viewport, 1);

    expect(projected.x).toBeCloseTo((target.x / screen.width + 0.5) * viewport.width);
    expect(projected.y).toBeCloseTo((-target.y / screen.height + 0.5) * viewport.height);
  });
});
