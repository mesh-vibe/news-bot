import { readFileSync } from "node:fs";
import { INTERESTS_PATH } from "../constants.js";
import { atomicWrite } from "../util.js";
import type { Interest, InterestProfile } from "../types.js";

export function emptyProfile(): InterestProfile {
  return { high: [], moderate: [], pinned: [], blocked: [] };
}

export function loadInterests(): InterestProfile {
  let raw: string;
  try {
    raw = readFileSync(INTERESTS_PATH, "utf-8");
  } catch {
    return emptyProfile();
  }
  return parseInterests(raw);
}

export function parseInterests(raw: string): InterestProfile {
  const profile = emptyProfile();
  let currentSection: keyof InterestProfile | null = null;

  for (const line of raw.split("\n")) {
    const sectionMatch = line.match(/^##\s+(.+)/);
    if (sectionMatch) {
      const heading = sectionMatch[1]!.toLowerCase();
      if (heading.includes("high")) currentSection = "high";
      else if (heading.includes("moderate")) currentSection = "moderate";
      else if (heading.includes("pinned")) currentSection = "pinned";
      else if (heading.includes("blocked")) currentSection = "blocked";
      else currentSection = null;
      continue;
    }

    if (!currentSection) continue;

    const itemMatch = line.match(/^-\s+(.+?)(?:\s*\(weight:\s*([\d.]+)\))?$/);
    if (!itemMatch) continue;

    const topic = itemMatch[1]!.trim();
    const weight = itemMatch[2] ? parseFloat(itemMatch[2]) : currentSection === "high" ? 0.8 : currentSection === "moderate" ? 0.5 : 1.0;

    const interest: Interest = {
      topic,
      weight,
      pinned: currentSection === "pinned",
      blocked: currentSection === "blocked",
    };
    profile[currentSection].push(interest);
  }

  return profile;
}

export function saveInterests(profile: InterestProfile): void {
  atomicWrite(INTERESTS_PATH, formatInterests(profile));
}

export function formatInterests(profile: InterestProfile): string {
  const lines: string[] = ["# Interests", ""];

  if (profile.high.length) {
    lines.push("## High Interest");
    for (const i of profile.high) {
      lines.push(`- ${i.topic} (weight: ${i.weight.toFixed(2)})`);
    }
    lines.push("");
  }

  if (profile.moderate.length) {
    lines.push("## Moderate Interest");
    for (const i of profile.moderate) {
      lines.push(`- ${i.topic} (weight: ${i.weight.toFixed(2)})`);
    }
    lines.push("");
  }

  if (profile.pinned.length) {
    lines.push("## Pinned (always include)");
    for (const i of profile.pinned) {
      lines.push(`- ${i.topic}`);
    }
    lines.push("");
  }

  if (profile.blocked.length) {
    lines.push("## Blocked (never include)");
    for (const i of profile.blocked) {
      lines.push(`- ${i.topic}`);
    }
    lines.push("");
  }

  return lines.join("\n");
}

export function mergeInterests(existing: InterestProfile, newInterests: Interest[], decayFactor: number = 0.9): InterestProfile {
  const pinned = new Set(existing.pinned.map((i) => i.topic.toLowerCase()));
  const blocked = new Set(existing.blocked.map((i) => i.topic.toLowerCase()));

  const merged = new Map<string, Interest>();

  for (const i of [...existing.high, ...existing.moderate]) {
    const key = i.topic.toLowerCase();
    if (pinned.has(key) || blocked.has(key)) continue;
    merged.set(key, { ...i, weight: i.weight * decayFactor });
  }

  for (const i of newInterests) {
    const key = i.topic.toLowerCase();
    if (pinned.has(key) || blocked.has(key)) continue;
    const existing = merged.get(key);
    if (existing) {
      merged.set(key, { ...existing, weight: Math.min(1.0, existing.weight + i.weight * 0.3) });
    } else {
      merged.set(key, { ...i });
    }
  }

  const all = Array.from(merged.values()).sort((a, b) => b.weight - a.weight);
  const high = all.filter((i) => i.weight >= 0.65);
  const moderate = all.filter((i) => i.weight >= 0.3 && i.weight < 0.65);

  return {
    high,
    moderate,
    pinned: [...existing.pinned],
    blocked: [...existing.blocked],
  };
}

export function defaultInterestsContent(): string {
  return `# Interests

## High Interest

## Moderate Interest

## Pinned (always include)

## Blocked (never include)
`;
}
