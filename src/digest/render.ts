import { generateHtml } from "./template.js";
import type { ScoredArticle, DigestMetadata } from "../types.js";

export function renderDigest(articles: ScoredArticle[], metadata: DigestMetadata): string {
  // Group articles by primary topic, then sort within groups by score
  const grouped = groupByTopic(articles);
  const ordered = flattenGroups(grouped);
  return generateHtml(ordered, metadata);
}

function groupByTopic(articles: ScoredArticle[]): Map<string, ScoredArticle[]> {
  const groups = new Map<string, ScoredArticle[]>();
  const assigned = new Set<string>();

  for (const article of articles) {
    const topic = article.topics[0] || "General";
    if (!groups.has(topic)) {
      groups.set(topic, []);
    }
    groups.get(topic)!.push(article);
    assigned.add(article.url);
  }

  return groups;
}

function flattenGroups(groups: Map<string, ScoredArticle[]>): ScoredArticle[] {
  const entries = Array.from(groups.entries());
  // Sort groups by max score within group
  entries.sort((a, b) => {
    const maxA = Math.max(...a[1].map((x) => x.score));
    const maxB = Math.max(...b[1].map((x) => x.score));
    return maxB - maxA;
  });

  const result: ScoredArticle[] = [];
  for (const [, articles] of entries) {
    articles.sort((a, b) => b.score - a.score);
    result.push(...articles);
  }
  return result;
}
