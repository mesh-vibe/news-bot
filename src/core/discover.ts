import { fetchAllFeeds } from "../sources/rss.js";
import { scoreArticles } from "../ai/scorer.js";
import { loadSources } from "../sources/manager.js";
import { loadInterests } from "../state/interests.js";
import { loadSeen, saveSeen } from "../state/seen.js";
import { loadConfig } from "../state/config.js";
import { ARTICLES_PATH } from "../constants.js";
import { log, logHeader, atomicWrite, truncate } from "../util.js";
import type { ScoredArticle } from "../types.js";

export async function discover(): Promise<ScoredArticle[]> {
  logHeader("Discovering articles...");

  const sources = loadSources();
  const allFeeds = [...sources.rssFeeds, ...sources.autoDiscovered];

  if (allFeeds.length === 0) {
    log("No RSS feeds configured. Run 'newsbot add-source <url>' to add one.");
    return [];
  }

  log(`Fetching ${allFeeds.length} feeds...`);
  const articles = await fetchAllFeeds(allFeeds);
  log(`Found ${articles.length} articles.`);

  if (articles.length === 0) return [];

  const seen = loadSeen();
  const fresh = articles.filter((a) => !seen.has(a.url));
  log(`${fresh.length} new articles (${articles.length - fresh.length} already seen).`);

  if (fresh.length === 0) return [];

  const profile = loadInterests();
  const hasInterests = profile.high.length > 0 || profile.moderate.length > 0 || profile.pinned.length > 0;

  let scored: ScoredArticle[];
  if (hasInterests) {
    log("Scoring articles against your interests...");
    scored = await scoreArticles(fresh, profile);
  } else {
    log("No interests found — showing all articles unscored. Run 'newsbot learn' first.");
    scored = fresh.map((a) => ({ ...a, score: 0.5, summary: a.description || "", topics: [] }));
  }

  const config = loadConfig();
  const filtered = scored.filter((a) => a.score >= config.minScore);
  const top = filtered.slice(0, config.maxArticles);

  log(`${top.length} articles above score threshold (${config.minScore}).`);

  // Mark all fetched articles as seen
  const newSeen = new Set(seen);
  for (const a of articles) {
    newSeen.add(a.url);
  }
  saveSeen(newSeen);

  // Save articles for digest command
  atomicWrite(ARTICLES_PATH, JSON.stringify(top, null, 2));

  if (top.length > 0) {
    log("\nTop articles:");
    for (const a of top.slice(0, 10)) {
      log(`  [${a.score.toFixed(2)}] ${truncate(a.title, 70)}`);
      log(`         ${a.source}`);
    }
  }

  return top;
}
