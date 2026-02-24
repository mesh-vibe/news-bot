---
name: newsbot
description: Personal news aggregation from RSS feeds and browser history
cli: newsbot
data_dir: ~/mesh-vibe/data/newsbot
version: 1.0.0
reports:
  - name: Daily Digest
    path: ~/mesh-vibe/data/newsbot/news.html
health_check: newsbot status
depends_on:
  - vault
notify_on:
  - event: newsbot.scan_complete
    priority: low
  - event: newsbot.scan_failed
    priority: high
---

Newsbot learns your interests from browser history, discovers articles from RSS feeds, scores them for relevance, and generates an HTML digest.
