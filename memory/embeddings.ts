const VECTOR_SIZE = 128;

export type EmbeddingVector = number[];

export function embedText(text: string): EmbeddingVector {
  const vector = Array.from({ length: VECTOR_SIZE }, () => 0);
  const tokens = tokenize(text);

  for (const token of tokens) {
    const hash = hashToken(token);
    const index = Math.abs(hash) % VECTOR_SIZE;
    vector[index] += hash >= 0 ? 1 : -1;
  }

  return normalizeVector(vector);
}

export function serializeEmbedding(vector: EmbeddingVector): string {
  return JSON.stringify(vector);
}

export function parseEmbedding(value: string): EmbeddingVector {
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.filter((item): item is number => typeof item === "number" && Number.isFinite(item));
  } catch {
    return [];
  }
}

export function cosineSimilarity(left: EmbeddingVector, right: EmbeddingVector): number {
  if (!left.length || left.length !== right.length) {
    return 0;
  }

  let dot = 0;
  let leftNorm = 0;
  let rightNorm = 0;

  for (let index = 0; index < left.length; index += 1) {
    dot += left[index] * right[index];
    leftNorm += left[index] ** 2;
    rightNorm += right[index] ** 2;
  }

  if (!leftNorm || !rightNorm) {
    return 0;
  }

  return dot / (Math.sqrt(leftNorm) * Math.sqrt(rightNorm));
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length > 2);
}

function hashToken(token: string): number {
  let hash = 0x811c9dc5;

  for (let index = 0; index < token.length; index += 1) {
    hash ^= token.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }

  return hash | 0;
}

function normalizeVector(vector: EmbeddingVector): EmbeddingVector {
  const norm = Math.sqrt(vector.reduce((sum, value) => sum + value ** 2, 0));
  if (!norm) {
    return vector;
  }
  return vector.map((value) => Number((value / norm).toFixed(6)));
}
