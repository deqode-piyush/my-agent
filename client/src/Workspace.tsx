import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";
import DocumentLedger from "./components/DocumentLedger";
import ChatPanel from "./components/ChatPanel";
import ThreadPanel from "./components/ThreadPanel";
import { AgentThread, DocumentRecord } from "./types";
import { createThread, fetchThreads } from "./api/threads";
import { fetchDocuments } from "./api/document";
import { useAuth } from "./context/AuthContext";

export default function Workspace() {
  const { threadId } = useParams<{ threadId: string }>();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();

  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [threads, setThreads] = useState<AgentThread[]>([]);
  const [loaded, setLoaded] = useState(false);

  const refreshThreads = useCallback(async () => {
    try {
      const data = await fetchThreads();
      setThreads(data);
    } catch {}
  }, []);

  useEffect(() => {
    refreshThreads();
  }, [refreshThreads]);

  const ensureThreadId = useCallback(async (): Promise<string> => {
    const thread = await createThread();
    navigate(`/${thread.id}`, { replace: true });
    return thread.id;
  }, [navigate]);

  useEffect(() => {
    if (!threadId) {
      setDocuments([]);
      setLoaded(true);
      return;
    }
    setLoaded(false);
    fetchDocuments(threadId)
      .then(setDocuments)
      .catch(() => setDocuments([]))
      .finally(() => setLoaded(true));
  }, [threadId]);

  return (
    <div className="h-screen flex flex-col">
      <header className="border-b border-line/15 px-6 py-3 flex items-baseline justify-between">
        <div className="flex items-baseline gap-2.5">
          <span className="font-display italic text-xl text-ink">
            Cortex
          </span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-[11px] font-mono text-moss">
            {loaded
              ? `${documents.length} doc${documents.length === 1 ? "" : "s"} indexed`
              : "loading…"}
          </span>
          <span className="text-[11px] text-ink/50">{user?.email}</span>
          <button
            onClick={() => signOut()}
            className="text-[11px] font-mono uppercase tracking-wide text-ink/40 hover:text-ember transition-colors"
          >
            Sign out
          </button>
        </div>
      </header>

      <main className="flex-1 grid grid-cols-[350px_340px_1fr] overflow-hidden">
        <aside className="border-r border-line/15 bg-paper/60 overflow-hidden">
          <ThreadPanel threads={threads} activeThreadId={threadId} />
        </aside>
        <aside className="border-r border-line/15 bg-paper/60 overflow-hidden">
          <DocumentLedger
            documents={documents}
            setDocuments={setDocuments}
            threadId={threadId}
            ensureThreadId={ensureThreadId}
          />
        </aside>
        <section className="overflow-hidden">
          <ChatPanel
            documents={documents}
            threadId={threadId}
            onThreadUpdated={refreshThreads}
            onThreadCreated={(id) => navigate(`/${id}`, { replace: true })}
          />
        </section>
      </main>
    </div>
  );
}
