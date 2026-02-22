export interface Interest {
  topic: string;
  weight: number;
  pinned?: boolean;
  blocked?: boolean;
  lastUpdated?: string;
}

export interface InterestProfile {
  high: Interest[];
  moderate: Interest[];
  pinned: Interest[];
  blocked: Interest[];
}

export interface HistoryEntry {
  url: string;
  title: string;
  visitTime: Date;
  visitCount: number;
  domain: string;
}

export interface RssSource {
  url: string;
  name?: string;
  addedDate?: string;
  autoDiscovered?: boolean;
}

export interface SourceList {
  rssFeeds: RssSource[];
  newsSites: string[];
  autoDiscovered: RssSource[];
}

export interface Article {
  title: string;
  url: string;
  source: string;
  publishedAt?: Date;
  description?: string;
  score?: number;
  summary?: string;
  topics?: string[];
}

export interface ScoredArticle extends Article {
  score: number;
  summary: string;
  topics: string[];
}

export interface Config {
  model: string;
  maxArticles: number;
  scanInterval: string;
  historyDays: number;
  minScore: number;
}

export interface DigestMetadata {
  generatedAt: Date;
  articleCount: number;
  sourcesScanned: number;
  topTopics: string[];
}

export class NewsbotError extends Error {
  hint: string;
  constructor(message: string, hint: string) {
    super(message);
    this.name = "NewsbotError";
    this.hint = hint;
  }
}
