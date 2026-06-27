import { ollama } from "ai-sdk-ollama";
import { embedMany } from "ai";
import { MDocument } from "@mastra/rag";
import {
  vectorStore,
  INDEX_NAME,
  ensureIndex,
} from "../mastra/vector-store.js";

const EMBEDDING_MODEL =
  process.env.OLLAMA_EMBED_MODEL ?? "text-embedding-3-small";

export interface IngestResult {
  chunkCount: number;
}

export async function ingestDocument(params: {
  fileId: string;
  fileName: string;
  text: string;
  threadId: string;
}): Promise<IngestResult> {
  const { fileId, fileName, text, threadId } = params;

  await ensureIndex();

  const doc = MDocument.fromText(text);
  const chunks = await doc.chunk({
    strategy: "recursive",
    maxSize: 512,
    overlap: 100,
  });

  if (chunks.length === 0) {
    throw new Error("No extractable text found in this file.");
  }

  const { embeddings } = await embedMany({
    values: chunks.map((chunk) => chunk.text),
    model: ollama.embedding(EMBEDDING_MODEL),
  });

  await vectorStore.upsert({
    indexName: INDEX_NAME,
    vectors: embeddings,
    metadata: chunks.map((chunk, i) => ({
      text: chunk.text,
      fileId,
      fileName,
      chunkIndex: i,
      threadId,
    })),
  });

  return { chunkCount: chunks.length };
}

export async function deleteDocument(fileId: string): Promise<void> {
  await ensureIndex();
  await vectorStore.deleteVectors({
    indexName: INDEX_NAME,
    filter: { fileId },
  });
}
