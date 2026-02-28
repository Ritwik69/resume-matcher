/**
 * Anthropic SDK client.
 * Always used server-side only — never import in Client Components.
 */
import Anthropic from "@anthropic-ai/sdk";

// Singleton instance reused across requests in the same lambda warm start
export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

// Model used throughout the app (as specified in CLAUDE.md)
export const CLAUDE_MODEL = "claude-sonnet-4-6" as const;
