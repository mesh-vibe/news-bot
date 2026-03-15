import { execSync } from "node:child_process";

export function emitEvent(event: string, data?: Record<string, unknown>): void {
  const args = ["eventlog", "emit", JSON.stringify(event), "-s", "news-bot"];

  if (data) {
    args.push("-d", JSON.stringify(JSON.stringify(data)));
  }

  try {
    execSync(args.join(" "), { stdio: "pipe" });
  } catch {
    // fire-and-forget: eventlog may not be available
  }
}
