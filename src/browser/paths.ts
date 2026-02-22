import { join } from "node:path";
import { homedir } from "node:os";
import { readdirSync, existsSync } from "node:fs";

interface BrowserProfile {
  browser: string;
  profileName: string;
  historyPath: string;
}

export function findBrowserProfiles(): BrowserProfile[] {
  const profiles: BrowserProfile[] = [];
  const home = homedir();

  const browsers = [
    {
      name: "Chrome",
      base: join(home, "Library", "Application Support", "Google", "Chrome"),
    },
    {
      name: "Brave",
      base: join(home, "Library", "Application Support", "BraveSoftware", "Brave-Browser"),
    },
  ];

  for (const browser of browsers) {
    if (!existsSync(browser.base)) continue;

    try {
      const entries = readdirSync(browser.base, { withFileTypes: true });
      for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        if (!entry.name.startsWith("Default") && !entry.name.startsWith("Profile")) continue;

        const historyPath = join(browser.base, entry.name, "History");
        if (existsSync(historyPath)) {
          profiles.push({
            browser: browser.name,
            profileName: entry.name,
            historyPath,
          });
        }
      }
    } catch {
      // skip inaccessible directories
    }
  }

  return profiles;
}
