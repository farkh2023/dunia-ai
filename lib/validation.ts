import { z } from "zod";

export const chatMessageSchema = z.object({
  role: z.enum(["user", "assistant", "system"]),
  content: z.string().min(1).max(30000)
});

export const chatRequestSchema = z.object({
  conversationId: z.string().optional(),
  message: z.string().min(1).max(30000),
  agentId: z.string().default("analyste"),
  provider: z.enum(["auto", "ollama", "openai", "anthropic", "mistral", "local"]).default("auto"),
  model: z.string().optional(),
  attachments: z
    .array(
      z.object({
        name: z.string(),
        content: z.string().max(100000)
      })
    )
    .default([])
});

export const exportRequestSchema = z.object({
  conversationId: z.string(),
  format: z.enum(["markdown", "pdf", "json"])
});

export const memorySearchSchema = z.object({
  q: z.string().optional(),
  tag: z.string().optional()
});
