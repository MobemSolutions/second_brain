import { pipeline } from "@xenova/transformers";
import type { Db } from "./db";

// Fully local semantic layer: runs entirely in the Node process via
// transformers.js (ONNX runtime), no network call after the model's first
// download — matches the "100% local" choice for this app's AI features.
// Never called for psy_* content: an embedding is a lossy-but-real
// derivative of the text, and the whole point of encrypting Psy TCC is to
// not have plaintext-adjacent artifacts sitting in the DB.
// `pipeline`'s return type is a huge task-name-keyed overload union that TS
// can't narrow back down after `await` — casting to this narrow shape (the
// only part of the API this file actually uses) sidesteps that entirely.
interface FeatureExtractor {
  (text: string, options: { pooling: "mean"; normalize: boolean }): Promise<{ data: Float32Array | number[] }>;
}

let extractorPromise: Promise<FeatureExtractor> | null = null;

function getExtractor(): Promise<FeatureExtractor> {
  if (!extractorPromise) {
    extractorPromise = pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2") as unknown as Promise<FeatureExtractor>;
  }
  return extractorPromise;
}

export async function embed(text: string): Promise<Float32Array> {
  const extractor = await getExtractor();
  const output = await extractor(text, { pooling: "mean", normalize: true });
  return Float32Array.from(output.data as ArrayLike<number>);
}

export function cosineSimilarity(a: Float32Array, b: Float32Array): number {
  let dot = 0, na = 0, nb = 0;
  const len = Math.min(a.length, b.length);
  for (let i = 0; i < len; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

export function vectorToBlob(vec: Float32Array): Buffer {
  return Buffer.from(vec.buffer, vec.byteOffset, vec.byteLength);
}

export function blobToVector(blob: ArrayBuffer | Uint8Array): Float32Array {
  const bytes = blob instanceof Uint8Array ? blob : new Uint8Array(blob);
  return new Float32Array(bytes.buffer, bytes.byteOffset, bytes.byteLength / 4);
}

// Best-effort: a suggestion feature failing to compute (e.g. first-run model
// download blocked by no network) must never break note/inbox creation.
export async function upsertEmbedding(db: Db, entityType: string, entityId: number, text: string): Promise<void> {
  if (!text.trim()) return;
  try {
    const vec = await embed(text);
    await db
      .prepare(
        `INSERT INTO embeddings (entity_type, entity_id, vector, updated_at) VALUES (?, ?, ?, datetime('now','localtime'))
         ON CONFLICT(entity_type, entity_id) DO UPDATE SET vector = excluded.vector, updated_at = excluded.updated_at`
      )
      .run(entityType, entityId, vectorToBlob(vec));
  } catch (err) {
    console.error(`upsertEmbedding failed for ${entityType}#${entityId}:`, err);
  }
}

// Ad-hoc semantic query (e.g. universal search) rather than similarity to an
// existing stored entity — embeds `text` on the fly and compares it to every
// stored vector of `entityType`.
export async function findSimilarByText(
  db: Db, entityType: string, text: string, limit = 5
): Promise<{ entity_id: number; score: number }[]> {
  const rows = (await db
    .prepare("SELECT entity_id, vector FROM embeddings WHERE entity_type = ?")
    .all(entityType)) as unknown as { entity_id: number; vector: ArrayBuffer | Uint8Array }[];
  if (!rows.length) return [];

  const queryVec = await embed(text);
  const scored = rows.map((r) => ({ entity_id: r.entity_id, score: cosineSimilarity(queryVec, blobToVector(r.vector)) }));
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit);
}

export async function findSimilar(
  db: Db, entityType: string, entityId: number, limit = 5
): Promise<{ entity_type: string; entity_id: number; score: number }[]> {
  const target = (await db
    .prepare("SELECT vector FROM embeddings WHERE entity_type = ? AND entity_id = ?")
    .get(entityType, entityId)) as { vector: ArrayBuffer | Uint8Array } | undefined;
  if (!target) return [];
  const targetVec = blobToVector(target.vector);

  const rows = (await db
    .prepare("SELECT entity_type, entity_id, vector FROM embeddings WHERE NOT (entity_type = ? AND entity_id = ?)")
    .all(entityType, entityId)) as unknown as { entity_type: string; entity_id: number; vector: ArrayBuffer | Uint8Array }[];

  const scored = rows.map((r) => ({
    entity_type: r.entity_type,
    entity_id: r.entity_id,
    score: cosineSimilarity(targetVec, blobToVector(r.vector)),
  }));
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit);
}
