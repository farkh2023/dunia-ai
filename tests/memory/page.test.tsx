import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import MemoryPage from "@/app/memory/page";
import { validateMemoryForm } from "@/lib/memory-form";

const memoryResponse = {
  memory: [
    {
      id: "memory-1",
      title: "Preference locale",
      content: "Toujours privilegier Ollama et la memoire locale.",
      source: "note",
      tags: ["local", "ollama"],
      importance: 4,
      createdAt: "2026-05-13T00:00:00.000Z",
      updatedAt: "2026-05-13T00:00:00.000Z",
      chunks: [{ id: "chunk-1", content: "Ollama local", index: 0, createdAt: "2026-05-13T00:00:00.000Z" }],
      score: 0.72
    }
  ]
};

describe("memory page", () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.restoreAllMocks();
  });

  it("renders indexed memory items", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(jsonResponse(memoryResponse));

    render(<MemoryPage />);

    expect(screen.getByText("Mémoire Dunia AI")).toBeInTheDocument();
    expect(screen.getByText("Chargement de la memoire locale...")).toBeInTheDocument();
    expect(await screen.findByText("Preference locale")).toBeInTheDocument();
    expect(screen.getByText("1 fragments")).toBeInTheDocument();
  });

  it("validates the manual memory form", () => {
    expect(validateMemoryForm({ title: "", content: "contenu assez long", source: "", tags: "", importance: "3" })).toBe(
      "Le titre est obligatoire."
    );
    expect(validateMemoryForm({ title: "Note", content: "court", source: "", tags: "", importance: "3" })).toBe(
      "Le contenu doit etre plus descriptif."
    );
    expect(validateMemoryForm({ title: "Note", content: "contenu local important", source: "", tags: "", importance: "3" })).toBeNull();
  });

  it("calls the memory search endpoint", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(jsonResponse({ memory: [] }))
      .mockResolvedValueOnce(jsonResponse(memoryResponse));

    render(<MemoryPage />);

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith("/api/memory"));
    fireEvent.change(screen.getByLabelText("Recherche memoire"), { target: { value: "ollama" } });
    fireEvent.click(screen.getByRole("button", { name: /rechercher/i }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith("/api/memory?q=ollama"));
  });
});

function jsonResponse(body: unknown): Response {
  return {
    ok: true,
    json: async () => body
  } as Response;
}
