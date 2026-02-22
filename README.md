# Newsbot

A personal news aggregation CLI that learns what you care about from your browser history, discovers articles from RSS feeds, and generates a curated HTML digest — scored by relevance using Claude AI.

## How It Works

Newsbot runs a three-phase pipeline:

1. **Learn** — Reads your Chrome/Brave browser history to build an interest profile (topics + weights)
2. **Discover** — Fetches RSS feeds, scores each article against your interests using Claude, and filters by relevance
3. **Digest** — Generates a responsive HTML digest grouped by topic with color-coded relevance scores

Run `newsbot scan` to execute all three phases, or run them individually.

## Quick Start

```bash
# Clone and build
git clone https://github.com/cday-with-ai/Newsbot.git
cd Newsbot
npm install
npm run build

# Set up your API key
export ANTHROPIC_API_KEY="your-key-here"

# Initialize config directory and run
node dist/cli/index.js init
node dist/cli/index.js scan

# Open the generated digest
node dist/cli/index.js open
```

### Global Install (optional)

```bash
npm link
newsbot scan
```

## Requirements

- Node.js >= 20
- `ANTHROPIC_API_KEY` environment variable
- Chrome or Brave browser (for history access)
- macOS (browser history paths are macOS-specific)

## Commands

| Command | Description |
|---------|-------------|
| `newsbot init` | Set up `~/newsbot/` with default config files |
| `newsbot scan` | Full pipeline: learn, discover, digest |
| `newsbot learn` | Update interest profile from browser history |
| `newsbot discover` | Scan RSS feeds and score articles |
| `newsbot digest` | Generate HTML digest from discovered articles |
| `newsbot interests` | Show current interest profile |
| `newsbot sources` | List configured RSS feeds |
| `newsbot add-source <url>` | Add an RSS feed URL |
| `newsbot history` | List past digests |
| `newsbot open` | Open current digest in default browser |

## State Directory

All persistent state lives in `~/newsbot/` as human-readable files:

```
~/newsbot/
  config.md         # Configuration (model, max articles, scan interval)
  interests.md      # Interest profile with weights (editable)
  sources.md        # RSS feeds and news sites (editable)
  seen.json         # Tracks seen URLs to prevent duplicates
  news.html         # Current digest
  history/          # Archived past digests
```

The interest profile and sources list are Markdown files you can edit by hand to pin topics, block subjects, or add feeds.

## Architecture

```
src/
  cli/          # Commander.js entry point and command handlers
  core/         # Three-phase pipeline (learn, discover, curate, scan)
  ai/           # Claude API integration (interest extraction, scoring, summaries)
  browser/      # Chrome/Brave SQLite history access
  sources/      # RSS feed fetching and source management
  state/        # Config, interests, and seen-URL persistence
  digest/       # HTML template and article grouping
```

- **TypeScript** with ESM modules, strict mode
- **Claude AI** for interest extraction, article scoring (0-1), and summary generation
- **better-sqlite3** for reading browser history databases
- **rss-parser** for feed fetching
- **Batched API calls** for efficiency (100 history entries, 20 articles for scoring, 10 for summaries)
- **Atomic file writes** to prevent data corruption

## Heartbeat Integration

Newsbot is designed to work with [Heartbeat](https://github.com/anthropics/heartbeat) as a scheduled task:

```markdown
---
schedule: every 4 hours
timeout: 10m
dir: ~
enabled: true
---

Run `newsbot scan` to update the news digest.
```

## License

MIT
