import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Article, InterestProfile } from "../src/types.js";

vi.mock("../src/ai/client.js", () => ({
  ask: vi.fn(),
}));

const { ask } = await import("../src/ai/client.js");
const { scoreArticles } = await import("../src/ai/scorer.js");
const mockedAsk = vi.mocked(ask);

beforeEach(() => {
  vi.clearAllMocks();
});

const testProfile: InterestProfile = {
  high: [{ topic: "TypeScript", weight: 0.9 }],
  moderate: [{ topic: "Go", weight: 0.5 }],
  pinned: [{ topic: "AI safety", weight: 1.0, pinned: true }],
  blocked: [{ topic: "Celebrity gossip", weight: 1.0, blocked: true }],
};

function makeArticle(i: number): Article {
  return {
    title: `Article ${i}`,
    url: `https://example.com/article-${i}`,
    source: "Test Source",
    description: `Description for article ${i}`,
  };
}

describe("scoreArticles", () => {
  it("returns empty array for empty input", async () => {
    const result = await scoreArticles([], testProfile);
    expect(result).toHaveLength(0);
    expect(mockedAsk).not.toHaveBeenCalled();
  });

  it("parses valid JSON response and maps scores to articles", async () => {
    mockedAsk.mockResolvedValue(
      JSON.stringify([
        { index: 0, score: 0.85, topics: ["TypeScript"], summary: "About TS" },
        { index: 1, score: 0.4, topics: ["Go"], summary: "About Go" },
      ])
    );

    const articles = [makeArticle(0), makeArticle(1)];
    const result = await scoreArticles(articles, testProfile);

    expect(result).toHaveLength(2);
    // Sorted by score descending
    expect(result[0]!.score).toBe(0.85);
    expect(result[0]!.title).toBe("Article 0");
    expect(result[0]!.topics).toEqual(["TypeScript"]);
    expect(result[0]!.summary).toBe("About TS");
    expect(result[1]!.score).toBe(0.4);
  });

  it("clamps scores above 1.0 to 1.0", async () => {
    mockedAsk.mockResolvedValue(
      JSON.stringify([{ index: 0, score: 1.5, topics: [], summary: "Test" }])
    );

    const result = await scoreArticles([makeArticle(0)], testProfile);
    expect(result[0]!.score).toBe(1.0);
  });

  it("clamps scores below 0 to 0", async () => {
    mockedAsk.mockResolvedValue(
      JSON.stringify([{ index: 0, score: -0.5, topics: [], summary: "Test" }])
    );

    const result = await scoreArticles([makeArticle(0)], testProfile);
    expect(result[0]!.score).toBe(0);
  });

  it("skips batch when response has no JSON array", async () => {
    mockedAsk.mockResolvedValue("Sorry, I can't score these articles right now.");

    const result = await scoreArticles([makeArticle(0)], testProfile);
    expect(result).toHaveLength(0);
  });

  it("skips batch on malformed JSON", async () => {
    mockedAsk.mockResolvedValue("[{invalid json}]");

    const result = await scoreArticles([makeArticle(0)], testProfile);
    expect(result).toHaveLength(0);
  });

  it("ignores out-of-range indices", async () => {
    mockedAsk.mockResolvedValue(
      JSON.stringify([
        { index: 0, score: 0.7, topics: ["A"], summary: "Valid" },
        { index: 99, score: 0.5, topics: ["B"], summary: "Invalid index" },
      ])
    );

    const result = await scoreArticles([makeArticle(0)], testProfile);
    expect(result).toHaveLength(1);
    expect(result[0]!.title).toBe("Article 0");
  });

  it("batches articles into chunks of SCORING_BATCH_SIZE", async () => {
    // Create 25 articles (SCORING_BATCH_SIZE is 20, so 2 batches)
    const articles = Array.from({ length: 25 }, (_, i) => makeArticle(i));

    mockedAsk
      .mockResolvedValueOnce(
        JSON.stringify(
          Array.from({ length: 20 }, (_, i) => ({
            index: i,
            score: 0.5,
            topics: [],
            summary: `Summary ${i}`,
          }))
        )
      )
      .mockResolvedValueOnce(
        JSON.stringify(
          Array.from({ length: 5 }, (_, i) => ({
            index: i,
            score: 0.6,
            topics: [],
            summary: `Summary ${i + 20}`,
          }))
        )
      );

    const result = await scoreArticles(articles, testProfile);
    expect(mockedAsk).toHaveBeenCalledTimes(2);
    expect(result).toHaveLength(25);
  });

  it("continues scoring remaining batches when one fails", async () => {
    const articles = Array.from({ length: 25 }, (_, i) => makeArticle(i));

    mockedAsk
      .mockRejectedValueOnce(new Error("API error"))
      .mockResolvedValueOnce(
        JSON.stringify(
          Array.from({ length: 5 }, (_, i) => ({
            index: i,
            score: 0.7,
            topics: [],
            summary: `Summary ${i}`,
          }))
        )
      );

    const result = await scoreArticles(articles, testProfile);
    expect(mockedAsk).toHaveBeenCalledTimes(2);
    // Only second batch succeeds (5 articles)
    expect(result).toHaveLength(5);
  });

  it("returns results sorted by score descending", async () => {
    mockedAsk.mockResolvedValue(
      JSON.stringify([
        { index: 0, score: 0.3, topics: [], summary: "Low" },
        { index: 1, score: 0.9, topics: [], summary: "High" },
        { index: 2, score: 0.6, topics: [], summary: "Mid" },
      ])
    );

    const articles = [makeArticle(0), makeArticle(1), makeArticle(2)];
    const result = await scoreArticles(articles, testProfile);

    expect(result[0]!.score).toBe(0.9);
    expect(result[1]!.score).toBe(0.6);
    expect(result[2]!.score).toBe(0.3);
  });

  it("includes profile information in the prompt", async () => {
    mockedAsk.mockResolvedValue("[]");
    await scoreArticles([makeArticle(0)], testProfile);

    const userMessage = mockedAsk.mock.calls[0]![1];
    expect(userMessage).toContain("TypeScript");
    expect(userMessage).toContain("0.90");
    expect(userMessage).toContain("AI safety");
    expect(userMessage).toContain("Celebrity gossip");
  });

  it("includes article data in the prompt", async () => {
    mockedAsk.mockResolvedValue("[]");
    await scoreArticles([makeArticle(0)], testProfile);

    const userMessage = mockedAsk.mock.calls[0]![1];
    expect(userMessage).toContain("[0] Article 0");
    expect(userMessage).toContain("Test Source");
    expect(userMessage).toContain("Description for article 0");
  });

  it("handles response with JSON wrapped in text", async () => {
    mockedAsk.mockResolvedValue(
      'Here are the scores:\n[{"index": 0, "score": 0.8, "topics": ["AI"], "summary": "About AI"}]\nDone!'
    );

    const result = await scoreArticles([makeArticle(0)], testProfile);
    expect(result).toHaveLength(1);
    expect(result[0]!.score).toBe(0.8);
  });
});
