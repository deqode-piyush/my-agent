import { apiFetch } from "./http";

export async function streamChat(
  message: string,
  threadId: string | undefined,
  onDelta: (text: string) => void,
  onThread: (threadId: string) => void,
  onDone: (threadId: string) => void,
  onError: (message: string) => void,
): Promise<void> {
  const res = await apiFetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, threadId }),
  });

  if (!res.ok || !res.body) {
    const data = await res.json().catch(() => ({}));
    onError(data.error ?? "Failed to reach the chat server.");
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

      if (eventType === "thread") onThread(payload.threadId);
      else if (eventType === "delta") onDelta(payload.text);
      else if (eventType === "done") onDone(payload.threadId);
      else if (eventType === "error") onError(payload.message);
    }
  }
}
