import { ask } from "./client.js";
import type { HistoryEntry, Interest } from "../types.js";
import { HISTORY_BATCH_SIZE } from "../constants.js";

const SYSTEM_PROMPT = `You are an interest extraction assistant. Given a list of browser history entries (URLs and page titles), extract a list of topics the user is interested in.

Return ONLY a JSON array of objects, each with "topic" (string) and "weight" (number 0-1).
- Weight should reflect how strong the interest appears based on frequency and recency
- Combine related topics (e.g., "TypeScript" and "Node.js" can be one entry "TypeScript / Node.js")
- Ignore generic browsing (Google searches, social media homepages, email, banking)
- Focus on specific subjects, technologies, hobbies, industries
- Return 5-20 interests, sorted by weight descending

Example output:
[
  {"topic": "AI / machine learning", "weight": 0.95},
  {"topic": "TypeScript / Node.js", "weight": 0.82},
  {"topic": "Chess", "weight": 0.65}
]`;

function formatHistoryBatch(entries: HistoryEntry[]): string {
  return entries
    .map((e) => `${e.domain} | ${e.title} | visits: ${e.visitCount}`)
    .join("\n");
}

export async function extractInterests(entries: HistoryEntry[]): Promise<Interest[]> {
  if (entries.length === 0) return [];

  const batch = entries.slice(0, HISTORY_BATCH_SIZE);
  const userMessage = `Extract interests from this browser history:\n\n${formatHistoryBatch(batch)}`;
  const response = await ask(SYSTEM_PROMPT, userMessage);

  try {
    const jsonMatch = response.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return [];
    const parsed = JSON.parse(jsonMatch[0]) as Array<{ topic: string; weight: number }>;
    return parsed.map((item) => ({
      topic: item.topic,
      weight: Math.min(1.0, Math.max(0, item.weight)),
    }));
  } catch {
    return [];
  }
}
