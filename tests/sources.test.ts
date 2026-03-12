import { describe, it, expect } from "vitest";
import {
  parseSources,
  formatSources,
} from "../src/sources/manager.js";
import type { SourceList } from "../src/types.js";

describe("parseSources", () => {
  it("parses a full markdown document with all sections", () => {
    const markdown = `# News Sources

## RSS Feeds
- https://feeds.arstechnica.com/arstechnica/index
- https://hnrss.org/frontpage

## News Sites (scraped via headlines)
- reuters.com
- bbc.com/news

## Auto-Discovered
- https://example.com/feed (added 2024-01-15, from browser history)
`;

    const sources = parseSources(markdown);
    expect(sources.rssFeeds).toHaveLength(2);
    expect(sources.rssFeeds[0]!.url).toBe(
      "https://feeds.arstechnica.com/arstechnica/index",
    );
    expect(sources.rssFeeds[1]!.url).toBe("https://hnrss.org/frontpage");

    expect(sources.newsSites).toHaveLength(2);
    expect(sources.newsSites[0]).toBe("reuters.com");
    expect(sources.newsSites[1]).toBe("bbc.com/news");

    expect(sources.autoDiscovered).toHaveLength(1);
    expect(sources.autoDiscovered[0]!.url).toBe("https://example.com/feed");
    expect(sources.autoDiscovered[0]!.addedDate).toBe("2024-01-15");
    expect(sources.autoDiscovered[0]!.autoDiscovered).toBe(true);
  });

  it("returns empty lists for empty input", () => {
    const sources = parseSources("");
    expect(sources).toEqual({
      rssFeeds: [],
      newsSites: [],
      autoDiscovered: [],
    });
  });

  it("handles RSS feeds without metadata", () => {
    const markdown = `## RSS Feeds
- https://example.com/rss
`;
    const sources = parseSources(markdown);
    expect(sources.rssFeeds).toHaveLength(1);
    expect(sources.rssFeeds[0]!.url).toBe("https://example.com/rss");
    expect(sources.rssFeeds[0]!.addedDate).toBeUndefined();
    expect(sources.rssFeeds[0]!.autoDiscovered).toBeUndefined();
  });

  it("marks auto-discovered feeds", () => {
    const markdown = `## Auto-Discovered
- https://blog.example.com/feed
`;
    const sources = parseSources(markdown);
    expect(sources.autoDiscovered).toHaveLength(1);
    expect(sources.autoDiscovered[0]!.autoDiscovered).toBe(true);
  });

  it("ignores unknown sections", () => {
    const markdown = `## Custom Section
- something

## RSS Feeds
- https://example.com/rss
`;
    const sources = parseSources(markdown);
    expect(sources.rssFeeds).toHaveLength(1);
    expect(sources.newsSites).toHaveLength(0);
    expect(sources.autoDiscovered).toHaveLength(0);
  });
});

describe("formatSources", () => {
  it("formats a source list to markdown", () => {
    const sources: SourceList = {
      rssFeeds: [{ url: "https://example.com/rss" }],
      newsSites: ["reuters.com"],
      autoDiscovered: [
        {
          url: "https://blog.example.com/feed",
          addedDate: "2024-01-15",
          autoDiscovered: true,
        },
      ],
    };

    const output = formatSources(sources);
    expect(output).toContain("# News Sources");
    expect(output).toContain("## RSS Feeds");
    expect(output).toContain("- https://example.com/rss");
    expect(output).toContain("## News Sites (scraped via headlines)");
    expect(output).toContain("- reuters.com");
    expect(output).toContain("## Auto-Discovered");
    expect(output).toContain(
      "- https://blog.example.com/feed (added 2024-01-15, from browser history)",
    );
  });

  it("includes section headers even when lists are empty", () => {
    const sources: SourceList = {
      rssFeeds: [],
      newsSites: [],
      autoDiscovered: [],
    };
    const output = formatSources(sources);
    expect(output).toContain("## RSS Feeds");
    expect(output).toContain("## News Sites");
    expect(output).toContain("## Auto-Discovered");
  });

  it("omits metadata for auto-discovered feeds without addedDate", () => {
    const sources: SourceList = {
      rssFeeds: [],
      newsSites: [],
      autoDiscovered: [{ url: "https://example.com/feed" }],
    };
    const output = formatSources(sources);
    expect(output).toContain("- https://example.com/feed");
    expect(output).not.toContain("(added");
  });
});

describe("roundtrip: format -> parse", () => {
  it("preserves structure through format then parse", () => {
    const original: SourceList = {
      rssFeeds: [
        { url: "https://feeds.arstechnica.com/arstechnica/index" },
        { url: "https://hnrss.org/frontpage" },
      ],
      newsSites: ["reuters.com", "apnews.com"],
      autoDiscovered: [
        {
          url: "https://blog.example.com/feed",
          addedDate: "2024-01-15",
          autoDiscovered: true,
        },
      ],
    };

    const markdown = formatSources(original);
    const parsed = parseSources(markdown);

    expect(parsed.rssFeeds).toHaveLength(2);
    expect(parsed.rssFeeds[0]!.url).toBe(original.rssFeeds[0]!.url);
    expect(parsed.rssFeeds[1]!.url).toBe(original.rssFeeds[1]!.url);

    expect(parsed.newsSites).toHaveLength(2);
    expect(parsed.newsSites[0]).toBe("reuters.com");
    expect(parsed.newsSites[1]).toBe("apnews.com");

    expect(parsed.autoDiscovered).toHaveLength(1);
    expect(parsed.autoDiscovered[0]!.url).toBe(
      "https://blog.example.com/feed",
    );
    expect(parsed.autoDiscovered[0]!.addedDate).toBe("2024-01-15");
    expect(parsed.autoDiscovered[0]!.autoDiscovered).toBe(true);
  });

  it("roundtrips empty source list", () => {
    const original: SourceList = {
      rssFeeds: [],
      newsSites: [],
      autoDiscovered: [],
    };

    const markdown = formatSources(original);
    const parsed = parseSources(markdown);

    expect(parsed.rssFeeds).toHaveLength(0);
    expect(parsed.newsSites).toHaveLength(0);
    expect(parsed.autoDiscovered).toHaveLength(0);
  });
});
