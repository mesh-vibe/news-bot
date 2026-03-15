import { describe, it, expect, vi, beforeEach } from "vitest";
import { readFileSync, writeFileSync, mkdirSync, renameSync } from "node:fs";
import { loadSeen, saveSeen, pruneSeen } from "../src/state/seen.js";

vi.mock("node:fs", async () => {
  const actual = await vi.importActual<typeof import("node:fs")>("node:fs");
  return {
    ...actual,
    readFileSync: vi.fn(),
    writeFileSync: vi.fn(),
    mkdirSync: vi.fn(),
    renameSync: vi.fn(),
  };
});

const mockedReadFileSync = vi.mocked(readFileSync);
const mockedWriteFileSync = vi.mocked(writeFileSync);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("loadSeen", () => {
  it("returns empty set when file is missing", () => {
    mockedReadFileSync.mockImplementation(() => {
      throw new Error("ENOENT");
    });
    const seen = loadSeen();
    expect(seen.size).toBe(0);
  });

  it("loads URLs from valid seen.json", () => {
    mockedReadFileSync.mockReturnValue(
      JSON.stringify({
        entries: [
          { url: "https://example.com/a", seenAt: "2026-03-10T00:00:00Z" },
          { url: "https://example.com/b", seenAt: "2026-03-11T00:00:00Z" },
        ],
      })
    );
    const seen = loadSeen();
    expect(seen.size).toBe(2);
    expect(seen.has("https://example.com/a")).toBe(true);
    expect(seen.has("https://example.com/b")).toBe(true);
  });

  it("returns empty set for malformed JSON", () => {
    mockedReadFileSync.mockReturnValue("not valid json {{{");
    const seen = loadSeen();
    expect(seen.size).toBe(0);
  });

  it("returns empty set for empty file", () => {
    mockedReadFileSync.mockReturnValue("");
    const seen = loadSeen();
    expect(seen.size).toBe(0);
  });
});

describe("saveSeen", () => {
  it("merges new URLs with existing entries preserving timestamps", () => {
    const existingStore = {
      entries: [
        { url: "https://example.com/old", seenAt: "2026-03-01T00:00:00Z" },
      ],
    };
    mockedReadFileSync.mockReturnValue(JSON.stringify(existingStore));

    const urls = new Set(["https://example.com/old", "https://example.com/new"]);
    saveSeen(urls);

    expect(mockedWriteFileSync).toHaveBeenCalled();
    const written = JSON.parse(mockedWriteFileSync.mock.calls[0]![1] as string);
    const urlMap = new Map(
      written.entries.map((e: { url: string; seenAt: string }) => [
        e.url,
        e.seenAt,
      ])
    );
    // Existing URL keeps original timestamp
    expect(urlMap.get("https://example.com/old")).toBe("2026-03-01T00:00:00Z");
    // New URL gets a current timestamp
    expect(urlMap.has("https://example.com/new")).toBe(true);
  });

  it("starts fresh when file is missing", () => {
    mockedReadFileSync.mockImplementation(() => {
      throw new Error("ENOENT");
    });

    const urls = new Set(["https://example.com/first"]);
    saveSeen(urls);

    expect(mockedWriteFileSync).toHaveBeenCalled();
    const written = JSON.parse(mockedWriteFileSync.mock.calls[0]![1] as string);
    expect(written.entries).toHaveLength(1);
    expect(written.entries[0].url).toBe("https://example.com/first");
  });
});

describe("pruneSeen", () => {
  it("removes entries older than 90 days", () => {
    const oldDate = new Date();
    oldDate.setDate(oldDate.getDate() - 100);
    const recentDate = new Date();
    recentDate.setDate(recentDate.getDate() - 10);

    const store = {
      entries: [
        { url: "https://example.com/old", seenAt: oldDate.toISOString() },
        { url: "https://example.com/recent", seenAt: recentDate.toISOString() },
      ],
    };
    mockedReadFileSync.mockReturnValue(JSON.stringify(store));

    const removed = pruneSeen();

    expect(removed).toBe(1);
    expect(mockedWriteFileSync).toHaveBeenCalled();
    const written = JSON.parse(mockedWriteFileSync.mock.calls[0]![1] as string);
    expect(written.entries).toHaveLength(1);
    expect(written.entries[0].url).toBe("https://example.com/recent");
  });

  it("keeps all recent entries", () => {
    const recent = new Date();
    recent.setDate(recent.getDate() - 5);

    const store = {
      entries: [
        { url: "https://example.com/a", seenAt: recent.toISOString() },
        { url: "https://example.com/b", seenAt: recent.toISOString() },
      ],
    };
    mockedReadFileSync.mockReturnValue(JSON.stringify(store));

    const removed = pruneSeen();
    expect(removed).toBe(0);
  });

  it("returns 0 when file is missing", () => {
    mockedReadFileSync.mockImplementation(() => {
      throw new Error("ENOENT");
    });
    const removed = pruneSeen();
    expect(removed).toBe(0);
  });

  it("returns 0 for malformed JSON", () => {
    mockedReadFileSync.mockReturnValue("not json");
    const removed = pruneSeen();
    expect(removed).toBe(0);
  });
});
