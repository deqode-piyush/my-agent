import { useMemo, useState } from "react";
import { MessageSquare, Plus, Search } from "lucide-react";
import { useNavigate } from "react-router";
import { AgentThread } from "../types";

function formatTime(date: string) {
  return new Date(date).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function ThreadPanel({
  threads,
  activeThreadId,
}: {
  threads?: AgentThread[];
  activeThreadId?: string;
}) {
  const [search, setSearch] = useState("");

  const navigate = useNavigate();

  const onCreate = () => {
    navigate("/");
  };

  const onSelect = (threadId: string) => {
    navigate(`/${threadId}`);
  };

  const filteredThreads = useMemo(() => {
    const q = search.toLowerCase();

    return threads?.filter((t) => t.title.toLowerCase().includes(q));
  }, [threads, search]);

  return (
    <div className="flex h-full flex-col">
      <div className="px-5 pt-5 pb-3">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg italic text-ink">
            Agent Threads
          </h2>

          <button
            onClick={onCreate}
            className="
              flex items-center gap-1.5
              rounded-md
              border border-line/20
              px-2.5 py-1.5
              text-xs
              hover:bg-paper
            "
          >
            <Plus size={14} />
            New
          </button>
        </div>

        <p className="text-xs text-ink/55 mt-0.5">
          Conversations with your agent.
        </p>
      </div>

      {/* Search */}
      <div className="px-5 pb-3">
        <div className="relative">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-ink/30"
          />

          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search threads..."
            className="
              w-full
              rounded-lg
              border border-line/20
              bg-transparent
              pl-9
              pr-3
              py-2
              text-sm
              outline-none
              focus:border-ember/40
            "
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin px-3 pb-4">
        {filteredThreads?.length === 0 ? (
          <div className="px-3 py-8 text-center">
            <MessageSquare size={22} className="mx-auto text-ink/25" />

            <p className="mt-3 text-sm text-ink/40 italic">No threads found.</p>
          </div>
        ) : (
          filteredThreads?.map((thread) => {
            const active = thread.id === activeThreadId;

            return (
              <button
                key={thread.id}
                onClick={() => onSelect?.(thread.id)}
                className={`
                  w-full
                  text-left
                  rounded-lg
                  px-3
                  py-3
                  mb-1.5
                  transition-all
                  border
                  ${
                    active
                      ? "bg-ember/8 border-ember/25"
                      : "border-transparent hover:border-line/15 hover:bg-paper"
                  }
                `}
              >
                <div className="flex items-start gap-3">
                  <MessageSquare
                    size={16}
                    className={`
                      mt-0.5 shrink-0
                      ${active ? "text-ember" : "text-ink/40"}
                    `}
                  />

                  <div className="min-w-0 flex-1">
                    <p
                      className={`
                        truncate
                        text-sm
                        ${active ? "text-ink font-medium" : "text-ink"}
                      `}
                    >
                      {thread.title}
                    </p>

                    <p className="mt-2 text-[10px] font-mono uppercase tracking-wide text-ink/35">
                      {formatTime(thread.updatedAt)}
                    </p>
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
