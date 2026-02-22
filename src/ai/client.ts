import { execFile } from "node:child_process";
import { NewsbotError } from "../types.js";
import { loadConfig } from "../state/config.js";

export function getModel(): string {
  return loadConfig().model;
}

export async function ask(systemPrompt: string, userMessage: string): Promise<string> {
  const model = getModel();
  const prompt = `${systemPrompt}\n\n${userMessage}`;

  return new Promise((resolve, reject) => {
    execFile(
      "claude",
      ["-p", prompt, "--model", model, "--output-format", "text"],
      { maxBuffer: 10 * 1024 * 1024, timeout: 120_000 },
      (error, stdout, stderr) => {
        if (error) {
          reject(
            new NewsbotError(
              `Claude CLI failed: ${error.message}`,
              "Make sure 'claude' is installed and authenticated. Run: claude /doctor"
            )
          );
          return;
        }
        resolve(stdout.trim());
      }
    );
  });
}
