import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import authRouter from "./routes/auth.js";
import documentsRouter from "./routes/documents.js";
import chatRouter from "./routes/chat.js";
import threadsRouter from "./routes/threads.js";
import { ensureIndex } from "./mastra/vector-store.js";
import { migrateAuthDb } from "./lib/auth-db.js";
import { requireAuth } from "./middleware/require-auth.js";
import { ensureCsrfCookie, verifyCsrf } from "./middleware/csrf.js";

const app = express();
const PORT = Number(process.env.PORT ?? 4000);
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN ?? "http://localhost:5173";

if (!process.env.OLLAMA_API_KEY) {
  console.warn(
    "\n⚠️  OLLAMA_API_KEY is not set. Copy server/.env.example to server/.env and add your key.\n",
  );
}

app.set("trust proxy", 1);
app.use(helmet());
app.use(cors({ origin: CLIENT_ORIGIN, credentials: true }));
app.use(express.json({ limit: "2mb" }));
app.use(cookieParser());
app.use(ensureCsrfCookie);
app.use(verifyCsrf);

app.get("/api/health", (_req, res) => res.json({ ok: true }));

app.use("/api/auth", authRouter);
app.use("/api/documents", requireAuth, documentsRouter);
app.use("/api/chat", requireAuth, chatRouter);
app.use("/api/threads", requireAuth, threadsRouter);

app.use(
  (
    err: unknown,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction,
  ) => {
    console.error(err);
    res.status(500).json({ error: "Internal server error." });
  },
);

Promise.all([ensureIndex(), migrateAuthDb()])
  .then(() => {
    app.listen(PORT, () => {
      console.log(`✅ RAG server ready at http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error("Failed to initialize server:", err);
    process.exit(1);
  });
