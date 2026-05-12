import { jsPDF } from "jspdf";
import type { getConversation } from "@/memory/store";

type ConversationExport = NonNullable<Awaited<ReturnType<typeof getConversation>>>;

export function toMarkdown(conversation: ConversationExport): string {
  const lines = [
    `# ${conversation.title}`,
    "",
    `- Date: ${conversation.createdAt.toISOString()}`,
    `- Agent: ${conversation.agentId}`,
    `- Provider: ${conversation.provider}`,
    `- Modele: ${conversation.model}`,
    "",
    "## Conversation",
    ""
  ];

  for (const message of conversation.messages) {
    lines.push(`### ${message.role}`, "", message.content, "");
  }

  return lines.join("\n");
}

export function toJson(conversation: ConversationExport): string {
  return JSON.stringify(
    {
      id: conversation.id,
      title: conversation.title,
      agentId: conversation.agentId,
      provider: conversation.provider,
      model: conversation.model,
      createdAt: conversation.createdAt,
      updatedAt: conversation.updatedAt,
      messages: conversation.messages
    },
    null,
    2
  );
}

export function toPdf(conversation: ConversationExport): Uint8Array {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const margin = 44;
  let y = margin;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text(conversation.title, margin, y);
  y += 26;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`Date: ${conversation.createdAt.toISOString()}`, margin, y);
  y += 14;
  doc.text(`Agent: ${conversation.agentId} | Provider: ${conversation.provider} | Modele: ${conversation.model}`, margin, y);
  y += 28;

  for (const message of conversation.messages) {
    if (y > 760) {
      doc.addPage();
      y = margin;
    }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text(message.role.toUpperCase(), margin, y);
    y += 16;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    const chunks = doc.splitTextToSize(message.content, 500) as string[];
    for (const chunk of chunks) {
      if (y > 780) {
        doc.addPage();
        y = margin;
      }
      doc.text(chunk, margin, y);
      y += 13;
    }
    y += 12;
  }

  return new Uint8Array(doc.output("arraybuffer"));
}
