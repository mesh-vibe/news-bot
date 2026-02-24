import Anthropic from "@anthropic-ai/sdk";
import { NewsbotError } from "../types.js";
import { loadConfig } from "../state/config.js";

const anthropic = new Anthropic();

export function getModel(): string {
  return loadConfig().model;
}

export async function ask(systemPrompt: string, userMessage: string): Promise<string> {
  const model = getModel();

  try {
    const response = await anthropic.messages.create({
      model,
      max_tokens: 8192,
      system: systemPrompt,
      messages: [{ role: "user", content: userMessage }],
    });

    const text = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === "text")
      .map((block) => block.text)
      .join("");

    return text.trim();
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    throw new NewsbotError(
      `Anthropic API failed: ${msg}`,
      "Make sure ANTHROPIC_API_KEY is set in your environment."
    );
  }
}
