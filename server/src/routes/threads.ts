import { Router } from "express";
import {
  listThreads,
  createThread,
  getThread,
  getThreadMessages,
  deleteThread,
} from "../lib/threads.js";

const router = Router();

router.get("/", async (req, res) => {
  try {
    const threads = await listThreads(req.userId!);
    res.json({ threads });
  } catch (err) {
    res.status(500).json({
      error:
        err instanceof Error ? err.message : "Failed to fetch all threads.",
    });
  }
});

router.post("/", async (req, res) => {
  try {
    const thread = await createThread(req.userId!);
    res.json({ thread });
  } catch (err) {
    res.status(500).json({
      error:
        err instanceof Error ? err.message : "Failed to create new thread.",
    });
  }
});

router.get("/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const thread = await getThread(req.userId!, id);
    res.json({ thread });
  } catch (err) {
    res.status(404).json({
      error: err instanceof Error ? err.message : "Thread not found.",
    });
  }
});

router.get("/:id/messages", async (req, res) => {
  const { id } = req.params;
  try {
    const messages = await getThreadMessages(req.userId!, id);
    res.json({ messages });
  } catch (err) {
    res.status(404).json({
      error:
        err instanceof Error ? err.message : "Failed to load thread messages.",
    });
  }
});

router.delete("/:id", async (req, res) => {
  const { id } = req.params;
  try {
    await deleteThread(req.userId!, id);
    res.status(204).send();
  } catch (err) {
    res.status(404).json({
      error: err instanceof Error ? err.message : "Failed to delete thread.",
    });
  }
});

export default router;
