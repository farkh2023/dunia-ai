import { NextResponse } from "next/server";
import { workflowTemplates } from "@/orchestration/workflow-templates";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({ templates: workflowTemplates });
}
