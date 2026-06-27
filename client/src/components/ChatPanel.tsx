import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { ChatMessage, DocumentRecord } from "../types";
import { fetchThreadMessages } from "../api/threads";
import { streamChat } from "../api/chat";

export default function ChatPanel({
  documents,
  threadId,
  onThreadUpdated,
  onThreadCreated,
}: {
  documents: DocumentRecord[];
  threadId?: string;
  onThreadUpdated: () => Promise<void>;
  onThreadCreated: (threadId: string) => void;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const skipNextFetchRef = useRef(false);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages]);

  useEffect(() => {
    if (!threadId) {
      setMessages([]);
      return;
    }
    if (skipNextFetchRef.current) {
      skipNextFetchRef.current = false;
      return;
    }
    fetchThreadMessages(threadId)
      .then(setMessages)
      .catch(() => setMessages([]));
  }, [threadId]);

  const send = async () => {
    const text = input.trim();
    if (!text || isStreaming) return;

    setMessages((prev) => [
      ...prev,
      { role: "user", content: text },
      { role: "assistant", content: "" },
    ]);
    setInput("");
    setIsStreaming(true);

    await streamChat(
      text,
      threadId,
      (delta) => {
        setMessages((prev) => {
          const next = [...prev];
          next[next.length - 1] = {
            role: "assistant",
            content: next[next.length - 1].content + delta,
          };
          return next;
        });
      },
      (newThreadId) => {
        if (newThreadId !== threadId) {
          skipNextFetchRef.current = true;
          onThreadCreated(newThreadId);
        }
      },
      () => {
        setIsStreaming(false);
        onThreadUpdated();
      },
      (errMessage) => {
        setMessages((prev) => {
          const next = [...prev];
          next[next.length - 1] = {
            role: "assistant",
            content: `⚠️ ${errMessage}`,
          };
          return next;
        });
        setIsStreaming(false);
      },
    );
  };

  return (
    <div className="flex h-full flex-col">
      <div className="px-6 pt-5 pb-3 border-b border-line/10">
        <h2 className="font-display text-lg italic text-ink">
          The Reading Desk
        </h2>
        <p className="text-xs text-ink/55 mt-0.5">
          {documents.length > 0
            ? `Ask anything about your ${documents.length} shelved document${documents.length === 1 ? "" : "s"}.`
            : "Shelve a document on the left to begin a conversation grounded in it."}
        </p>
      </div>

      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto scrollbar-thin px-6 py-5 space-y-4"
      >
        {messages.length === 0 && (
          <div className="h-full flex items-center justify-center">
            <p className="text-ink/30 text-sm italic max-w-xs text-center">
              "What does this contract say about termination clauses?"
              <br />
              "Summarize chapter three."
              <br />
              Try a question once you've added a file.
            </p>
          </div>
        )}

        {messages.map((m, i) => (
          <div
            key={i}
            className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                m.role === "user"
                  ? "bg-ink text-paper rounded-br-sm"
                  : "bg-white border border-line/10 text-ink rounded-bl-sm shadow-sm"
              }`}
            >
              {m.role === "assistant" ? (
                m.content ? (
                  <div className="prose-chat">
                    <ReactMarkdown>{m.content}</ReactMarkdown>
                  </div>
                ) : (
                  <span className="inline-flex gap-1 py-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-ink/30 animate-bounce [animation-delay:-0.3s]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-ink/30 animate-bounce [animation-delay:-0.15s]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-ink/30 animate-bounce" />
                  </span>
                )
              ) : (
                m.content
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="px-6 py-4 border-t border-line/10">
        <div className="flex items-end gap-2 bg-white border border-line/15 rounded-xl px-3 py-2 shadow-sm focus-within:border-ember/50 transition-colors">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            placeholder="Ask about your documents…"
            rows={1}
            className="flex-1 resize-none bg-transparent outline-none text-sm py-1.5 max-h-32"
          />
          <button
            onClick={send}
            disabled={isStreaming || !input.trim()}
            className="shrink-0 bg-ember text-paper text-sm px-4 py-1.5 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed hover:bg-ember/90 transition-colors"
          >
            {isStreaming ? "…" : "Ask"}
          </button>
        </div>
      </div>
    </div>
  );
}
