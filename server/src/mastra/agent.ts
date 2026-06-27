import "dotenv/config";
import { ollama } from "ai-sdk-ollama";

import { Agent } from "@mastra/core/agent";
import { Mastra } from "@mastra/core";
import { LibSQLStore } from "@mastra/libsql";
import { Memory } from "@mastra/memory";
import { createVectorQueryTool } from "@mastra/rag";

import { vectorStore, INDEX_NAME } from "./vector-store.js";
import { firecrawlCrawl, firecrawlSearch } from "../tools/crawler.js";
import { systemPrompt } from "./system-prompt.js";

export const CHAT_MODEL = process.env.OLLAMA_MODEL ?? "gpt-4o-mini";
const EMBEDDING_MODEL =
  process.env.OLLAMA_EMBED_MODEL ?? "text-embedding-3-small";

export const storage = new LibSQLStore({
  id: "mastra-storage",
  url: "file:./data/mastra.db",
});

export const memory = new Memory({ storage });

export const vectorQueryTool = createVectorQueryTool({
  vectorStoreName: "ragVectorStore",
  indexName: INDEX_NAME,
  model: ollama.embedding(EMBEDDING_MODEL),
  enableFilter: true,
});

export const ragAgent = new Agent({
  id: "mastra-rag-agent",
  name: "RAG Agent",
  instructions: systemPrompt,

  model: ollama(CHAT_MODEL),
  tools: { vectorQueryTool, firecrawlSearch, firecrawlCrawl },
  memory,
});

export const mastra = new Mastra({
  agents: { ragAgent },
  vectors: { ragVectorStore: vectorStore },
  storage,
});
