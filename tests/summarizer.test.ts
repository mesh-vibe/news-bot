import { describe, it, expect, vi, beforeEach } from "vitest";
import type { ScoredArticle } from "../src/types.js";

vi.mock("../src/ai/client.js", () => ({
  ask: vi.fn(),
}));

const { ask } = await import("../src/ai/client.js");
const { enhanceSummaries } = await import("../src/ai/summarizer.js");
const mockedAsk = vi.mocked(ask);

beforeEach(() => {
  vi.clearAllMocks();
});

function makeArticle(overrides: Partial<ScoredArticle> = {}): ScoredArticle {
  return {
    title: "Test Article",
    url: "https://example.com/test",
    source: "Test Source",
    score: 0.8,
    summary: "",
    topics: ["Testing"],
    ...overrides,
  };
}

describe("enhanceSummaries", () => {
  it("returns articles unchanged when all have adequate summaries", async () => {
    const articles = [
      makeArticle({ summary: "This is a summary that is more than twenty characters long." }),
      makeArticle({
        url: "https://example.com/2",
        summary: "Another long enough summary for the test.",
      }),
    ];

    const result = await enhanceSummaries(articles);
    expect(mockedAsk).not.toHaveBeenCalled();
    expect(result).toEqual(articles);
  });

  it("enhances articles with short summaries", async () => {
    mockedAsk.mockResolvedValue(
      JSON.stringify([{ index: 0, summary: "Enhanced summary for the article." }])
    );

    const articles = [
      makeArticle({ summary: "Short", url: "https://example.com/short" }),
      makeArticle({
        summary: "This summary is already long enough to pass the threshold check.",
        url: "https://example.com/long",
      }),
    ];

    const result = await enhanceSummaries(articles);
    expect(mockedAsk).toHaveBeenCalledTimes(1);
    expect(result[0]!.summary).toBe("Enhanced summary for the article.");
    expect(result[1]!.summary).toBe(
      "This summary is already long enough to pass the threshold check."
    );
  });

  it("enhances articles with empty summaries", async () => {
    mockedAsk.mockResolvedValue(
      JSON.stringify([{ index: 0, summary: "New summary." }])
    );

    const articles = [makeArticle({ summary: "", url: "https://example.com/empty" })];
    const result = await enhanceSummaries(articles);
    expect(result[0]!.summary).toBe("New summary.");
  });

  it("preserves originals when API response is malformed", async () => {
    mockedAsk.mockResolvedValue("Not valid JSON response at all");

    const articles = [makeArticle({ summary: "Short", url: "https://example.com/1" })];
    const result = await enhanceSummaries(articles);
    expect(result[0]!.summary).toBe("Short");
  });

  it("preserves originals when API throws", async () => {
    mockedAsk.mockRejectedValue(new Error("API down"));

    const articles = [makeArticle({ summary: "Short", url: "https://example.com/1" })];
    const result = await enhanceSummaries(articles);
    expect(result[0]!.summary).toBe("Short");
  });

  it("returns empty array for empty input", async () => {
    const result = await enhanceSummaries([]);
    expect(result).toHaveLength(0);
    expect(mockedAsk).not.toHaveBeenCalled();
  });

  it("batches articles for summarization", async () => {
    // SUMMARY_BATCH_SIZE is 10, create 15 articles needing summaries
    const articles = Array.from({ length: 15 }, (_, i) =>
      makeArticle({ summary: "", url: `https://example.com/${i}` })
    );

    mockedAsk
      .mockResolvedValueOnce(
        JSON.stringify(
          Array.from({ length: 10 }, (_, i) => ({
            index: i,
            summary: `Summary for article ${i}`,
          }))
        )
      )
      .mockResolvedValueOnce(
        JSON.stringify(
          Array.from({ length: 5 }, (_, i) => ({
            index: i,
            summary: `Summary for article ${i + 10}`,
          }))
        )
      );

    const result = await enhanceSummaries(articles);
    expect(mockedAsk).toHaveBeenCalledTimes(2);
    expect(result[0]!.summary).toBe("Summary for article 0");
    expect(result[14]!.summary).toBe("Summary for article 14");
  });

  it("skips articles with summary >= 20 chars from enhancement", async () => {
    mockedAsk.mockResolvedValue(
      JSON.stringify([{ index: 0, summary: "Enhanced" }])
    );

    const articles = [
      makeArticle({ summary: "Exactly twenty chars!", url: "https://example.com/1" }),
      makeArticle({ summary: "Too short", url: "https://example.com/2" }),
    ];

    const result = await enhanceSummaries(articles);
    // Only the short one gets enhanced
    expect(result[0]!.summary).toBe("Exactly twenty chars!");
    expect(result[1]!.summary).toBe("Enhanced");
  });
});
