import { Router } from "express";
import multer from "multer";
import { nanoid } from "nanoid";
import path from "node:path";
import fs from "node:fs/promises";
import { extractText } from "../lib/parse-file.js";
import { ingestDocument, deleteDocument } from "../lib/ingest.js";
import {
  addDocument,
  getDocument,
  listDocuments,
  removeDocument,
} from "../lib/registry.js";
import { getThread } from "../lib/threads.js";

const router = Router();

const uploadsDir = path.resolve(process.cwd(), "uploads");

const upload = multer({
  dest: uploadsDir,
  limits: { fileSize: 25 * 1024 * 1024 },
});

const ALLOWED_EXTENSIONS = new Set([
  ".txt",
  ".md",
  ".markdown",
  ".pdf",
  ".docx",
  ".csv",
  ".json",
]);

router.get("/", async (req, res) => {
  const threadId = req.query.threadId;
  if (typeof threadId !== "string" || !threadId) {
    return res.status(400).json({ error: "threadId query param is required." });
  }

  try {
    await getThread(req.userId!, threadId);
  } catch {
    return res.status(404).json({ error: "Thread not found." });
  }

  const docs = await listDocuments(threadId);
  res.json({ documents: docs });
});

router.post("/upload", upload.single("file"), async (req, res) => {
  const file = req.file;
  const threadId = req.body.threadId;

  if (!file) {
    return res.status(400).json({ error: "No file was uploaded." });
  }

  const ext = path.extname(file.originalname).toLowerCase();
  if (!ALLOWED_EXTENSIONS.has(ext)) {
    await fs.unlink(file.path).catch(() => {});
    return res.status(400).json({
      error: `Unsupported file type "${ext}". Allowed: ${[...ALLOWED_EXTENSIONS].join(", ")}`,
    });
  }

  const fileId = nanoid();

  try {
    const text = await extractText(file.path, file.originalname);
    const { chunkCount } = await ingestDocument({
      fileId,
      fileName: file.originalname,
      text,
      threadId,
    });

    await addDocument({
      id: fileId,
      fileName: file.originalname,
      sizeBytes: file.size,
      chunkCount,
      uploadedAt: new Date().toISOString(),
      threadId,
    });

    res.status(201).json({
      id: fileId,
      fileName: file.originalname,
      chunkCount,
    });
  } catch (err) {
    console.error("Ingestion failed:", err);
    res.status(500).json({
      error: err instanceof Error ? err.message : "Failed to process the file.",
    });
  } finally {
    await fs.unlink(file.path).catch(() => {});
  }
});

router.delete("/:id", async (req, res) => {
  const { id } = req.params;

  const doc = await getDocument(id);
  if (!doc) {
    return res.status(404).json({ error: "Document not found." });
  }
  try {
    await getThread(req.userId!, doc.threadId);
  } catch {
    return res.status(404).json({ error: "Document not found." });
  }

  try {
    await deleteDocument(id);
    await removeDocument(id);
    res.status(204).send();
  } catch (err) {
    console.error("Delete failed:", err);
    res.status(500).json({
      error: err instanceof Error ? err.message : "Failed to delete document.",
    });
  }
});

export default router;
