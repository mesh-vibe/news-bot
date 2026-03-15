import { describe, it, expect, vi, beforeEach } from "vitest";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import type { Article, RssSource } from "../src/types.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixturesDir = join(__dirname, "__fixtures__", "rss");

// Mock rss-parser before importing the module under test
vi.mock("rss-parser", () => {
  const MockParser = vi.fn();
  MockParser.prototype.parseURL = vi.fn();
  return { default: MockParser };
});

// Now import the module under test (uses the mocked rss-parser)
const { fetchFeed, fetchAllFeeds } = await import("../src/sources/rss.js");
const RssParser = (await import("rss-parser")).default;

beforeEach(() => {
  vi.clearAllMocks();
});

function mockParseURL(result: unknown) {
  (RssParser.prototype.parseURL as ReturnType<typeof vi.fn>).mockResolvedValue(result);
}

function mockParseURLError(error: Error) {
  (RssParser.prototype.parseURL as ReturnType<typeof vi.fn>).mockRejectedValue(error);
}

const testSource: RssSource = {
  url: "https://example.com/feed",
  name: "Example Feed",
};

describe("fetchFeed", () => {
  it("maps feed items to Article objects", async () => {
    mockParseURL({
      title: "Test Feed",
      items: [
        {
          title: "Article 1",
          link: "https://example.com/article-1",
          pubDate: "Mon, 10 Mar 2026 10:00:00 GMT",
          contentSnippet: "A snippet of the first article.",
        },
        {
          title: "Article 2",
          link: "https://example.com/article-2",
          pubDate: "Sun, 09 Mar 2026 14:30:00 GMT",
          content: "Full content of article 2.",
        },
      ],
    });

    const articles = await fetchFeed(testSource);
    expect(articles).toHaveLength(2);

    expect(articles[0]!.title).toBe("Article 1");
    expect(articles[0]!.url).toBe("https://example.com/article-1");
    expect(articles[0]!.source).toBe("Test Feed");
    expect(articles[0]!.publishedAt).toBeInstanceOf(Date);
    expect(articles[0]!.description).toBe("A snippet of the first article.");

    expect(articles[1]!.description).toBe("Full content of article 2.");
  });

  it("skips items without title", async () => {
    mockParseURL({
      title: "Test Feed",
      items: [
        { link: "https://example.com/no-title" },
        { title: "Has Title", link: "https://example.com/has-title" },
      ],
    });

    const articles = await fetchFeed(testSource);
    expect(articles).toHaveLength(1);
    expect(articles[0]!.title).toBe("Has Title");
  });

  it("skips items without link", async () => {
    mockParseURL({
      title: "Test Feed",
      items: [
        { title: "No Link" },
        { title: "Has Link", link: "https://example.com/has-link" },
      ],
    });

    const articles = await fetchFeed(testSource);
    expect(articles).toHaveLength(1);
    expect(articles[0]!.title).toBe("Has Link");
  });

  it("uses feed.title for source name, falls back to source.name then domain", async () => {
    // Feed with title
    mockParseURL({
      title: "Feed Title",
      items: [{ title: "A", link: "https://example.com/a" }],
    });
    let articles = await fetchFeed(testSource);
    expect(articles[0]!.source).toBe("Feed Title");

    // Feed without title, source has name
    mockParseURL({
      items: [{ title: "B", link: "https://example.com/b" }],
    });
    articles = await fetchFeed(testSource);
    expect(articles[0]!.source).toBe("Example Feed");

    // Feed without title, source without name
    mockParseURL({
      items: [{ title: "C", link: "https://example.com/c" }],
    });
    articles = await fetchFeed({ url: "https://blog.example.com/rss" });
    expect(articles[0]!.source).toBe("blog.example.com");
  });

  it("sets publishedAt to undefined when pubDate is missing", async () => {
    mockParseURL({
      title: "Test",
      items: [{ title: "No Date", link: "https://example.com/nodate" }],
    });

    const articles = await fetchFeed(testSource);
    expect(articles[0]!.publishedAt).toBeUndefined();
  });

  it("uses contentSnippet over content for description", async () => {
    mockParseURL({
      title: "Test",
      items: [
        {
          title: "Both",
          link: "https://example.com/both",
          contentSnippet: "Snippet",
          content: "Full",
        },
      ],
    });

    const articles = await fetchFeed(testSource);
    expect(articles[0]!.description).toBe("Snippet");
  });

  it("falls back to empty string when no description available", async () => {
    mockParseURL({
      title: "Test",
      items: [{ title: "No Desc", link: "https://example.com/nodesc" }],
    });

    const articles = await fetchFeed(testSource);
    expect(articles[0]!.description).toBe("");
  });

  it("returns empty array on network error", async () => {
    mockParseURLError(new Error("Network timeout"));
    const articles = await fetchFeed(testSource);
    expect(articles).toHaveLength(0);
  });

  it("returns empty array for feed with no items", async () => {
    mockParseURL({ title: "Empty", items: [] });
    const articles = await fetchFeed(testSource);
    expect(articles).toHaveLength(0);
  });
});

describe("fetchAllFeeds", () => {
  it("collects articles from multiple feeds", async () => {
    const parseURL = RssParser.prototype.parseURL as ReturnType<typeof vi.fn>;
    parseURL
      .mockResolvedValueOnce({
        title: "Feed 1",
        items: [{ title: "A1", link: "https://e.com/a1" }],
      })
      .mockResolvedValueOnce({
        title: "Feed 2",
        items: [
          { title: "A2", link: "https://e.com/a2" },
          { title: "A3", link: "https://e.com/a3" },
        ],
      });

    const sources = [
      { url: "https://feed1.com/rss" },
      { url: "https://feed2.com/rss" },
    ];
    const articles = await fetchAllFeeds(sources);
    expect(articles).toHaveLength(3);
  });

  it("ignores failed feeds and returns articles from successful ones", async () => {
    const parseURL = RssParser.prototype.parseURL as ReturnType<typeof vi.fn>;
    parseURL
      .mockResolvedValueOnce({
        title: "Good Feed",
        items: [{ title: "Good", link: "https://e.com/good" }],
      })
      .mockRejectedValueOnce(new Error("Bad feed"));

    const sources = [
      { url: "https://good.com/rss" },
      { url: "https://bad.com/rss" },
    ];
    const articles = await fetchAllFeeds(sources);
    expect(articles).toHaveLength(1);
    expect(articles[0]!.title).toBe("Good");
  });

  it("returns empty array when all feeds fail", async () => {
    mockParseURLError(new Error("All broken"));
    const sources = [
      { url: "https://a.com/rss" },
      { url: "https://b.com/rss" },
    ];
    const articles = await fetchAllFeeds(sources);
    expect(articles).toHaveLength(0);
  });

  it("returns empty array for empty sources list", async () => {
    const articles = await fetchAllFeeds([]);
    expect(articles).toHaveLength(0);
  });
});

describe("RSS fixtures", () => {
  const requiredFixtures = [
    "valid-feed.xml",
    "atom-feed.xml",
    "malformed.xml",
    "empty-feed.xml",
    "injection-feed.xml",
    "missing-fields.xml",
  ];

  for (const fixture of requiredFixtures) {
    it(`fixture ${fixture} exists and is readable`, () => {
      const content = readFileSync(join(fixturesDir, fixture), "utf-8");
      expect(content.length).toBeGreaterThan(0);
    });
  }

  it("valid-feed.xml contains RSS items", () => {
    const content = readFileSync(join(fixturesDir, "valid-feed.xml"), "utf-8");
    expect(content).toContain("<item>");
    expect(content).toContain("<title>");
    expect(content).toContain("<link>");
  });

  it("atom-feed.xml contains Atom entries", () => {
    const content = readFileSync(join(fixturesDir, "atom-feed.xml"), "utf-8");
    expect(content).toContain("<feed");
    expect(content).toContain("<entry>");
    expect(content).toContain("Atom");
  });

  it("injection-feed.xml contains XSS payloads for testing", () => {
    const content = readFileSync(join(fixturesDir, "injection-feed.xml"), "utf-8");
    expect(content).toContain("script");
    expect(content).toContain("onerror");
  });

  it("empty-feed.xml has no items", () => {
    const content = readFileSync(join(fixturesDir, "empty-feed.xml"), "utf-8");
    expect(content).not.toContain("<item>");
  });

  it("malformed.xml has structural issues", () => {
    const content = readFileSync(join(fixturesDir, "malformed.xml"), "utf-8");
    expect(content).toContain("Malformed");
  });
});
