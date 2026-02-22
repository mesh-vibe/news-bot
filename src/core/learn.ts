import { readBrowserHistory } from "../browser/history.js";
import { extractInterests } from "../ai/interests.js";
import { loadInterests, saveInterests, mergeInterests } from "../state/interests.js";
import { loadConfig } from "../state/config.js";
import { log, logHeader } from "../util.js";

export async function learn(): Promise<void> {
  logHeader("Learning from browser history...");

  const config = loadConfig();
  const entries = readBrowserHistory(config.historyDays);

  if (entries.length === 0) {
    log("No browser history found. Make sure Chrome or Brave is installed.");
    return;
  }

  log(`Found ${entries.length} history entries from the last ${config.historyDays} days.`);

  const domainCounts = new Map<string, number>();
  for (const e of entries) {
    domainCounts.set(e.domain, (domainCounts.get(e.domain) || 0) + 1);
  }
  const topDomains = Array.from(domainCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  log("Top domains:");
  for (const [domain, count] of topDomains) {
    log(`  ${domain}: ${count} visits`);
  }

  log("Extracting interests via Claude...");
  const newInterests = await extractInterests(entries);

  if (newInterests.length === 0) {
    log("Could not extract interests. Check your ANTHROPIC_API_KEY.");
    return;
  }

  log(`Extracted ${newInterests.length} interests.`);

  const existing = loadInterests();
  const merged = mergeInterests(existing, newInterests);
  saveInterests(merged);

  log(`Updated interests: ${merged.high.length} high, ${merged.moderate.length} moderate.`);
}
