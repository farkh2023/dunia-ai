import { analysteAgent } from "./analyste";
import { architecteAgent } from "./architecte";
import { automatisationAgent } from "./automatisation";
import { coachAgent } from "./coach";
import { redacteurAgent } from "./redacteur";
import type { AgentConfig, AgentId } from "./types";

export const agents: Record<AgentId, AgentConfig> = {
  analyste: analysteAgent,
  architecte: architecteAgent,
  automatisation: automatisationAgent,
  redacteur: redacteurAgent,
  coach: coachAgent
};

export const agentList = Object.values(agents);

export function getAgent(agentId: string | undefined): AgentConfig {
  if (agentId && agentId in agents) {
    return agents[agentId as AgentId];
  }

  return agents.analyste;
}
