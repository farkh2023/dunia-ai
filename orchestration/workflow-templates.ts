import type { WorkflowTemplate } from "@/orchestration/workflow-types";

export const workflowTemplates: WorkflowTemplate[] = [
  {
    id: "document-summary",
    title: "Résumer un document",
    description: "Analyse un contenu, puis produit une synthese claire et exploitable.",
    steps: [
      { agentId: "analyste", title: "Analyser le document" },
      { agentId: "redacteur", title: "Rediger la synthese" }
    ]
  },
  {
    id: "project-plan",
    title: "Créer un plan de projet",
    description: "Structure une idee en architecture, analyse les risques, puis produit un plan d'action.",
    steps: [
      { agentId: "architecte", title: "Structurer l'architecture" },
      { agentId: "analyste", title: "Analyser faisabilite et risques" },
      { agentId: "redacteur", title: "Rediger le plan final" }
    ]
  },
  {
    id: "educational-content",
    title: "Générer contenu éducatif",
    description: "Transforme un sujet en contenu pedagogique avec explication, support et accompagnement.",
    steps: [
      { agentId: "analyste", title: "Identifier les notions cles" },
      { agentId: "redacteur", title: "Produire le contenu" },
      { agentId: "coach", title: "Ajouter exercices et conseils" }
    ]
  }
];

export function getWorkflowTemplate(templateId: string): WorkflowTemplate | undefined {
  return workflowTemplates.find((template) => template.id === templateId);
}
