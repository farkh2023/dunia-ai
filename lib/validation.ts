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

export const memoryCreateSchema = z.object({
  title: z.string().min(1).max(160),
  content: z.string().min(1).max(100000),
  source: z.string().max(300).optional(),
  tags: z.array(z.string().min(1).max(40)).default([]),
  importance: z.number().int().min(1).max(5).default(3)
});

export const documentSearchSchema = z.object({
  q: z.string().min(1).max(500),
  limit: z.coerce.number().int().min(1).max(20).default(8)
});

export const documentDeleteSchema = z.object({
  id: z.string().min(1)
});

export const documentUploadSchema = z.object({
  name: z.string().min(1).max(260),
  size: z.number().int().min(1).max(8 * 1024 * 1024),
  type: z.string().max(120)
});
