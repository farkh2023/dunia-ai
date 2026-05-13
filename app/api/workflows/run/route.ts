import { NextResponse } from "next/server";
import { workflowRunSchema } from "@/lib/validation";
import { runWorkflow } from "@/orchestration/workflow-runner";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const payload = workflowRunSchema.parse(await request.json());
    const workflow = await runWorkflow(payload.workflowId, {
      provider: payload.provider,
      model: payload.model
    });
    return NextResponse.json({ workflow });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Execution du workflow impossible.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
