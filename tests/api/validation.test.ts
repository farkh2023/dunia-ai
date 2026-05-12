import { describe, expect, it } from "vitest";
import { chatRequestSchema, exportRequestSchema } from "@/lib/validation";

describe("api validation", () => {
  it("accepts a minimal chat request", () => {
    const payload = chatRequestSchema.parse({ message: "Bonjour", agentId: "coach" });
    expect(payload.provider).toBe("auto");
    expect(payload.attachments).toEqual([]);
  });

  it("accepts the local fallback provider", () => {
    const payload = chatRequestSchema.parse({ message: "Bonjour", provider: "local" });
    expect(payload.provider).toBe("local");
  });

  it("rejects invalid export formats", () => {
    expect(() => exportRequestSchema.parse({ conversationId: "c1", format: "docx" })).toThrow();
  });
});
