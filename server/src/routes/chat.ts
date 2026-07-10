import { Router } from "express";
import { z } from "zod";
import { ragAgent } from "../mastra/agent.js";
import { createThread, ensureThreadTitle, findThread } from "../lib/threads.js";

const router = Router();

const chatRequestSchema = z.object({
  message: z.string().min(1, "Message cannot be empty."),
  threadId: z.string().optional(),
});

const approvalRequestSchema = z.object({
  threadId: z.string().min(1, "threadId is required."),
  runId: z.string().min(1, "runId is required."),
  toolCallId: z.string().optional(),
  approved: z.boolean(),
});

type Sender = (event: string, data: unknown) => void;

async function pipeAgentStream(
  stream: any,
  send: Sender,
): Promise<{ pending: boolean }> {
  for await (const chunk of stream.fullStream) {
    if (chunk.type === "text-delta") {
      send("delta", { text: chunk.payload.text });
    } else if (chunk.type === "tool-call-approval") {
      send("approval-request", {
        runId: chunk.runId,
        toolCallId: chunk.payload.toolCallId,
        toolName: chunk.payload.toolName,
        args: chunk.payload.args,
      });
      return { pending: true };
    }
  }

  await stream.finishReason.catch(() => undefined);
  return { pending: false };
}

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

  const send: Sender = (event, data) => {
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

    const { pending } = await pipeAgentStream(stream, send);
    if (pending) return;

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

router.post("/approve", async (req, res) => {
  const parsed = approvalRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    return res
      .status(400)
      .json({ error: parsed.error.issues[0]?.message ?? "Invalid request." });
  }
  const { threadId, runId, toolCallId, approved } = parsed.data;
  const resourceId = req.userId!;

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders?.();

  const send: Sender = (event, data) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  try {
    const thread = await findThread(resourceId, threadId);
    if (!thread?.id) {
      send("error", { message: "Thread not found." });
      return;
    }

    const resumeOptions = {
      runId,
      toolCallId,
      memory: {
        thread: { id: thread.id, title: thread.title },
        resource: resourceId,
      },
    };

    const stream = approved
      ? await ragAgent.approveToolCall(resumeOptions)
      : await ragAgent.declineToolCall(resumeOptions);

    const { pending } = await pipeAgentStream(stream, send);
    if (pending) return;

    send("done", { threadId: thread.id, title: thread.title });
  } catch (err) {
    console.error("Chat approval stream failed:", err);
    send("error", {
      message: err instanceof Error ? err.message : "Something went wrong.",
    });
  } finally {
    res.end();
  }
});

export default router;
