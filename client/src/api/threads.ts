import { AgentThread, ChatMessage } from "../types";
import { apiFetch, parseJsonOrThrow } from "./http";

export const fetchThreads = async (): Promise<AgentThread[]> => {
  const res = await apiFetch("/api/threads");
  const data = await parseJsonOrThrow(res, "Failed to load threads.");
  return data.threads.threads ?? data.threads;
};

export const createThread = async (): Promise<AgentThread> => {
  const res = await apiFetch("/api/threads", { method: "POST" });
  const data = await parseJsonOrThrow(res, "Failed to create new thread.");
  return data.thread;
};

export const getThread = async (id: string): Promise<AgentThread> => {
  const res = await apiFetch(`/api/threads/${id}`);
  const data = await parseJsonOrThrow(res, "Failed to load existing thread.");
  return data.thread;
};

export const fetchThreadMessages = async (
  id: string,
): Promise<ChatMessage[]> => {
  const res = await apiFetch(`/api/threads/${id}/messages`);
  const data = await parseJsonOrThrow(
    res,
    "Failed to load conversation history.",
  );
  return data.messages;
};
