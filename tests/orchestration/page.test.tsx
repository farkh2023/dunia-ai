import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import WorkflowsPage from "@/app/workflows/page";

const workflow = {
  id: "wf1",
  title: "Résumer un document",
  description: "Synthese",
  status: "draft",
  createdAt: "2026-05-13T00:00:00.000Z",
  updatedAt: "2026-05-13T00:00:00.000Z",
  steps: [
    {
      id: "s1",
      agentId: "analyste",
      order: 0,
      title: "Analyser",
      input: "Contexte",
      output: null,
      status: "draft",
      createdAt: "2026-05-13T00:00:00.000Z",
      updatedAt: "2026-05-13T00:00:00.000Z"
    }
  ]
};

const templates = [
  {
    id: "document-summary",
    title: "Résumer un document",
    description: "Synthese",
    steps: [{ agentId: "analyste", title: "Analyser" }]
  }
];

describe("workflows page", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("renders workflows and templates", async () => {
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(jsonResponse({ workflows: [workflow] }))
      .mockResolvedValueOnce(jsonResponse({ templates }));

    render(<WorkflowsPage />);

    expect(screen.getByText("Workflows Dunia AI")).toBeInTheDocument();
    expect((await screen.findAllByText("Résumer un document")).length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText("Analyser")).toBeInTheDocument();
  });

  it("creates a workflow from template", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(jsonResponse({ workflows: [] }))
      .mockResolvedValueOnce(jsonResponse({ templates }))
      .mockResolvedValueOnce(jsonResponse({ workflow }));

    render(<WorkflowsPage />);

    fireEvent.change(await screen.findByLabelText("Contexte workflow"), {
      target: { value: "Document a resumer" }
    });
    fireEvent.click(screen.getByRole("button", { name: /creer le workflow/i }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith("/api/workflows", expect.objectContaining({ method: "POST" })));
  });
});

function jsonResponse(body: unknown): Response {
  return {
    ok: true,
    json: async () => body
  } as Response;
}
