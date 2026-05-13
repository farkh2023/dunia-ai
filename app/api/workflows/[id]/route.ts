import { NextResponse } from "next/server";
import { deleteWorkflow, finalWorkflowOutput, getWorkflow } from "@/orchestration/workflow-engine";

export const runtime = "nodejs";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const workflow = await getWorkflow(id);

  if (!workflow) {
    return NextResponse.json({ error: "Workflow introuvable." }, { status: 404 });
  }

  return NextResponse.json({ workflow, finalOutput: finalWorkflowOutput(workflow) });
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  await deleteWorkflow(id);
  return NextResponse.json({ ok: true });
}
