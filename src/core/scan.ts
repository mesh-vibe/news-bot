import { learn } from "./learn.js";
import { discover } from "./discover.js";
import { curate } from "./curate.js";
import { pruneSeen } from "../state/seen.js";
import { log, logHeader } from "../util.js";

export async function scan(): Promise<void> {
  logHeader("Running full newsbot scan...");
  const start = Date.now();

  await learn();
  const articles = await discover();
  await curate(articles);

  const pruned = pruneSeen();
  if (pruned > 0) {
    log(`Pruned ${pruned} old entries from seen list.`);
  }

  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  log(`\nScan complete in ${elapsed}s.`);
}
