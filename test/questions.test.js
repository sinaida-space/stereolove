import { describe, expect, it } from "vitest";
import { QUESTIONS } from "../src/questions.js";

describe("question set", () => {
  it("uses the introspective solo question set", () => {
    const forbiddenTerm = ["part", "ner"].join("");

    expect(QUESTIONS).toHaveLength(50);
    expect(QUESTIONS.some((question) => new RegExp(forbiddenTerm, "i").test(question))).toBe(false);
  });
});
