import { Router } from "express";
import { z } from "zod";
import { ragAgent } from "../mastra/agent.js";
import { createThread, ensureThreadTitle, findThread } from "../lib/threads.js";

const router = Router();

const chatRequestSchema = z.object({
  message: z.string().min(1, "Message cannot be empty."),
  threadId: z.string().optional(),
});

router.post("/", async (req, res) => {
  const parsed = chatRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    return res
      .status(400)
      .json({ error: parsed.error.issues[0]?.message ?? "Invalid request." });
  }
  const { message, threadId } = parsed.data;
  const resourceId = req.userId!;

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders?.();

  const send = (event: string, data: unknown) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  try {
    const thread =
      (threadId && (await findThread(resourceId, threadId))) ||
      (await createThread(resourceId));

    if (!thread?.id) {
      send("error", {
        message: "Could not create or resume the conversation thread.",
      });
      return;
    }

    send("thread", { threadId: thread.id, title: thread.title });

    const stream = await ragAgent.stream(
      [
        {
          role: "system",
          content: `The active threadId for this conversation is "${thread.id}".`,
        },
        { role: "user", content: message },
      ],
      {
        memory: {
          thread: { id: thread.id, title: thread.title },
          resource: resourceId,
        },
      },
    );

    for await (const chunk of stream.textStream) {
      send("delta", { text: chunk });
    }

    await stream.finishReason.catch(() => undefined);

    const finalThread = await ensureThreadTitle(resourceId, thread.id, message);

    send("done", {
      threadId: thread.id,
      title: finalThread?.title || thread.title,
    });
  } catch (err) {
    console.error("Chat stream failed:", err);
    send("error", {
      message: err instanceof Error ? err.message : "Something went wrong.",
    });
  } finally {
    res.end();
  }
});

export default router;
