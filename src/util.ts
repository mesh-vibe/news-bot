import { writeFileSync, mkdirSync, renameSync } from "node:fs";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";
import { randomBytes } from "node:crypto";

export function log(message: string): void {
  console.log(`  ${message}`);
}

export function logHeader(message: string): void {
  console.log(`\n${message}`);
}

export function logError(message: string, hint?: string): void {
  console.error(`Error: ${message}`);
  if (hint) {
    console.error(`  Hint: ${hint}`);
  }
}

export function formatDate(date: Date): string {
  return date.toISOString().split("T")[0]!;
}

export function formatDateTime(date: Date): string {
  return date.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function atomicWrite(filePath: string, content: string): void {
  const dir = dirname(filePath);
  mkdirSync(dir, { recursive: true });
  const tmpPath = join(dir, `.tmp-${randomBytes(6).toString("hex")}`);
  writeFileSync(tmpPath, content, "utf-8");
  renameSync(tmpPath, filePath);
}

export function tempPath(prefix: string): string {
  return join(tmpdir(), `newsbot-${prefix}-${randomBytes(6).toString("hex")}`);
}

export function extractDomain(url: string): string {
  try {
    const parsed = new URL(url);
    return parsed.hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength - 1) + "…";
}

export function daysAgo(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d;
}
