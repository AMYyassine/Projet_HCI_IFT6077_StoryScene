import { describe, expect, it } from "vitest";
import { demoStory, demoWorkspace } from "./demo";
import {
  branchWorkspace,
  currentStory,
  deleteScene,
  descendants,
  parseWorkspace,
  replaceSceneText,
} from "./model";

describe("narrative changes", () => {
  it("follows causal and preparatory dependencies, including indirect consequences", () => {
    const story = demoStory();
    expect(descendants(story, "s4")).toEqual(["s7", "s8", "s9", "s10"]);
    story.links.push({
      id: "cycle",
      source: "s10",
      target: "s4",
      type: "prepares",
      reason: "A circular callback.",
    });
    expect(descendants(story, "s4")).toEqual(["s7", "s8", "s9", "s10"]);
  });
  it("removes dangling links and flags only affected scenes on deletion", () => {
    const original = demoStory();
    const changed = deleteScene(original, "s4");
    expect(changed.scenes.some((s) => s.id === "s4")).toBe(false);
    expect(
      changed.links.some((l) => l.source === "s4" || l.target === "s4"),
    ).toBe(false);
    expect(
      changed.scenes.filter((s) => s.needsReview).map((s) => s.id),
    ).toEqual(["s7", "s8", "s9", "s10"]);
    expect(original.scenes.length).toBe(10);
  });
  it("branches without sharing mutable source paragraphs or characters", () => {
    const original = demoWorkspace();
    const fork = branchWorkspace(
      original,
      "A different choice",
      "Scene: The forgotten letter",
    );
    currentStory(fork).paragraphs[0].text = "A different opening.";
    currentStory(fork).scenes[0].cast[0].action = "Leaves.";
    expect(currentStory(original).paragraphs[0].text).not.toBe(
      "A different opening.",
    );
    expect(fork.branches[0].story.scenes[0].cast[0].action).not.toBe("Leaves.");
  });
  it("replaces only the selected quotation and retains the original snapshot", () => {
    const original = demoStory();
    const before = original.paragraphs[6].text;
    const changed = replaceSceneText(
      original,
      "s7",
      "Lea chooses to listen before asking a question.",
    );
    expect(changed.paragraphs[6].text).toBe(
      "Lea chooses to listen before asking a question.",
    );
    expect(changed.paragraphs[5]).toEqual(original.paragraphs[5]);
    expect(original.paragraphs[6].text).toBe(before);
    expect(changed.scenes.find((s) => s.id === "s8")?.needsReview).toBe(true);
  });
  it("blocks a replacement when a source anchor is stale or shared", () => {
    const story = demoStory();
    story.paragraphs[6].text = "An edited passage.";
    expect(() => replaceSceneText(story, "s7", "New text.")).toThrow(
      "source passage has changed",
    );
    const shared = demoStory();
    shared.scenes[5].anchors = [{ ...shared.scenes[6].anchors[0] }];
    expect(() => replaceSceneText(shared, "s7", "New text.")).toThrow("shared");
  });
});
describe("portable project validation", () => {
  it("round trips every branch and flags stale quotations", () => {
    const w = branchWorkspace(demoWorkspace(), "Alternative", "Act: The truth");
    expect(parseWorkspace(JSON.stringify(w))).toEqual(w);
    currentStory(w).paragraphs[0].text = "Edited manuscript.";
    expect(
      currentStory(parseWorkspace(JSON.stringify(w))).scenes[0].needsReview,
    ).toBe(true);
  });
  it("rejects malformed projects and missing scene references", () => {
    const w = demoWorkspace();
    currentStory(w).links[0].target = "missing";
    expect(() => parseWorkspace(JSON.stringify(w))).toThrow("not a valid");
    expect(() => parseWorkspace('{"schemaVersion":1}')).toThrow("not a valid");
  });
});
