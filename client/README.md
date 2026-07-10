# Client

React frontend for Cortex — sign in/up, upload documents, chat against them
in threaded conversations.

## Stack

React 19, Vite, Tailwind, `react-router` for routing, `react-markdown` for
rendering streamed agent responses.

## Setup

```bash
npm install
npm run dev
```

Runs on `http://localhost:5173`. `vite.config.ts` proxies `/api` to the
server at `http://localhost:4000`, so the server needs to be running too —
see `../server/README.md`.

There's no separate `.env` for the client; it talks to whatever the dev
server proxies to (or whatever `/api` resolves to in production).

## Layout

```
src/
  App.tsx                 routes: /signin, /signup, /:threadId?
  Workspace.tsx            main authenticated layout (ledger + chat)
  components/
    SignIn.tsx / SignUp.tsx
    DocumentLedger.tsx      upload + manage files for the active thread
    ChatPanel.tsx            streaming chat UI
    ThreadPanel.tsx          thread list / switcher
  context/
    AuthContext.tsx          current user + auth actions
  middleware/
    RequireAuth.tsx           route guard, redirects to /signin
  api/
    http.ts                   fetch wrapper (cookies, CSRF header, refresh)
    auth.ts / chat.ts / document.ts / threads.ts
  types/                      shared response/request types
```

## Build

```bash
npm run build      # tsc -b && vite build, output in dist/
npm run preview     # serve the production build locally
```
