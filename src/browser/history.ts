import { copyFileSync, unlinkSync } from "node:fs";
import Database from "better-sqlite3";
import { CHROME_EPOCH_OFFSET } from "../constants.js";
import { tempPath, extractDomain, log } from "../util.js";
import { findBrowserProfiles } from "./paths.js";
import type { HistoryEntry } from "../types.js";

function chromeTimeToDate(chromeTime: number): Date {
  const unixSeconds = chromeTime / 1_000_000 - CHROME_EPOCH_OFFSET;
  return new Date(unixSeconds * 1000);
}

function queryHistory(dbPath: string, daysBack: number): HistoryEntry[] {
  const tmpDb = tempPath("history.db");
  try {
    copyFileSync(dbPath, tmpDb);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log(`Could not copy history DB: ${msg}`);
    return [];
  }

  try {
    const db = new Database(tmpDb, { readonly: true, fileMustExist: true });
    const cutoffChromeTime = (Date.now() / 1000 + CHROME_EPOCH_OFFSET - daysBack * 86400) * 1_000_000;

    const rows = db
      .prepare(
        `SELECT u.url, u.title, v.visit_time, u.visit_count
         FROM urls u
         JOIN visits v ON u.id = v.url
         WHERE v.visit_time > ?
         ORDER BY v.visit_time DESC`
      )
      .all(cutoffChromeTime) as Array<{
      url: string;
      title: string;
      visit_time: number;
      visit_count: number;
    }>;

    db.close();

    const entries: HistoryEntry[] = [];
    const seen = new Set<string>();

    for (const row of rows) {
      if (seen.has(row.url)) continue;
      seen.add(row.url);

      const domain = extractDomain(row.url);
      if (!domain) continue;

      entries.push({
        url: row.url,
        title: row.title || "",
        visitTime: chromeTimeToDate(row.visit_time),
        visitCount: row.visit_count,
        domain,
      });
    }

    return entries;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log(`Error reading history DB: ${msg}`);
    return [];
  } finally {
    try {
      unlinkSync(tmpDb);
    } catch {
      // cleanup best effort
    }
  }
}

export function readBrowserHistory(daysBack: number): HistoryEntry[] {
  const profiles = findBrowserProfiles();
  if (profiles.length === 0) {
    log("No Chrome or Brave browser profiles found.");
    return [];
  }

  const allEntries: HistoryEntry[] = [];
  const seenUrls = new Set<string>();

  for (const profile of profiles) {
    log(`Reading history from ${profile.browser} (${profile.profileName})...`);
    const entries = queryHistory(profile.historyPath, daysBack);
    for (const entry of entries) {
      if (!seenUrls.has(entry.url)) {
        seenUrls.add(entry.url);
        allEntries.push(entry);
      }
    }
  }

  allEntries.sort((a, b) => b.visitTime.getTime() - a.visitTime.getTime());
  return allEntries;
}
