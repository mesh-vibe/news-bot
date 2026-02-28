import { initNewsbot } from "../state/init.js";
import { loadInterests, formatInterests } from "../state/interests.js";
import { loadSources, addSource } from "../sources/manager.js";
import { NEWSBOT_DIR, DIGEST_PATH, HISTORY_DIR, ARTICLES_PATH, SEEN_PATH } from "../constants.js";
import { log, logHeader, logError } from "../util.js";
import { NewsbotError } from "../types.js";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";

async function handleError(fn: () => Promise<void>): Promise<void> {
  try {
    await fn();
  } catch (err) {
    if (err instanceof NewsbotError) {
      logError(err.message, err.hint);
    } else if (err instanceof Error) {
      logError(err.message);
    } else {
      logError(String(err));
    }
    process.exit(1);
  }
}

export async function cmdInit(): Promise<void> {
  initNewsbot();
}

export async function cmdLearn(): Promise<void> {
  await handleError(async () => {
    const { learn } = await import("../core/learn.js");
    await learn();
  });
}

export async function cmdDiscover(): Promise<void> {
  await handleError(async () => {
    const { discover } = await import("../core/discover.js");
    await discover();
  });
}

export async function cmdDigest(): Promise<void> {
  await handleError(async () => {
    const { curate } = await import("../core/curate.js");
    await curate();
  });
}

export async function cmdScan(): Promise<void> {
  await handleError(async () => {
    const { scan } = await import("../core/scan.js");
    await scan();
  });
}

export async function cmdInterests(): Promise<void> {
  const profile = loadInterests();
  const hasAny = profile.high.length || profile.moderate.length || profile.pinned.length || profile.blocked.length;
  if (!hasAny) {
    log("No interests found. Run 'newsbot learn' to build your interest profile.");
    return;
  }
  console.log(formatInterests(profile));
}

export async function cmdSources(): Promise<void> {
  const sources = loadSources();
  logHeader("RSS Feeds:");
  for (const s of sources.rssFeeds) {
    log(s.url);
  }
  if (sources.autoDiscovered.length) {
    logHeader("Auto-Discovered:");
    for (const s of sources.autoDiscovered) {
      log(`${s.url}${s.addedDate ? ` (added ${s.addedDate})` : ""}`);
    }
  }
  if (sources.newsSites.length) {
    logHeader("News Sites:");
    for (const s of sources.newsSites) {
      log(s);
    }
  }
  const total = sources.rssFeeds.length + sources.autoDiscovered.length;
  log(`\n${total} feed(s), ${sources.newsSites.length} site(s).`);
}

export async function cmdAddSource(url: string): Promise<void> {
  addSource(url);
  log(`Added source: ${url}`);
}

export async function cmdHistory(): Promise<void> {
  if (!existsSync(HISTORY_DIR)) {
    log("No history yet. Run 'newsbot scan' to generate your first digest.");
    return;
  }
  const files = readdirSync(HISTORY_DIR).filter((f) => f.endsWith(".html")).sort().reverse();
  if (files.length === 0) {
    log("No past digests found.");
    return;
  }
  logHeader("Past digests:");
  for (const f of files) {
    log(f.replace(".html", ""));
  }
}

export async function cmdStatus(): Promise<void> {
  if (!existsSync(NEWSBOT_DIR)) {
    log("Newsbot not initialized. Run 'newsbot init' first.");
    process.exit(1);
  }

  const sources = loadSources();
  const totalFeeds = sources.rssFeeds.length + sources.autoDiscovered.length;

  let articleCount = 0;
  try {
    const articles = JSON.parse(readFileSync(ARTICLES_PATH, "utf-8"));
    articleCount = Array.isArray(articles) ? articles.length : 0;
  } catch {}

  let seenCount = 0;
  try {
    const seen = JSON.parse(readFileSync(SEEN_PATH, "utf-8"));
    seenCount = Object.keys(seen).length;
  } catch {}

  const historyCount = existsSync(HISTORY_DIR)
    ? readdirSync(HISTORY_DIR).filter((f) => f.endsWith(".html")).length
    : 0;

  let lastDigest = "never";
  if (existsSync(DIGEST_PATH)) {
    lastDigest = statSync(DIGEST_PATH).mtime.toISOString();
  }

  logHeader("Newsbot Status:");
  log(`Feeds: ${totalFeeds}  |  Articles: ${articleCount}  |  Seen: ${seenCount}  |  Digests: ${historyCount}`);
  log(`Latest digest: ${lastDigest}`);
}

export async function cmdOpen(): Promise<void> {
  if (!existsSync(DIGEST_PATH)) {
    log("No digest found. Run 'newsbot scan' first.");
    return;
  }
  const open = (await import("open")).default;
  await open(DIGEST_PATH);
  log(`Opened ${DIGEST_PATH}`);
}
