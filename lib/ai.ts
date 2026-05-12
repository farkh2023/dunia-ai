import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { getAgent } from "@/agents";
import type { AgentConfig } from "@/agents/types";

export type AiProvider = "ollama" | "openai" | "anthropic" | "mistral" | "local";

export type AiMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type CompletionInput = {
  agentId: string;
  provider: AiProvider | "auto";
  model?: string;
  messages: AiMessage[];
};

export type CompletionOutput = {
  content: string;
  provider: AiProvider;
  model: string;
  offline: boolean;
};

export async function detectOllama(): Promise<{ online: boolean; models: string[] }> {
  const baseUrl = process.env.OLLAMA_BASE_URL ?? "http://localhost:11434";
  try {
    const response = await fetch(`${baseUrl}/api/tags`, { cache: "no-store" });
    if (!response.ok) {
      return { online: false, models: [] };
    }
    const data = (await response.json()) as { models?: Array<{ name?: string }> };
    return {
      online: true,
      models: data.models?.map((model) => model.name).filter((name): name is string => Boolean(name)) ?? []
    };
  } catch {
    return { online: false, models: [] };
  }
}

export async function completeWithAgent(input: CompletionInput): Promise<CompletionOutput> {
  const agent = getAgent(input.agentId);
  const provider = await resolveProvider(input.provider);
  const model = input.model ?? modelFor(provider, agent);
  const messages: AiMessage[] = [{ role: "system", content: agent.systemPrompt }, ...input.messages];

  if (provider === "openai") {
    return completeOpenAI(messages, model, agent);
  }
  if (provider === "anthropic") {
    return completeAnthropic(messages, model, agent);
  }
  if (provider === "mistral") {
    return completeMistral(messages, model, agent);
  }
  if (provider === "local") {
    return completeLocal(messages, model, agent);
  }
  return completeOllama(messages, model, agent);
}

async function resolveProvider(requested: CompletionInput["provider"]): Promise<AiProvider> {
  if (requested !== "auto") {
    return requested;
  }

  const ollama = await detectOllama();
  if (ollama.online && ollama.models.length > 0) {
    return "ollama";
  }
  if (process.env.OPENAI_API_KEY) {
    return "openai";
  }
  if (process.env.ANTHROPIC_API_KEY) {
    return "anthropic";
  }
  if (process.env.MISTRAL_API_KEY) {
    return "mistral";
  }
  return "local";
}

function modelFor(provider: AiProvider, agent: AgentConfig): string {
  if (provider === "openai") return process.env.OPENAI_MODEL ?? "gpt-4o-mini";
  if (provider === "anthropic") return process.env.ANTHROPIC_MODEL ?? "claude-3-5-sonnet-latest";
  if (provider === "mistral") return process.env.MISTRAL_MODEL ?? "mistral-large-latest";
  if (provider === "local") return "dunia-local";
  return agent.model || process.env.OLLAMA_DEFAULT_MODEL || "llama3";
}

function completeLocal(messages: AiMessage[], model: string, agent: AgentConfig): CompletionOutput {
  const latest = [...messages].reverse().find((message) => message.role === "user")?.content ?? "";
  const capabilities = agent.capabilities.join(", ");
  return {
    content: [
      `Mode local minimal actif pour l'agent ${agent.name}.`,
      "",
      "Aucun modele Ollama installe et aucune cle API cloud n'est configuree. La memoire SQLite, les exports et l'interface restent operationnels.",
      "",
      "Synthese de votre demande:",
      latest.slice(0, 1200) || "Demande vide.",
      "",
      `Capacites de cet agent: ${capabilities}.`,
      "",
      "Pour activer une generation IA complete: installez un modele avec `ollama pull llama3` ou configurez une cle API dans `.env`."
    ].join("\n"),
    provider: "local",
    model,
    offline: true
  };
}

async function completeOpenAI(
  messages: AiMessage[],
  model: string,
  agent: AgentConfig
): Promise<CompletionOutput> {
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const result = await client.chat.completions.create({
    model,
    temperature: agent.temperature,
    max_tokens: agent.maxTokens,
    messages
  });

  return {
    content: result.choices[0]?.message.content ?? "Je n'ai pas pu generer de reponse.",
    provider: "openai",
    model,
    offline: false
  };
}

async function completeAnthropic(
  messages: AiMessage[],
  model: string,
  agent: AgentConfig
): Promise<CompletionOutput> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const system = messages.find((message) => message.role === "system")?.content;
  const result = await client.messages.create({
    model,
    max_tokens: agent.maxTokens,
    temperature: agent.temperature,
    system,
    messages: messages
      .filter((message) => message.role !== "system")
      .map((message) => ({
        role: message.role === "assistant" ? "assistant" : "user",
        content: message.content
      }))
  });
  const text = result.content
    .map((block) => (block.type === "text" ? block.text : ""))
    .join("\n")
    .trim();

  return { content: text || "Je n'ai pas pu generer de reponse.", provider: "anthropic", model, offline: false };
}

async function completeMistral(
  messages: AiMessage[],
  model: string,
  agent: AgentConfig
): Promise<CompletionOutput> {
  const response = await fetch("https://api.mistral.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.MISTRAL_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ model, messages, temperature: agent.temperature, max_tokens: agent.maxTokens })
  });
  if (!response.ok) {
    throw new Error(`Mistral API error: ${response.status}`);
  }
  const data = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
  return {
    content: data.choices?.[0]?.message?.content ?? "Je n'ai pas pu generer de reponse.",
    provider: "mistral",
    model,
    offline: false
  };
}

async function completeOllama(
  messages: AiMessage[],
  model: string,
  agent: AgentConfig
): Promise<CompletionOutput> {
  const baseUrl = process.env.OLLAMA_BASE_URL ?? "http://localhost:11434";
  const response = await fetch(`${baseUrl}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      messages,
      stream: false,
      options: {
        temperature: agent.temperature,
        num_predict: agent.maxTokens
      }
    })
  });
  if (!response.ok) {
    throw new Error(`Ollama indisponible pour le modele ${model}. Verifiez le service local.`);
  }
  const data = (await response.json()) as { message?: { content?: string } };
  return {
    content: data.message?.content ?? "Je n'ai pas pu generer de reponse locale.",
    provider: "ollama",
    model,
    offline: true
  };
}
