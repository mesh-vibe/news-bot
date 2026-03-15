import { learn } from "./learn.js";
import { discover } from "./discover.js";
import { curate } from "./curate.js";
import { pruneSeen } from "../state/seen.js";
import { loadSources } from "../sources/manager.js";
import { log, logHeader } from "../util.js";
import { emitEvent } from "../events.js";

export async function scan(): Promise<void> {
  logHeader("Running full newsbot scan...");
  const start = Date.now();

  emitEvent("news-bot.started");

  try {
    await learn();
    const articles = await discover();
    await curate(articles);

    const pruned = pruneSeen();
    if (pruned > 0) {
      log(`Pruned ${pruned} old entries from seen list.`);
    }

    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    log(`\nScan complete in ${elapsed}s.`);

    const sources = loadSources();
    const sourcesProcessed = sources.rssFeeds.length + sources.autoDiscovered.length;
    emitEvent("news-bot.completed", {
      articleCount: articles.length,
      sourcesProcessed,
      elapsedSeconds: parseFloat(elapsed),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    emitEvent("news-bot.failed", { error: message });
    throw err;
  }
}
