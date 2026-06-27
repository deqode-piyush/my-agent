import { generateText } from "ai";
import { ollama } from "ai-sdk-ollama";
import { CHAT_MODEL, ragAgent } from "../mastra/agent.js";

const TITLE_INSTRUCTIONS = `Generate a short title summarizing the user's message below.

Requirements:
- Maximum 6 words
- No quotes, no punctuation, no explanation
- Output only the title text`;

async function getMemory() {
  const memory = await ragAgent.getMemory();
  if (!memory) {
    throw new Error("Agent memory is not configured.");
  }
  return memory;
}

export async function listThreads(resourceId: string) {
  const memory = await getMemory();
  return memory.listThreads({
    filter: { resourceId },
    page: 0,
    perPage: 50,
  });
}

export async function createThread(resourceId: string, title?: string) {
  const memory = await getMemory();
  return memory.createThread({ resourceId, title });
}

export async function getThread(resourceId: string, threadId: string) {
  const memory = await getMemory();
  const thread = await memory.getThreadById({ threadId });
  if (!thread || thread.resourceId !== resourceId) {
    throw new Error("Thread not found.");
  }
  return thread;
}

export async function findThread(resourceId: string, threadId: string) {
  const memory = await getMemory();
  const thread = await memory.getThreadById({ threadId });
  if (!thread || thread.resourceId !== resourceId) return null;
  return thread;
}

export async function ensureThreadTitle(
  resourceId: string,
  threadId: string,
  firstMessage: string,
) {
  const memory = await getMemory();
  const thread = await memory.getThreadById({ threadId });
  if (!thread || thread.resourceId !== resourceId || thread.title)
    return thread;

  try {
    const { text } = await generateText({
      model: ollama(CHAT_MODEL),
      system: TITLE_INSTRUCTIONS,
      prompt: firstMessage,
    });
    const title = text.replace(/<think>[\s\S]*?<\/think>/g, "").trim();
    if (!title) return thread;

    return memory.updateThread({
      id: threadId,
      title,
      metadata: thread.metadata ?? {},
    });
  } catch (err) {
    console.error("Title generation failed:", err);
    return thread;
  }
}

export async function deleteThread(resourceId: string, threadId: string) {
  const memory = await getMemory();
  const thread = await memory.getThreadById({ threadId });
  if (!thread || thread.resourceId !== resourceId) {
    throw new Error("Thread not found.");
  }
  await memory.deleteThread(threadId);
}

export async function getThreadMessages(resourceId: string, threadId: string) {
  const memory = await getMemory();
  const thread = await memory.getThreadById({ threadId });
  if (!thread || thread.resourceId !== resourceId) {
    throw new Error("Thread not found.");
  }

  const { messages } = await memory.recall({ threadId, resourceId });

  return messages.map((m) => ({
    role: m.role,
    content:
      m.content.content ??
      m.content.parts
        .filter((p): p is { type: "text"; text: string } => p.type === "text")
        .map((p) => p.text)
        .join(""),
  }));
}
