# Cortex

A self-hosted document chat app. Upload files, the server chunks and embeds them,
and you can ask questions that get answered from the content you uploaded — not
from the model's general knowledge.

It's built on [Mastra](https://mastra.ai) for the agent/RAG plumbing, Ollama for
local chat + embedding inference, Pinecone for the vector index, and a small
Express API in front of it. The client is a plain React + Vite app.

## What's in here

- `server/` — Express API, auth (JWT + refresh token rotation), document
  ingestion, the RAG agent, and a web-search/crawl tool built on Firecrawl
- `client/` — React frontend: sign in/up, document ledger, threaded chat

Each folder has its own README with setup details specific to it.

## How it fits together

```
client (Vite, :5173) --/api proxy--> server (Express, :4000)
                                         |
                          +--------------+--------------+
                          |              |               |
                    Ollama (chat +   Pinecone        Postgres
                    embeddings)      (vectors)      (users/auth)
```

Documents go through `parse-file -> chunk -> embed -> upsert into Pinecone`.
Chat requests go through the Mastra agent, which calls a vector query tool to
pull relevant chunks before answering, and can also reach out to the web via
Firecrawl when a question needs something the uploaded docs don't cover.

Threads and chat memory are persisted in LibSQL (`server/data/mastra.db`);
user accounts and refresh tokens live in Postgres.

## Running it locally

You'll need Node 20+, a running Postgres instance, a Pinecone account, an
Ollama install (or compatible endpoint) with the models you want pulled, and
optionally a Firecrawl key and a Google Safe Browsing key if you want the web
tools to do anything beyond domain blocking.

```bash
npm run install:all   # installs server + client deps
npm run dev            # runs both with concurrently
```

Server comes up on `http://localhost:4000`, client on `http://localhost:5173`.
See `server/README.md` for the environment variables you need to set before
either of these will actually work.
