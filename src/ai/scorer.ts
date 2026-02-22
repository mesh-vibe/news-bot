import { ask } from "./client.js";
import type { Article, InterestProfile, ScoredArticle } from "../types.js";
import { SCORING_BATCH_SIZE } from "../constants.js";

const SYSTEM_PROMPT = `You are an article relevance scorer. Given a user's interest profile and a batch of articles, score each article's relevance.

Return ONLY a JSON array of objects, each with:
- "index" (number): the article's position in the input list (0-based)
- "score" (number 0-1): relevance to the user's interests
- "topics" (string[]): which interests this article matches
- "summary" (string): 1-2 sentence summary of the article

Score guidelines:
- 0.9-1.0: Directly matches high-priority interests
- 0.7-0.89: Strong match to interests
- 0.5-0.69: Moderate relevance
- 0.3-0.49: Tangential relevance
- 0.0-0.29: Not relevant

Always include pinned topics at high scores. Always score blocked topics at 0.`;

function formatProfile(profile: InterestProfile): string {
  const lines: string[] = [];
  if (profile.high.length) {
    lines.push("High interest: " + profile.high.map((i) => `${i.topic} (${i.weight.toFixed(2)})`).join(", "));
  }
  if (profile.moderate.length) {
    lines.push("Moderate interest: " + profile.moderate.map((i) => `${i.topic} (${i.weight.toFixed(2)})`).join(", "));
  }
  if (profile.pinned.length) {
    lines.push("Always include: " + profile.pinned.map((i) => i.topic).join(", "));
  }
  if (profile.blocked.length) {
    lines.push("Never include: " + profile.blocked.map((i) => i.topic).join(", "));
  }
  return lines.join("\n");
}

function formatArticles(articles: Article[]): string {
  return articles
    .map((a, i) => `[${i}] ${a.title}\n    Source: ${a.source}\n    ${a.description || "(no description)"}`)
    .join("\n\n");
}

export async function scoreArticles(articles: Article[], profile: InterestProfile): Promise<ScoredArticle[]> {
  if (articles.length === 0) return [];

  const scored: ScoredArticle[] = [];

  for (let i = 0; i < articles.length; i += SCORING_BATCH_SIZE) {
    const batch = articles.slice(i, i + SCORING_BATCH_SIZE);
    const userMessage = `Interest Profile:\n${formatProfile(profile)}\n\nArticles:\n${formatArticles(batch)}`;

    try {
      const response = await ask(SYSTEM_PROMPT, userMessage);
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (!jsonMatch) continue;

      const parsed = JSON.parse(jsonMatch[0]) as Array<{
        index: number;
        score: number;
        topics: string[];
        summary: string;
      }>;

      for (const item of parsed) {
        const article = batch[item.index];
        if (!article) continue;
        scored.push({
          ...article,
          score: Math.min(1.0, Math.max(0, item.score)),
          topics: item.topics,
          summary: item.summary,
        });
      }
    } catch {
      // skip failed batch
    }
  }

  return scored.sort((a, b) => b.score - a.score);
}
