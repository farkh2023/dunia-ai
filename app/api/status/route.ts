import { NextResponse } from "next/server";
import { detectOllama } from "@/lib/ai";
import { memoryStats } from "@/memory/store";

export const runtime = "nodejs";

export async function GET() {
  const [ollama, stats] = await Promise.all([detectOllama(), memoryStats()]);
  return NextResponse.json({
    mode: ollama.online
      ? ollama.models.length > 0
        ? "offline-ready"
        : "ollama-online-no-models"
      : "local-minimal-or-cloud",
    ollama,
    providers: {
      openai: Boolean(process.env.OPENAI_API_KEY),
      anthropic: Boolean(process.env.ANTHROPIC_API_KEY),
      mistral: Boolean(process.env.MISTRAL_API_KEY)
    },
    stats
  });
}
