# Server

Express API for the Mastra RAG workspace. Handles auth, document ingestion,
the chat agent, and thread storage.

## Stack

- Express 5, with helmet, CORS, and a CSRF cookie check on every request
- Auth: email/password with bcrypt, short-lived JWT access tokens, rotating
  refresh tokens stored in Postgres
- Mastra (`@mastra/core`, `@mastra/rag`, `@mastra/memory`, `@mastra/libsql`)
  for the agent and chat memory
- Ollama (via `ai-sdk-ollama`) for chat and embedding models
- Pinecone (`@mastra/pinecone`) as the vector store
- Firecrawl for the agent's web search/crawl tool, with a domain blocklist
  and an optional Google Safe Browsing check in front of it

## Setup

```bash
cp .env.example .env
# fill in real values, see below
npm install
npm run dev
```

The server refuses to start if `PINECONE_API_KEY`, `JWT_ACCESS_SECRET`, or
`JWT_REFRESH_SECRET` are missing. `OLLAMA_API_KEY` is recommended but only
warns if absent.

## Environment variables

| Variable | Purpose |
|---|---|
| `OLLAMA_API_KEY` | Auth for your Ollama endpoint |
| `OLLAMA_MODEL` | Chat model name (e.g. `qwen3.5:4b`) |
| `OLLAMA_EMBED_MODEL` | Embedding model name (e.g. `nomic-embed-text:latest`) |
| `PINECONE_API_KEY` | Pinecone account key, used to create/query the vector index |
| `JWT_ACCESS_SECRET` | Signs access tokens |
| `JWT_REFRESH_SECRET` | Signs refresh tokens |
| `CLIENT_ORIGIN` | Allowed CORS origin for the frontend |
| `NODE_ENV` | `development` or `production` |
| `DATABASE_URL` | Postgres connection string for users/refresh tokens |
| `FIRECRAWL_API_KEY` | Enables the web search/crawl tool |
| `GOOGLE_SAFE_BROWSING_API_KEY` | Optional extra check before crawling a URL |
| `PORT` | Defaults to `4000` |

Generate the JWT secrets with something like `openssl rand -base64 48` —
don't reuse the values from any example or template.

## Layout

```
src/
  index.ts            app wiring, middleware, startup
  routes/
    auth.ts           signup / signin / refresh / signout / me
    documents.ts       upload, list, delete documents (per thread)
    chat.ts            SSE streaming chat endpoint
    threads.ts          thread CRUD
  mastra/
    agent.ts           the RAG agent + its tools
    vector-store.ts     Pinecone index setup
    system-prompt.ts    agent instructions
  lib/
    ingest.ts           chunk -> embed -> upsert pipeline
    parse-file.ts        file -> plain text extraction
    registry.ts          document metadata (per thread)
    threads.ts            thread + chat history storage
    users.ts / tokens.ts / auth-db.ts / auth-cookies.ts   auth internals
  tools/
    crawler.ts            Firecrawl search/crawl tool + URL safety checks
  middleware/
    require-auth.ts        attaches req.userId or rejects
    csrf.ts                 double-submit CSRF cookie check
```

## Notes

- Uploaded files go to `uploads/`, document metadata to `data/documents.json`,
  and agent/thread memory to `data/mastra.db` (LibSQL) — all git-ignored,
  none of it should end up in version control.
- Supported uploads: `.txt`, `.md`, `.pdf`, `.docx`, `.csv`, `.json`, capped
  at 25 MB.
- The crawler tool has a hardcoded blocklist for adult/streaming/social
  domains regardless of what the Safe Browsing key says.
