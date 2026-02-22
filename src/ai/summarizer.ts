import { ask } from "./client.js";
import type { ScoredArticle } from "../types.js";
import { SUMMARY_BATCH_SIZE } from "../constants.js";

const SYSTEM_PROMPT = `You are a news summarizer. Given a batch of articles, generate a brief, informative summary for each.

Return ONLY a JSON array of objects, each with:
- "index" (number): the article's position in the input list (0-based)
- "summary" (string): 2-3 sentence summary that captures the key information

Be concise and informative. Focus on what happened and why it matters.`;

function formatArticles(articles: ScoredArticle[]): string {
  return articles
    .map((a, i) => `[${i}] ${a.title}\n    Source: ${a.source}\n    ${a.description || "(no description)"}`)
    .join("\n\n");
}

export async function enhanceSummaries(articles: ScoredArticle[]): Promise<ScoredArticle[]> {
  const needsSummary = articles.filter((a) => !a.summary || a.summary.length < 20);
  if (needsSummary.length === 0) return articles;

  const summaryMap = new Map<string, string>();

  for (let i = 0; i < needsSummary.length; i += SUMMARY_BATCH_SIZE) {
    const batch = needsSummary.slice(i, i + SUMMARY_BATCH_SIZE);
    const userMessage = `Summarize these articles:\n\n${formatArticles(batch)}`;

    try {
      const response = await ask(SYSTEM_PROMPT, userMessage);
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (!jsonMatch) continue;

      const parsed = JSON.parse(jsonMatch[0]) as Array<{
        index: number;
        summary: string;
      }>;

      for (const item of parsed) {
        const article = batch[item.index];
        if (article) {
          summaryMap.set(article.url, item.summary);
        }
      }
    } catch {
      // skip failed batch
    }
  }

  return articles.map((a) => ({
    ...a,
    summary: summaryMap.get(a.url) || a.summary,
  }));
}
