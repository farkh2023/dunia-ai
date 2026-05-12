export type AgentId = "analyste" | "architecte" | "automatisation" | "redacteur" | "coach";

export type AgentCapability =
  | "summarize"
  | "extract"
  | "plan"
  | "roadmap"
  | "workflow"
  | "script"
  | "write"
  | "rewrite"
  | "focus"
  | "routine";

export type AgentConfig = {
  id: AgentId;
  name: string;
  description: string;
  systemPrompt: string;
  capabilities: AgentCapability[];
  preferredProvider: "ollama" | "openai" | "anthropic" | "mistral";
  model: string;
  temperature: number;
  maxTokens: number;
};
