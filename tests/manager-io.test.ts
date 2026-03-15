import { describe, it, expect, vi, beforeEach } from "vitest";
import { readFileSync, writeFileSync, mkdirSync, renameSync } from "node:fs";

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

const {
  loadSources,
  saveSources,
  addSource,
  defaultSourcesContent,
} = await import("../src/sources/manager.js");

beforeEach(() => {
  vi.clearAllMocks();
});

describe("loadSources", () => {
  it("parses file content when file exists", () => {
    mockedReadFileSync.mockReturnValue(`# News Sources

## RSS Feeds
- https://example.com/feed

## News Sites (scraped via headlines)
- reuters.com

## Auto-Discovered
`);
    const sources = loadSources();
    expect(sources.rssFeeds).toHaveLength(1);
    expect(sources.rssFeeds[0]!.url).toBe("https://example.com/feed");
    expect(sources.newsSites).toHaveLength(1);
  });

  it("returns empty lists when file is missing", () => {
    mockedReadFileSync.mockImplementation(() => {
      throw new Error("ENOENT");
    });
    const sources = loadSources();
    expect(sources.rssFeeds).toHaveLength(0);
    expect(sources.newsSites).toHaveLength(0);
    expect(sources.autoDiscovered).toHaveLength(0);
  });
});

describe("saveSources", () => {
  it("writes formatted sources via atomicWrite", () => {
    saveSources({
      rssFeeds: [{ url: "https://example.com/feed" }],
      newsSites: ["reuters.com"],
      autoDiscovered: [],
    });
    expect(mockedWriteFileSync).toHaveBeenCalled();
    const content = mockedWriteFileSync.mock.calls[0]![1] as string;
    expect(content).toContain("https://example.com/feed");
    expect(content).toContain("reuters.com");
  });
});

describe("addSource", () => {
  it("adds a new source to the list", () => {
    mockedReadFileSync.mockReturnValue(`# News Sources

## RSS Feeds
- https://existing.com/feed

## News Sites (scraped via headlines)

## Auto-Discovered
`);
    addSource("https://new.com/feed");
    expect(mockedWriteFileSync).toHaveBeenCalled();
    const content = mockedWriteFileSync.mock.calls[0]![1] as string;
    expect(content).toContain("https://new.com/feed");
    expect(content).toContain("https://existing.com/feed");
  });

  it("is a no-op when URL already exists in rssFeeds", () => {
    mockedReadFileSync.mockReturnValue(`# News Sources

## RSS Feeds
- https://existing.com/feed

## News Sites (scraped via headlines)

## Auto-Discovered
`);
    addSource("https://existing.com/feed");
    // Should not write (no-op)
    expect(mockedWriteFileSync).not.toHaveBeenCalled();
  });

  it("is a no-op when URL already exists in autoDiscovered", () => {
    mockedReadFileSync.mockReturnValue(`# News Sources

## RSS Feeds

## News Sites (scraped via headlines)

## Auto-Discovered
- https://auto.com/feed (added 2026-01-01, from browser history)
`);
    addSource("https://auto.com/feed");
    expect(mockedWriteFileSync).not.toHaveBeenCalled();
  });
});

describe("defaultSourcesContent", () => {
  it("returns markdown with default RSS feeds", () => {
    const content = defaultSourcesContent();
    expect(content).toContain("# News Sources");
    expect(content).toContain("## RSS Feeds");
    expect(content).toContain("https://feeds.arstechnica.com");
    expect(content).toContain("https://hnrss.org/frontpage");
    expect(content).toContain("## Auto-Discovered");
  });

  it("is parseable by parseSources", async () => {
    const { parseSources } = await import("../src/sources/manager.js");
    const content = defaultSourcesContent();
    const parsed = parseSources(content);
    expect(parsed.rssFeeds.length).toBeGreaterThan(0);
    expect(parsed.newsSites.length).toBeGreaterThan(0);
  });
});
