export type MemoryChunkInput = {
  content: string;
  index: number;
};

export type ChunkOptions = {
  maxChars?: number;
  overlapChars?: number;
};

const DEFAULT_MAX_CHARS = 900;
const DEFAULT_OVERLAP_CHARS = 120;

export function chunkText(text: string, options: ChunkOptions = {}): MemoryChunkInput[] {
  const maxChars = Math.max(options.maxChars ?? DEFAULT_MAX_CHARS, 200);
  const overlapChars = Math.min(options.overlapChars ?? DEFAULT_OVERLAP_CHARS, Math.floor(maxChars / 3));
  const normalized = normalizeText(text);

  if (!normalized) {
    return [];
  }

  const chunks: string[] = [];
  let cursor = 0;

  while (cursor < normalized.length) {
    const end = Math.min(cursor + maxChars, normalized.length);
    const boundary = findBoundary(normalized, cursor, end);
    const content = normalized.slice(cursor, boundary).trim();

    if (content) {
      chunks.push(content);
    }

    if (boundary >= normalized.length) {
      break;
    }

    cursor = Math.max(boundary - overlapChars, cursor + 1);
  }

  return chunks.map((content, index) => ({ content, index }));
}

function normalizeText(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function findBoundary(text: string, start: number, hardEnd: number): number {
  if (hardEnd >= text.length) {
    return text.length;
  }

  const window = text.slice(start, hardEnd);
  const sentenceBoundary = Math.max(window.lastIndexOf(". "), window.lastIndexOf("? "), window.lastIndexOf("! "));
  if (sentenceBoundary > Math.floor(window.length * 0.55)) {
    return start + sentenceBoundary + 1;
  }

  const spaceBoundary = window.lastIndexOf(" ");
  if (spaceBoundary > Math.floor(window.length * 0.55)) {
    return start + spaceBoundary;
  }

  return hardEnd;
}
