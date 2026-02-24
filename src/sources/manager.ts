import { readFileSync } from "node:fs";
import { SOURCES_PATH } from "../constants.js";
import { atomicWrite, formatDate } from "../util.js";
import type { RssSource, SourceList } from "../types.js";

export function loadSources(): SourceList {
  let raw: string;
  try {
    raw = readFileSync(SOURCES_PATH, "utf-8");
  } catch {
    return { rssFeeds: [], newsSites: [], autoDiscovered: [] };
  }
  return parseSources(raw);
}

export function parseSources(raw: string): SourceList {
  const sources: SourceList = { rssFeeds: [], newsSites: [], autoDiscovered: [] };
  let currentSection: "rss" | "news" | "auto" | null = null;

  for (const line of raw.split("\n")) {
    const sectionMatch = line.match(/^##\s+(.+)/);
    if (sectionMatch) {
      const heading = sectionMatch[1]!.toLowerCase();
      if (heading.includes("rss")) currentSection = "rss";
      else if (heading.includes("news")) currentSection = "news";
      else if (heading.includes("auto")) currentSection = "auto";
      else currentSection = null;
      continue;
    }

    const itemMatch = line.match(/^-\s+(.+)$/);
    if (!itemMatch || !currentSection) continue;

    const content = itemMatch[1]!.trim();

    if (currentSection === "news") {
      sources.newsSites.push(content);
      continue;
    }

    const urlMatch = content.match(/^(https?:\/\/\S+)(?:\s+\((.+)\))?$/);
    if (!urlMatch) continue;

    const source: RssSource = { url: urlMatch[1]! };
    if (urlMatch[2]) {
      const metaMatch = urlMatch[2].match(/added\s+([\d-]+)/);
      if (metaMatch) source.addedDate = metaMatch[1];
      if (urlMatch[2].includes("browser history") || urlMatch[2].includes("auto")) {
        source.autoDiscovered = true;
      }
    }

    if (currentSection === "auto") {
      source.autoDiscovered = true;
      sources.autoDiscovered.push(source);
    } else {
      sources.rssFeeds.push(source);
    }
  }

  return sources;
}

export function saveSources(sources: SourceList): void {
  atomicWrite(SOURCES_PATH, formatSources(sources));
}

export function formatSources(sources: SourceList): string {
  const lines: string[] = ["# News Sources", ""];

  lines.push("## RSS Feeds");
  for (const s of sources.rssFeeds) {
    lines.push(`- ${s.url}`);
  }
  lines.push("");

  lines.push("## News Sites (scraped via headlines)");
  for (const s of sources.newsSites) {
    lines.push(`- ${s}`);
  }
  lines.push("");

  lines.push("## Auto-Discovered");
  for (const s of sources.autoDiscovered) {
    const meta = s.addedDate ? ` (added ${s.addedDate}, from browser history)` : "";
    lines.push(`- ${s.url}${meta}`);
  }
  lines.push("");

  return lines.join("\n");
}

export function addSource(url: string): void {
  const sources = loadSources();
  const allUrls = [...sources.rssFeeds, ...sources.autoDiscovered].map((s) => s.url);
  if (allUrls.includes(url)) return;

  sources.rssFeeds.push({ url, addedDate: formatDate(new Date()) });
  saveSources(sources);
}

export function defaultSourcesContent(): string {
  return `# News Sources

## RSS Feeds
- https://feeds.arstechnica.com/arstechnica/index
- https://hnrss.org/frontpage
- https://www.theverge.com/rss/index.xml
- https://techcrunch.com/feed/
- https://rss.slashdot.org/Slashdot/slashdotMain
- https://lobste.rs/rss

## News Sites (scraped via headlines)
- reuters.com
- apnews.com
- bbc.com/news

## Auto-Discovered
`;
}
