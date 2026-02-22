import RssParser from "rss-parser";
import type { Article, RssSource } from "../types.js";
import { extractDomain, log } from "../util.js";

const parser = new RssParser({
  timeout: 15000,
  headers: {
    "User-Agent": "Newsbot/1.0",
  },
});

export async function fetchFeed(source: RssSource): Promise<Article[]> {
  try {
    const feed = await parser.parseURL(source.url);
    const feedName = feed.title || source.name || extractDomain(source.url);
    const articles: Article[] = [];

    for (const item of feed.items) {
      if (!item.title || !item.link) continue;
      articles.push({
        title: item.title,
        url: item.link,
        source: feedName,
        publishedAt: item.pubDate ? new Date(item.pubDate) : undefined,
        description: item.contentSnippet || item.content || "",
      });
    }
    return articles;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log(`Failed to fetch ${source.url}: ${msg}`);
    return [];
  }
}

export async function fetchAllFeeds(sources: RssSource[]): Promise<Article[]> {
  const results = await Promise.allSettled(sources.map((s) => fetchFeed(s)));
  const articles: Article[] = [];
  for (const result of results) {
    if (result.status === "fulfilled") {
      articles.push(...result.value);
    }
  }
  return articles;
}
