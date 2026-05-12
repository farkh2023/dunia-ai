import { prisma } from "../lib/prisma";

async function main() {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const messages = await prisma.message.findMany({
    where: { createdAt: { gte: since } },
    include: { conversation: true },
    orderBy: { createdAt: "asc" }
  });

  const content =
    messages.length === 0
      ? "Aucune activite conversationnelle sur les dernieres 24 heures."
      : messages.map((m) => `- [${m.conversation.agentId}] ${m.role}: ${m.content.slice(0, 220)}`).join("\n");

  await prisma.automationRun.create({
    data: {
      type: "daily-summary",
      status: "completed",
      payload: JSON.stringify({ since, messages: messages.length, content })
    }
  });

  console.log(content);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
