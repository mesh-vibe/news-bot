import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { NEWSBOT_DIR, CONFIG_PATH, INTERESTS_PATH, SOURCES_PATH, SEEN_PATH, HISTORY_DIR } from "../constants.js";
import { defaultConfigContent } from "./config.js";
import { defaultInterestsContent } from "./interests.js";
import { defaultSourcesContent } from "../sources/manager.js";
import { log, logHeader } from "../util.js";

export function initNewsbot(): void {
  logHeader("Initializing newsbot...");

  mkdirSync(NEWSBOT_DIR, { recursive: true });
  mkdirSync(HISTORY_DIR, { recursive: true });

  let created = 0;

  if (!existsSync(CONFIG_PATH)) {
    writeFileSync(CONFIG_PATH, defaultConfigContent(), "utf-8");
    log(`Created ${CONFIG_PATH}`);
    created++;
  }

  if (!existsSync(INTERESTS_PATH)) {
    writeFileSync(INTERESTS_PATH, defaultInterestsContent(), "utf-8");
    log(`Created ${INTERESTS_PATH}`);
    created++;
  }

  if (!existsSync(SOURCES_PATH)) {
    writeFileSync(SOURCES_PATH, defaultSourcesContent(), "utf-8");
    log(`Created ${SOURCES_PATH}`);
    created++;
  }

  if (!existsSync(SEEN_PATH)) {
    writeFileSync(SEEN_PATH, JSON.stringify({ entries: [] }, null, 2), "utf-8");
    log(`Created ${SEEN_PATH}`);
    created++;
  }

  if (created === 0) {
    log("All files already exist.");
  } else {
    log(`Created ${created} file(s).`);
  }
  log(`Newsbot directory: ${NEWSBOT_DIR}`);
}
