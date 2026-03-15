import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  formatDate,
  formatDateTime,
  extractDomain,
  truncate,
  daysAgo,
  atomicWrite,
  tempPath,
} from "../src/util.js";

describe("formatDate", () => {
  it("formats a known date as YYYY-MM-DD", () => {
    const date = new Date("2024-01-15T12:00:00Z");
    expect(formatDate(date)).toBe("2024-01-15");
  });

  it("formats epoch start", () => {
    const date = new Date("1970-01-01T00:00:00Z");
    expect(formatDate(date)).toBe("1970-01-01");
  });

  it("formats a date at end of year", () => {
    const date = new Date("2023-12-31T23:59:59Z");
    expect(formatDate(date)).toBe("2023-12-31");
  });

  it("pads single-digit months and days", () => {
    const date = new Date("2024-03-05T00:00:00Z");
    expect(formatDate(date)).toBe("2024-03-05");
  });
});

describe("extractDomain", () => {
  it("extracts domain from a simple URL", () => {
    expect(extractDomain("https://example.com/path")).toBe("example.com");
  });

  it("strips www prefix", () => {
    expect(extractDomain("https://www.example.com/page")).toBe("example.com");
  });

  it("preserves subdomains other than www", () => {
    expect(extractDomain("https://blog.example.com")).toBe("blog.example.com");
  });

  it("handles http URLs", () => {
    expect(extractDomain("http://news.ycombinator.com/item?id=123")).toBe(
      "news.ycombinator.com",
    );
  });

  it("returns empty string for invalid URLs", () => {
    expect(extractDomain("not-a-url")).toBe("");
  });

  it("returns empty string for empty input", () => {
    expect(extractDomain("")).toBe("");
  });

  it("returns empty string for random text", () => {
    expect(extractDomain("hello world")).toBe("");
  });
});

describe("truncate", () => {
  it("returns short strings unchanged", () => {
    expect(truncate("hello", 10)).toBe("hello");
  });

  it("returns exact-length strings unchanged", () => {
    expect(truncate("abcde", 5)).toBe("abcde");
  });

  it("truncates long strings with ellipsis", () => {
    const result = truncate("hello world", 6);
    expect(result).toBe("hello\u2026");
    expect(result.length).toBe(6);
  });

  it("truncates to single character plus ellipsis", () => {
    expect(truncate("abcdef", 2)).toBe("a\u2026");
  });

  it("handles maxLength of 1", () => {
    expect(truncate("abc", 1)).toBe("\u2026");
  });
});

describe("formatDateTime", () => {
  it("formats a known date with month, day, year, hour, minute", () => {
    const date = new Date("2024-06-15T14:30:00Z");
    const result = formatDateTime(date);
    // toLocaleString("en-US") — verify key components are present
    expect(result).toContain("2024");
    expect(result).toContain("15");
    expect(result).toMatch(/Jun/);
  });

  it("formats epoch start", () => {
    const date = new Date("1970-01-01T00:00:00Z");
    const result = formatDateTime(date);
    // In western-hemisphere TZs, epoch UTC renders as Dec 31, 1969
    expect(result).toMatch(/1969|1970/);
    expect(result).toMatch(/Jan|Dec/);
  });

  it("formats end-of-year date", () => {
    const date = new Date("2023-12-31T23:59:00Z");
    const result = formatDateTime(date);
    expect(result).toContain("2023");
    expect(result).toMatch(/Dec|Jan/); // Dec or Jan depending on local TZ
  });

  it("returns a non-empty string", () => {
    expect(formatDateTime(new Date())).toBeTruthy();
  });
});

describe("atomicWrite", () => {
  it("writes content that can be read back", () => {
    const filePath = join(tmpdir(), `newsbot-test-atomic-${Date.now()}.txt`);
    atomicWrite(filePath, "hello atomic");
    const content = readFileSync(filePath, "utf-8");
    expect(content).toBe("hello atomic");
  });

  it("creates parent directories if they do not exist", () => {
    const filePath = join(
      tmpdir(),
      `newsbot-test-atomic-${Date.now()}`,
      "nested",
      "file.txt",
    );
    atomicWrite(filePath, "nested content");
    const content = readFileSync(filePath, "utf-8");
    expect(content).toBe("nested content");
  });

  it("overwrites existing file atomically", () => {
    const filePath = join(tmpdir(), `newsbot-test-atomic-overwrite-${Date.now()}.txt`);
    atomicWrite(filePath, "first");
    atomicWrite(filePath, "second");
    const content = readFileSync(filePath, "utf-8");
    expect(content).toBe("second");
  });
});

describe("tempPath", () => {
  it("returns a path under the system temp directory", () => {
    const result = tempPath("test");
    expect(result).toContain(tmpdir());
  });

  it("includes the prefix in the path", () => {
    const result = tempPath("myfoo");
    expect(result).toContain("newsbot-myfoo-");
  });

  it("generates unique paths on each call", () => {
    const a = tempPath("uniq");
    const b = tempPath("uniq");
    expect(a).not.toBe(b);
  });

  it("includes a hex suffix", () => {
    const result = tempPath("hex");
    // format: newsbot-hex-<12 hex chars>
    const basename = result.split("/").pop()!;
    expect(basename).toMatch(/^newsbot-hex-[0-9a-f]{12}$/);
  });
});

describe("daysAgo", () => {
  it("returns a Date object", () => {
    expect(daysAgo(5)).toBeInstanceOf(Date);
  });

  it("returns a date in the past", () => {
    const now = new Date();
    const result = daysAgo(7);
    expect(result.getTime()).toBeLessThan(now.getTime());
  });

  it("returns approximately the correct number of days ago", () => {
    const now = new Date();
    const result = daysAgo(10);
    const diffMs = now.getTime() - result.getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);
    // Allow tolerance for execution time and DST boundary effects
    expect(diffDays).toBeGreaterThan(9.9);
    expect(diffDays).toBeLessThan(10.1);
  });

  it("daysAgo(0) is approximately now", () => {
    const now = Date.now();
    const result = daysAgo(0);
    expect(Math.abs(result.getTime() - now)).toBeLessThan(1000);
  });
});
