import { readFileSync } from "node:fs";
import { CONFIG_PATH, DEFAULT_MODEL, DEFAULT_MAX_ARTICLES, DEFAULT_SCAN_INTERVAL, DEFAULT_HISTORY_DAYS, DEFAULT_MIN_SCORE } from "../constants.js";
import { atomicWrite } from "../util.js";
import type { Config } from "../types.js";

export function defaultConfig(): Config {
  return {
    model: DEFAULT_MODEL,
    maxArticles: DEFAULT_MAX_ARTICLES,
    scanInterval: DEFAULT_SCAN_INTERVAL,
    historyDays: DEFAULT_HISTORY_DAYS,
    minScore: DEFAULT_MIN_SCORE,
  };
}

export function loadConfig(): Config {
  const config = defaultConfig();
  let raw: string;
  try {
    raw = readFileSync(CONFIG_PATH, "utf-8");
  } catch {
    return config;
  }

  for (const line of raw.split("\n")) {
    const match = line.match(/^-\s+\*\*(\w+)\*\*:\s*(.+)$/);
    if (!match) continue;
    const [, key, value] = match;
    switch (key) {
      case "model":
        config.model = value!.trim();
        break;
      case "maxArticles":
        config.maxArticles = parseInt(value!.trim(), 10) || DEFAULT_MAX_ARTICLES;
        break;
      case "scanInterval":
        config.scanInterval = value!.trim();
        break;
      case "historyDays":
        config.historyDays = parseInt(value!.trim(), 10) || DEFAULT_HISTORY_DAYS;
        break;
      case "minScore":
        config.minScore = parseFloat(value!.trim()) || DEFAULT_MIN_SCORE;
        break;
    }
  }
  return config;
}

export function saveConfig(config: Config): void {
  const content = `# Newsbot Configuration

- **model**: ${config.model}
- **maxArticles**: ${config.maxArticles}
- **scanInterval**: ${config.scanInterval}
- **historyDays**: ${config.historyDays}
- **minScore**: ${config.minScore}
`;
  atomicWrite(CONFIG_PATH, content);
}

export function defaultConfigContent(): string {
  const c = defaultConfig();
  return `# Newsbot Configuration

- **model**: ${c.model}
- **maxArticles**: ${c.maxArticles}
- **scanInterval**: ${c.scanInterval}
- **historyDays**: ${c.historyDays}
- **minScore**: ${c.minScore}
`;
}
