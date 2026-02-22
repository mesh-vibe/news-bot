import { readFileSync, copyFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { ARTICLES_PATH, DIGEST_PATH, HISTORY_DIR } from "../constants.js";
import { renderDigest } from "../digest/render.js";
import { enhanceSummaries } from "../ai/summarizer.js";
import { loadSources } from "../sources/manager.js";
import { log, logHeader, atomicWrite, formatDate } from "../util.js";
import type { ScoredArticle } from "../types.js";

export async function curate(articles?: ScoredArticle[]): Promise<void> {
  logHeader("Generating digest...");

  if (!articles) {
    try {
      const raw = readFileSync(ARTICLES_PATH, "utf-8");
      articles = JSON.parse(raw) as ScoredArticle[];
    } catch {
      log("No articles found. Run 'newsbot discover' first.");
      return;
    }
  }

  if (articles.length === 0) {
    log("No articles to include in digest.");
    return;
  }

  log(`Enhancing summaries for ${articles.length} articles...`);
  const enhanced = await enhanceSummaries(articles);

  const sources = loadSources();
  const sourcesScanned = sources.rssFeeds.length + sources.autoDiscovered.length;

  const topics = new Set<string>();
  for (const a of enhanced) {
    for (const t of a.topics) {
      topics.add(t);
    }
  }

  const html = renderDigest(enhanced, {
    generatedAt: new Date(),
    articleCount: enhanced.length,
    sourcesScanned,
    topTopics: Array.from(topics).slice(0, 8),
  });

  // Archive previous digest
  if (existsSync(DIGEST_PATH)) {
    const today = formatDate(new Date());
    const archivePath = join(HISTORY_DIR, `${today}.html`);
    if (!existsSync(archivePath)) {
      try {
        copyFileSync(DIGEST_PATH, archivePath);
      } catch {
        // best effort
      }
    }
  }

  atomicWrite(DIGEST_PATH, html);
  log(`Digest written to ${DIGEST_PATH}`);
  log(`${enhanced.length} articles across ${topics.size} topics.`);
}
