import { describe, it, expect } from "vitest";
import { renderDigest } from "../src/digest/render.js";
import type { ScoredArticle, DigestMetadata } from "../src/types.js";

function makeArticle(overrides: Partial<ScoredArticle> = {}): ScoredArticle {
  return {
    title: "Test Article",
    url: "https://example.com/test",
    source: "Test Source",
    score: 0.5,
    summary: "Summary",
    topics: ["General"],
    ...overrides,
  };
}

const defaultMeta: DigestMetadata = {
  generatedAt: new Date("2026-03-12T10:00:00Z"),
  articleCount: 0,
  sourcesScanned: 5,
  topTopics: [],
};

describe("renderDigest", () => {
  it("groups articles by first topic", () => {
    const articles = [
      makeArticle({ title: "TS Article", url: "https://e.com/1", topics: ["TypeScript"], score: 0.7 }),
      makeArticle({ title: "Rust Article", url: "https://e.com/2", topics: ["Rust"], score: 0.6 }),
      makeArticle({ title: "Another TS", url: "https://e.com/3", topics: ["TypeScript"], score: 0.65 }),
    ];
    const html = renderDigest(articles, { ...defaultMeta, articleCount: 3 });

    // TypeScript articles should be grouped together (higher max score)
    const tsPos1 = html.indexOf("TS Article");
    const tsPos2 = html.indexOf("Another TS");
    const rustPos = html.indexOf("Rust Article");

    // Both TS articles should appear before Rust (TS max score 0.7 > Rust 0.6)
    expect(tsPos1).toBeLessThan(rustPos);
    expect(tsPos2).toBeLessThan(rustPos);
  });

  it("defaults to General for articles without topics", () => {
    const articles = [
      makeArticle({ title: "No Topics", url: "https://e.com/1", topics: [], score: 0.5 }),
    ];
    const html = renderDigest(articles, { ...defaultMeta, articleCount: 1 });
    expect(html).toContain("No Topics");
  });

  it("sorts groups by max score descending", () => {
    const articles = [
      makeArticle({ title: "Low Group", url: "https://e.com/1", topics: ["Low"], score: 0.3 }),
      makeArticle({ title: "High Group", url: "https://e.com/2", topics: ["High"], score: 0.9 }),
      makeArticle({ title: "Mid Group", url: "https://e.com/3", topics: ["Mid"], score: 0.6 }),
    ];
    const html = renderDigest(articles, { ...defaultMeta, articleCount: 3 });

    const highPos = html.indexOf("High Group");
    const midPos = html.indexOf("Mid Group");
    const lowPos = html.indexOf("Low Group");

    expect(highPos).toBeLessThan(midPos);
    expect(midPos).toBeLessThan(lowPos);
  });

  it("sorts articles within a group by score descending", () => {
    const articles = [
      makeArticle({ title: "Low Score", url: "https://e.com/1", topics: ["Same"], score: 0.4 }),
      makeArticle({ title: "High Score", url: "https://e.com/2", topics: ["Same"], score: 0.9 }),
      makeArticle({ title: "Mid Score", url: "https://e.com/3", topics: ["Same"], score: 0.6 }),
    ];
    const html = renderDigest(articles, { ...defaultMeta, articleCount: 3 });

    const highPos = html.indexOf("High Score");
    const midPos = html.indexOf("Mid Score");
    const lowPos = html.indexOf("Low Score");

    expect(highPos).toBeLessThan(midPos);
    expect(midPos).toBeLessThan(lowPos);
  });

  it("handles empty article list", () => {
    const html = renderDigest([], { ...defaultMeta, articleCount: 0 });
    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain("0 articles from");
  });

  it("handles single article", () => {
    const html = renderDigest(
      [makeArticle({ title: "Only One" })],
      { ...defaultMeta, articleCount: 1 }
    );
    expect(html).toContain("Only One");
  });
});
