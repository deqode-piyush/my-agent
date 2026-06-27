import { PineconeVector } from "@mastra/pinecone";
import path from "node:path";
import fs from "node:fs";

const dataDir = path.resolve(process.cwd(), "data");
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

export const INDEX_NAME = "mastra-rag-app";
export const EMBEDDING_DIMENSION = 768;
const PINECONE_API_KEY = process.env.PINECONE_API_KEY;

if (!PINECONE_API_KEY) {
  throw new Error(
    "PINECONE_API_KEY is not set. Add it to server/.env (get one at https://app.pinecone.io).",
  );
}

export const vectorStore = new PineconeVector({
  id: "mastra-rag-app",
  apiKey: PINECONE_API_KEY,
});

let indexReady: Promise<void> | null = null;

export async function ensureIndex(): Promise<void> {
  if (!indexReady) {
    indexReady = (async () => {
      const existing = await vectorStore.listIndexes();
      if (!existing.includes(INDEX_NAME)) {
        await vectorStore.createIndex({
          indexName: INDEX_NAME,
          dimension: EMBEDDING_DIMENSION,
          metric: "cosine",
        });
      }
    })();
  }
  return indexReady;
}
