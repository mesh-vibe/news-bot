# Newsbot — Design Document

## What is Newsbot?

Newsbot is a personal news aggregation CLI that learns what you're interested in from your browser history, discovers new articles from RSS feeds and news sites, and generates a clean HTML digest. It maintains persistent state so it improves over time.

Designed to be invoked by [Heartbeat](https://github.com/anthropics/heartbeat) as a scheduled task, but also usable standalone.

## How It Works

### Three Phases

**1. Learn — Build an Interest Profile**

- Read browser history from Chrome and Brave SQLite databases
- Extract topics and patterns from visited URLs and page titles
- Track which domains and subjects the user engages with most
- Update the interest profile over time (weighted by recency and frequency)
- Example interests: AI, Claude, coding, chess, TypeScript, etc.

**2. Discover — Find New Content**

- Scan configured RSS feeds and news aggregators
- Check known news sites for new articles
- Match articles against the interest profile
- Discover new sources from links in visited pages (auto-expand source list)
- Skip articles already seen (dedup against history)

**3. Curate — Generate the Digest**

- Produce `~/newsbot/news.html` as the current digest
- Archive previous digests in `~/newsbot/history/`
- Group articles by topic or source
- Show relevance score based on interest matching
- Include metadata: article count, sources scanned, generation time

### Directory Layout

```
~/newsbot/
  news.html              # Current/latest digest (always up to date)
  config.md              # User configuration (scan interval, max articles, etc.)
  interests.md           # Auto-generated interest profile (topics + weights)
  sources.md             # RSS feeds and sites to scan (auto-discovered + manual)
  seen.json              # URLs already processed (prevents duplicates)
  history/               # Archived digests
    2026-02-22.html
    2026-02-21.html
    ...
```

### Interest Profile (`interests.md`)

Auto-generated and auto-updated from browser history. Human-readable and editable — the user can pin topics, boost weights, or remove things they don't care about.

```markdown
# Interests

## High Interest
- AI / machine learning (weight: 0.95)
- Claude / Anthropic (weight: 0.92)
- TypeScript / Node.js (weight: 0.88)
- Chess (weight: 0.80)

## Moderate Interest
- Startups / venture capital (weight: 0.55)
- macOS development (weight: 0.50)

## Pinned (always include)
- Claude Code updates

## Blocked (never include)
- Celebrity gossip
```

### Sources (`sources.md`)

Starts with sensible defaults, grows as Newsbot discovers new sources from browsing history. User can add/remove manually.

```markdown
# News Sources

## RSS Feeds
- https://feeds.arstechnica.com/arstechnica/index
- https://hnrss.org/frontpage
- https://www.theverge.com/rss/index.xml
- https://techcrunch.com/feed/

## News Sites (scraped via headlines)
- reuters.com
- apnews.com
- bbc.com/news

## Auto-Discovered
- https://simonwillison.net/atom/everything/ (added 2026-02-20, from browser history)
```

### Browser History Access

Chromium-based browsers store history in SQLite databases:

| Browser | Path | Permissions |
|---------|------|-------------|
| Chrome | `~/Library/Application Support/Google/Chrome/*/History` | None needed |
| Brave | `~/Library/Application Support/BraveSoftware/Brave-Browser/*/History` | None needed |
| Safari | `~/Library/Safari/History.db` | Full Disk Access required |
| Firefox | `~/Library/Application Support/Firefox/Profiles/*/places.sqlite` | Copy-first (exclusive lock) |

Start with Chrome and Brave (no permissions needed). Safari and Firefox can be added later.

Timestamp conversion for Chrome/Brave:
```sql
datetime(visit_time/1000000 - 11644473600, 'unixepoch', 'localtime')
```

## CLI Reference

```
newsbot scan          # Run all three phases: learn → discover → curate
newsbot learn         # Update interest profile from browser history only
newsbot discover      # Scan sources for new articles only
newsbot digest        # Generate HTML digest from already-discovered articles
newsbot interests     # Show current interest profile
newsbot sources       # List configured sources
newsbot add-source <url>   # Manually add an RSS feed or site
newsbot history       # List past digests
newsbot open          # Open current news.html in the default browser
newsbot init          # Scaffold ~/newsbot/ directory with defaults
```

### Heartbeat Integration

The heartbeat task is just:

```markdown
---
schedule: every 4 hours
timeout: 10m
dir: ~
enabled: true
---

Run `newsbot scan` to update the news digest.
```

## Technical Stack

- **Language**: TypeScript (ESM, Node 20+)
- **Browser history**: sqlite3 (via child_process or better-sqlite3)
- **RSS parsing**: rss-parser or feedparser
- **HTML generation**: template literals (no framework needed)
- **Interest matching**: TF-IDF or keyword matching against titles/descriptions
- **Package name**: `newsbot`
- **Binary**: `newsbot` → `dist/cli/index.js`

## Design Principles

1. **Self-improving** — every run updates interests and discovers new sources
2. **Human-readable state** — all config is Markdown, editable by the user
3. **Offline-first** — works with local browser history, fetches RSS when online
4. **Incremental** — only processes what's new since the last run
5. **Standalone** — works without Heartbeat, but integrates cleanly with it

## Open Questions

- Should interest matching use simple keyword matching or something smarter (embeddings, Claude API)?
- How aggressively should it auto-discover sources? (Could get noisy)
- Should it support email delivery of the digest?
- Maximum size of seen.json before rotation/cleanup?
