import { ChatStreamHandlers } from "../types";
import { apiFetch } from "./http";

async function consumeChatStream(
  res: Response,
  handlers: ChatStreamHandlers,
): Promise<void> {
  if (!res.ok || !res.body) {
    const data = await res.json().catch(() => ({}));
    handlers.onError(data.error ?? "Failed to reach the chat server.");
    return;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const events = buffer.split("\n\n");
    buffer = events.pop() ?? "";

    for (const evt of events) {
      const eventMatch = evt.match(/^event: (.+)$/m);
      const dataMatch = evt.match(/^data: (.+)$/m);
      if (!eventMatch || !dataMatch) continue;

      const eventType = eventMatch[1];
      const payload = JSON.parse(dataMatch[1]);

      if (eventType === "thread") handlers.onThread(payload.threadId);
      else if (eventType === "delta") handlers.onDelta(payload.text);
      else if (eventType === "approval-request")
        handlers.onApprovalRequest(payload);
      else if (eventType === "done") handlers.onDone(payload.threadId);
      else if (eventType === "error") handlers.onError(payload.message);
    }
  }
}

export async function streamChat(
  message: string,
  threadId: string | undefined,
  handlers: ChatStreamHandlers,
): Promise<void> {
  const res = await apiFetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, threadId }),
  });

  await consumeChatStream(res, handlers);
}

export async function resumeChatApproval(
  threadId: string,
  runId: string,
  toolCallId: string | undefined,
  approved: boolean,
  handlers: ChatStreamHandlers,
): Promise<void> {
  const res = await apiFetch("/api/chat/approve", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ threadId, runId, toolCallId, approved }),
  });

  await consumeChatStream(res, handlers);
}
