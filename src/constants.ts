import { join } from "node:path";
import { homedir } from "node:os";

export const NEWSBOT_DIR = join(homedir(), "mesh-vibe", "data", "news-bot");
export const CONFIG_PATH = join(NEWSBOT_DIR, "config.md");
export const INTERESTS_PATH = join(NEWSBOT_DIR, "interests.md");
export const SOURCES_PATH = join(NEWSBOT_DIR, "sources.md");
export const SEEN_PATH = join(NEWSBOT_DIR, "seen.json");
export const DIGEST_PATH = join(NEWSBOT_DIR, "news.html");
export const HISTORY_DIR = join(NEWSBOT_DIR, "history");
export const ARTICLES_PATH = join(NEWSBOT_DIR, ".articles.json");

export const DEFAULT_MODEL = "claude-haiku-4-5-20251001";
export const DEFAULT_MAX_ARTICLES = 25;
export const DEFAULT_SCAN_INTERVAL = "4 hours";
export const DEFAULT_HISTORY_DAYS = 7;
export const DEFAULT_MIN_SCORE = 0.4;

export const HISTORY_BATCH_SIZE = 100;
export const SCORING_BATCH_SIZE = 20;
export const SUMMARY_BATCH_SIZE = 10;

export const SEEN_MAX_AGE_DAYS = 90;

export const CHROME_EPOCH_OFFSET = 11644473600;
