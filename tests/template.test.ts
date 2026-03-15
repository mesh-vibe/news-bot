import { describe, it, expect } from "vitest";
import { generateHtml } from "../src/digest/template.js";
import type { ScoredArticle, DigestMetadata } from "../src/types.js";

function makeArticle(overrides: Partial<ScoredArticle> = {}): ScoredArticle {
  return {
    title: "Test Article",
    url: "https://example.com/test",
    source: "Test Source",
    score: 0.8,
    summary: "A test article summary.",
    topics: ["Testing"],
    ...overrides,
  };
}

function makeMetadata(overrides: Partial<DigestMetadata> = {}): DigestMetadata {
  return {
    generatedAt: new Date("2026-03-12T10:00:00Z"),
    articleCount: 1,
    sourcesScanned: 5,
    topTopics: ["Testing"],
    ...overrides,
  };
}

describe("generateHtml", () => {
  it("contains DOCTYPE and basic structure", () => {
    const html = generateHtml([makeArticle()], makeMetadata());
    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain("<html lang=\"en\">");
    expect(html).toContain("</html>");
    expect(html).toContain("<main>");
    expect(html).toContain("</main>");
    expect(html).toContain("news-footer");
  });

  it("includes article cards with title, source, score", () => {
    const html = generateHtml(
      [makeArticle({ title: "My Article", source: "My Source", score: 0.85 })],
      makeMetadata()
    );
    expect(html).toContain("My Article");
    expect(html).toContain("My Source");
    expect(html).toContain("High 85%");
  });

  it("includes article summary and topics", () => {
    const html = generateHtml(
      [
        makeArticle({
          summary: "This is the summary.",
          topics: ["TypeScript", "Rust"],
        }),
      ],
      makeMetadata()
    );
    expect(html).toContain("This is the summary.");
    expect(html).toContain("TypeScript");
    expect(html).toContain("Rust");
  });

  it("includes metadata in header", () => {
    const html = generateHtml(
      [makeArticle()],
      makeMetadata({
        articleCount: 10,
        sourcesScanned: 5,
        topTopics: ["AI", "TypeScript"],
      })
    );
    expect(html).toContain("10 articles from 5 sources");
    expect(html).toContain("AI, TypeScript");
  });

  it("renders multiple articles", () => {
    const articles = [
      makeArticle({ title: "Article 1", url: "https://example.com/1" }),
      makeArticle({ title: "Article 2", url: "https://example.com/2" }),
      makeArticle({ title: "Article 3", url: "https://example.com/3" }),
    ];
    const html = generateHtml(articles, makeMetadata({ articleCount: 3 }));
    expect(html).toContain("Article 1");
    expect(html).toContain("Article 2");
    expect(html).toContain("Article 3");
  });

  it("handles empty article list", () => {
    const html = generateHtml([], makeMetadata({ articleCount: 0 }));
    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain("0 articles from");
  });
});

describe("escapeHtml (via generateHtml)", () => {
  it("escapes & < > \" in titles", () => {
    const html = generateHtml(
      [makeArticle({ title: 'Tom & Jerry <script>"alert"</script>' })],
      makeMetadata()
    );
    expect(html).toContain("Tom &amp; Jerry &lt;script&gt;&quot;alert&quot;&lt;/script&gt;");
    expect(html).not.toContain("<script>\"alert\"</script>");
  });

  it("escapes XSS payloads in titles", () => {
    const html = generateHtml(
      [makeArticle({ title: "<script>alert('xss')</script>" })],
      makeMetadata()
    );
    expect(html).not.toContain("<script>alert");
    expect(html).toContain("&lt;script&gt;");
  });

  it("escapes XSS payloads in descriptions/summaries", () => {
    const html = generateHtml(
      [makeArticle({ summary: '<img onerror=alert(1) src=x>' })],
      makeMetadata()
    );
    expect(html).not.toContain("<img onerror");
    expect(html).toContain("&lt;img onerror");
  });

  it("escapes HTML in URLs", () => {
    const html = generateHtml(
      [makeArticle({ url: 'https://example.com/q?a=1&b=2">' })],
      makeMetadata()
    );
    expect(html).toContain("a=1&amp;b=2&quot;&gt;");
  });

  it("escapes HTML in source names", () => {
    const html = generateHtml(
      [makeArticle({ source: "<b>Evil Source</b>" })],
      makeMetadata()
    );
    expect(html).toContain("&lt;b&gt;Evil Source&lt;/b&gt;");
    expect(html).not.toContain("<b>Evil Source</b>");
  });

  it("escapes HTML in topic tags", () => {
    const html = generateHtml(
      [makeArticle({ topics: ["<script>xss</script>"] })],
      makeMetadata()
    );
    expect(html).not.toContain("<script>xss</script>");
    expect(html).toContain("&lt;script&gt;xss&lt;/script&gt;");
  });

  it("escapes HTML in metadata topics", () => {
    const html = generateHtml(
      [makeArticle()],
      makeMetadata({ topTopics: ["<b>Bold Topic</b>"] })
    );
    expect(html).not.toContain("<b>Bold Topic</b>");
    expect(html).toContain("&lt;b&gt;Bold Topic&lt;/b&gt;");
  });
});

describe("scoreColor (via generateHtml)", () => {
  it("uses green for scores >= 0.8", () => {
    const html = generateHtml([makeArticle({ score: 0.85 })], makeMetadata());
    expect(html).toContain("var(--green)");
    expect(html).toContain("High 85%");
  });

  it("uses orange for scores >= 0.6", () => {
    const html = generateHtml([makeArticle({ score: 0.65 })], makeMetadata());
    expect(html).toContain("var(--orange)");
    expect(html).toContain("Medium 65%");
  });

  it("uses orange hex for scores >= 0.4", () => {
    const html = generateHtml([makeArticle({ score: 0.45 })], makeMetadata());
    expect(html).toContain("#f97316");
    expect(html).toContain("Low 45%");
  });

  it("uses muted for scores < 0.4", () => {
    const html = generateHtml([makeArticle({ score: 0.2 })], makeMetadata());
    expect(html).toContain("var(--text-muted)");
    expect(html).toContain("— 20%");
  });

  it("uses green at exactly 0.8", () => {
    const html = generateHtml([makeArticle({ score: 0.8 })], makeMetadata());
    expect(html).toContain("var(--green)");
    expect(html).toContain("High 80%");
  });

  it("uses orange at exactly 0.6", () => {
    const html = generateHtml([makeArticle({ score: 0.6 })], makeMetadata());
    expect(html).toContain("var(--orange)");
    expect(html).toContain("Medium 60%");
  });

  it("uses orange hex at exactly 0.4", () => {
    const html = generateHtml([makeArticle({ score: 0.4 })], makeMetadata());
    expect(html).toContain("#f97316");
    expect(html).toContain("Low 40%");
  });
});

describe("article card details", () => {
  it("includes published date when present", () => {
    const html = generateHtml(
      [makeArticle({ publishedAt: new Date("2026-03-10T10:00:00Z") })],
      makeMetadata()
    );
    expect(html).toContain("Mar 10");
  });

  it("omits date span when publishedAt is missing", () => {
    const html = generateHtml(
      [makeArticle({ publishedAt: undefined })],
      makeMetadata()
    );
    expect(html).not.toContain('class="news-date"');
  });

  it("renders article URL as link with noopener", () => {
    const html = generateHtml(
      [makeArticle({ url: "https://example.com/article" })],
      makeMetadata()
    );
    expect(html).toContain('href="https://example.com/article"');
    expect(html).toContain('rel="noopener"');
    expect(html).toContain('target="_blank"');
  });

  it("omits summary paragraph when summary is empty", () => {
    const html = generateHtml(
      [makeArticle({ summary: "" })],
      makeMetadata()
    );
    expect(html).not.toContain('class="news-summary"');
  });

  it("omits topics div when topics array is empty", () => {
    const html = generateHtml(
      [makeArticle({ topics: [] })],
      makeMetadata()
    );
    expect(html).not.toContain('class="news-topics"');
  });
});
