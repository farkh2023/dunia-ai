import { NextResponse } from "next/server";
import { createWorkflow, listWorkflows } from "@/orchestration/workflow-engine";
import { getWorkflowTemplate } from "@/orchestration/workflow-templates";
import { workflowCreateSchema, workflowTemplateCreateSchema } from "@/lib/validation";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({ workflows: await listWorkflows() });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const templatePayload = workflowTemplateCreateSchema.safeParse(body);

    if (templatePayload.success) {
      const template = getWorkflowTemplate(templatePayload.data.templateId);
      if (!template) {
        return NextResponse.json({ error: "Template introuvable." }, { status: 404 });
      }
      const workflow = await createWorkflow({
        title: template.title,
        description: template.description,
        context: templatePayload.data.context,
        steps: template.steps
      });
      return NextResponse.json({ workflow }, { status: 201 });
    }

    const payload = workflowCreateSchema.parse(body);
    const workflow = await createWorkflow(payload);
    return NextResponse.json({ workflow }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Creation du workflow impossible.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
