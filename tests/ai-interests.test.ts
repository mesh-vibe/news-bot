import { describe, it, expect, vi, beforeEach } from "vitest";
import type { HistoryEntry } from "../src/types.js";

vi.mock("../src/ai/client.js", () => ({
  ask: vi.fn(),
}));

const { ask } = await import("../src/ai/client.js");
const { extractInterests } = await import("../src/ai/interests.js");
const mockedAsk = vi.mocked(ask);

beforeEach(() => {
  vi.clearAllMocks();
});

function makeEntry(i: number): HistoryEntry {
  return {
    url: `https://example.com/page-${i}`,
    title: `Page ${i}`,
    visitTime: new Date(),
    visitCount: i + 1,
    domain: "example.com",
  };
}

describe("extractInterests", () => {
  it("returns empty array for empty history", async () => {
    const result = await extractInterests([]);
    expect(result).toHaveLength(0);
    expect(mockedAsk).not.toHaveBeenCalled();
  });

  it("parses valid JSON response into interests", async () => {
    mockedAsk.mockResolvedValue(
      JSON.stringify([
        { topic: "TypeScript", weight: 0.9 },
        { topic: "Chess", weight: 0.65 },
      ])
    );

    const entries = [makeEntry(0), makeEntry(1)];
    const result = await extractInterests(entries);

    expect(result).toHaveLength(2);
    expect(result[0]!.topic).toBe("TypeScript");
    expect(result[0]!.weight).toBe(0.9);
    expect(result[1]!.topic).toBe("Chess");
    expect(result[1]!.weight).toBe(0.65);
  });

  it("clamps weights above 1.0 to 1.0", async () => {
    mockedAsk.mockResolvedValue(
      JSON.stringify([{ topic: "Over", weight: 1.5 }])
    );

    const result = await extractInterests([makeEntry(0)]);
    expect(result[0]!.weight).toBe(1.0);
  });

  it("clamps weights below 0 to 0", async () => {
    mockedAsk.mockResolvedValue(
      JSON.stringify([{ topic: "Under", weight: -0.3 }])
    );

    const result = await extractInterests([makeEntry(0)]);
    expect(result[0]!.weight).toBe(0);
  });

  it("returns empty array for malformed JSON response", async () => {
    mockedAsk.mockResolvedValue("This is not JSON at all");
    const result = await extractInterests([makeEntry(0)]);
    expect(result).toHaveLength(0);
  });

  it("returns empty array when response has no JSON array", async () => {
    mockedAsk.mockResolvedValue('{"key": "value"}');
    const result = await extractInterests([makeEntry(0)]);
    expect(result).toHaveLength(0);
  });

  it("handles JSON wrapped in text", async () => {
    mockedAsk.mockResolvedValue(
      'Here are the interests:\n[{"topic": "AI", "weight": 0.8}]\nEnd.'
    );

    const result = await extractInterests([makeEntry(0)]);
    expect(result).toHaveLength(1);
    expect(result[0]!.topic).toBe("AI");
  });

  it("limits input to HISTORY_BATCH_SIZE entries", async () => {
    mockedAsk.mockResolvedValue("[]");

    // Create 150 entries (HISTORY_BATCH_SIZE is 100)
    const entries = Array.from({ length: 150 }, (_, i) => makeEntry(i));
    await extractInterests(entries);

    // Verify the prompt only contains the first 100 entries
    const userMessage = mockedAsk.mock.calls[0]![1];
    expect(userMessage).toContain("Page 0");
    expect(userMessage).toContain("Page 99");
    expect(userMessage).not.toContain("Page 100");
  });

  it("includes history details in the prompt", async () => {
    mockedAsk.mockResolvedValue("[]");

    const entries = [
      {
        url: "https://typescript.org",
        title: "TypeScript Docs",
        visitTime: new Date(),
        visitCount: 5,
        domain: "typescript.org",
      },
    ];

    await extractInterests(entries);
    const userMessage = mockedAsk.mock.calls[0]![1];
    expect(userMessage).toContain("typescript.org");
    expect(userMessage).toContain("TypeScript Docs");
    expect(userMessage).toContain("visits: 5");
  });

  it("propagates API errors", async () => {
    mockedAsk.mockRejectedValue(new Error("API failed"));
    await expect(extractInterests([makeEntry(0)])).rejects.toThrow("API failed");
  });
});
