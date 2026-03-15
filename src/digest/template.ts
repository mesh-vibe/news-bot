import type { ScoredArticle, DigestMetadata } from "../types.js";
import { formatDateTime, truncate } from "../util.js";

function scoreColor(score: number): string {
  if (score >= 0.8) return "var(--green)";
  if (score >= 0.6) return "var(--orange)";
  if (score >= 0.4) return "#f97316";
  return "var(--text-muted)";
}

function scoreBg(score: number): string {
  if (score >= 0.8) return "rgba(63,185,80,0.2)";
  if (score >= 0.6) return "rgba(210,153,34,0.2)";
  if (score >= 0.4) return "rgba(249,115,22,0.2)";
  return "rgba(139,148,158,0.2)";
}

function scoreLabel(score: number): string {
  if (score >= 0.8) return "High";
  if (score >= 0.6) return "Medium";
  if (score >= 0.4) return "Low";
  return "—";
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function articleCard(article: ScoredArticle): string {
  const color = scoreColor(article.score);
  const bg = scoreBg(article.score);
  const label = scoreLabel(article.score);
  const title = escapeHtml(article.title);
  const summary = escapeHtml(article.summary || "");
  const source = escapeHtml(article.source);
  const topics = article.topics.map((t) => escapeHtml(t));
  const publishedAt = article.publishedAt ? new Date(article.publishedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "";

  return `
    <article class="news-card">
      <div class="news-header">
        <span class="news-score" style="background: ${bg}; color: ${color}">${label} ${(article.score * 100).toFixed(0)}%</span>
        <span class="news-source">${source}</span>
        ${publishedAt ? `<span class="news-date">${publishedAt}</span>` : ""}
      </div>
      <h2 class="news-title"><a href="${escapeHtml(article.url)}" target="_blank" rel="noopener">${title}</a></h2>
      ${summary ? `<p class="news-summary">${summary}</p>` : ""}
      ${topics.length ? `<div class="news-topics">${topics.map((t) => `<span class="news-topic">${t}</span>`).join("")}</div>` : ""}
    </article>`;
}

/**
 * Generates the news digest HTML.
 *
 * Uses the vibe-http design system: same CSS variables, color palette, and
 * font stack. When embedded inside vibe-http, the <main> content is extracted
 * and inherits the portal's theme. When viewed standalone, the bundled styles
 * provide the same look.
 */
export function generateHtml(articles: ScoredArticle[], metadata: DigestMetadata): string {
  const generated = formatDateTime(metadata.generatedAt);
  const topicsList = metadata.topTopics.map((t) => escapeHtml(t)).join(", ");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Newsbot Digest — ${generated}</title>
  <style>
    :root {
      --bg: #0d1117; --surface: #161b22; --border: #30363d;
      --text: #e6edf3; --text-muted: #8b949e; --text-link: #58a6ff;
      --green: #3fb950; --red: #f85149; --orange: #d29922; --blue: #58a6ff;
    }
    @media (prefers-color-scheme: light) {
      :root {
        --bg: #ffffff; --surface: #f6f8fa; --border: #d1d9e0;
        --text: #1f2328; --text-muted: #656d76; --text-link: #0969da;
        --green: #1a7f37; --red: #cf222e; --orange: #9a6700; --blue: #0969da;
      }
    }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
      background: var(--bg); color: var(--text); line-height: 1.6;
      max-width: 900px; margin: 0 auto; padding: 2rem 1rem;
    }
    .news-digest-header {
      margin-bottom: 1.5rem; padding-bottom: 1rem;
      border-bottom: 1px solid var(--border);
    }
    .news-digest-header h1 { font-size: 1.5rem; margin-bottom: 0.25rem; }
    .news-meta { color: var(--text-muted); font-size: 0.875rem; }
    .news-card {
      background: var(--surface); border: 1px solid var(--border);
      border-radius: 8px; padding: 1.25rem; margin-bottom: 0.75rem;
    }
    .news-header {
      display: flex; align-items: center; gap: 0.75rem;
      margin-bottom: 0.5rem; font-size: 0.8rem;
    }
    .news-score {
      padding: 2px 8px; border-radius: 12px;
      font-weight: 600; font-size: 0.75rem;
    }
    .news-source { color: var(--text-muted); }
    .news-date { color: var(--text-muted); }
    .news-title { font-size: 1.1rem; margin-bottom: 0.5rem; line-height: 1.3; }
    .news-title a { color: var(--text-link); text-decoration: none; }
    .news-title a:hover { text-decoration: underline; }
    .news-summary { color: var(--text-muted); font-size: 0.9rem; margin-bottom: 0.5rem; }
    .news-topics { display: flex; flex-wrap: wrap; gap: 0.375rem; }
    .news-topic {
      background: rgba(139,148,158,0.15); padding: 2px 8px;
      border-radius: 12px; font-size: 0.75rem; color: var(--text-muted);
    }
    .news-footer {
      margin-top: 2rem; padding-top: 1rem;
      border-top: 1px solid var(--border);
      color: var(--text-muted); font-size: 0.8rem; text-align: center;
    }
  </style>
</head>
<body>
  <header class="news-digest-header">
    <h1>Newsbot Digest</h1>
    <p class="news-meta">
      ${metadata.articleCount} articles from ${metadata.sourcesScanned} sources
      — Generated ${generated}
    </p>
    ${topicsList ? `<p class="news-meta">Topics: ${topicsList}</p>` : ""}
  </header>
  <main>
    ${articles.map(articleCard).join("\n")}
  </main>
  <footer class="news-footer">
    Generated by Newsbot
  </footer>
</body>
</html>`;
}
