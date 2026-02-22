import { readFileSync } from "node:fs";
import { SEEN_PATH, SEEN_MAX_AGE_DAYS } from "../constants.js";
import { atomicWrite } from "../util.js";

interface SeenEntry {
  url: string;
  seenAt: string;
}

interface SeenStore {
  entries: SeenEntry[];
}

export function loadSeen(): Set<string> {
  let raw: string;
  try {
    raw = readFileSync(SEEN_PATH, "utf-8");
  } catch {
    return new Set();
  }
  try {
    const store: SeenStore = JSON.parse(raw);
    return new Set(store.entries.map((e) => e.url));
  } catch {
    return new Set();
  }
}

export function saveSeen(urls: Set<string>): void {
  const now = new Date().toISOString();
  let existing: SeenEntry[] = [];
  try {
    const raw = readFileSync(SEEN_PATH, "utf-8");
    const store: SeenStore = JSON.parse(raw);
    existing = store.entries;
  } catch {
    // start fresh
  }

  const existingMap = new Map(existing.map((e) => [e.url, e.seenAt]));
  for (const url of urls) {
    if (!existingMap.has(url)) {
      existingMap.set(url, now);
    }
  }

  const entries = Array.from(existingMap.entries()).map(([url, seenAt]) => ({ url, seenAt }));
  const store: SeenStore = { entries };
  atomicWrite(SEEN_PATH, JSON.stringify(store, null, 2));
}

export function pruneSeen(): number {
  let existing: SeenEntry[] = [];
  try {
    const raw = readFileSync(SEEN_PATH, "utf-8");
    const store: SeenStore = JSON.parse(raw);
    existing = store.entries;
  } catch {
    return 0;
  }

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - SEEN_MAX_AGE_DAYS);
  const cutoffStr = cutoff.toISOString();

  const before = existing.length;
  const pruned = existing.filter((e) => e.seenAt >= cutoffStr);
  const removed = before - pruned.length;

  if (removed > 0) {
    atomicWrite(SEEN_PATH, JSON.stringify({ entries: pruned }, null, 2));
  }
  return removed;
}
