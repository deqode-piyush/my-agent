import { useCallback, useRef, useState } from "react";
import { deleteDocument, uploadDocument } from "../api/document";
import { DocumentRecord } from "../types";

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function DocumentLedger({
  documents,
  setDocuments,
  threadId,
  ensureThreadId,
}: {
  documents: DocumentRecord[];
  setDocuments: React.Dispatch<React.SetStateAction<DocumentRecord[]>>;
  threadId?: string;
  ensureThreadId: () => Promise<string>;
}) {
  const [isDragging, setIsDragging] = useState(false);
  const [pendingNames, setPendingNames] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0) return;
      setError(null);
      try {
        const activeThreadId = threadId;
        for (const file of Array.from(files)) {
          setPendingNames((prev) => [...prev, file.name]);
          try {
            const doc = await uploadDocument(file, activeThreadId);
            setDocuments((prev) => [doc, ...prev]);
          } catch (err) {
            setError(err instanceof Error ? err.message : "Upload failed.");
          } finally {
            setPendingNames((prev) => prev.filter((n) => n !== file.name));
          }
        }
      } catch {
        setError("Could not start a new conversation for this upload.");
      }
    },
    [setDocuments, threadId, ensureThreadId],
  );

  const handleDelete = useCallback(
    async (id: string) => {
      setDocuments((prev) => prev.filter((d) => d.id !== id));
      try {
        await deleteDocument(id);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Could not delete document.",
        );
      }
    },
    [setDocuments],
  );

  return (
    <div className="flex h-full flex-col">
      <div className="px-5 pt-5 pb-3">
        <h2 className="font-display text-lg italic text-ink">The Stacks</h2>
        <p className="text-xs text-ink/55 mt-0.5">
          Upload source material — the agent answers only from what's shelved
          here.
        </p>
      </div>

      <div
        className={`mx-5 rounded-lg border-2 border-dashed px-4 py-6 text-center transition-colors cursor-pointer ${
          isDragging
            ? "border-ember bg-ember/5"
            : "border-line/30 hover:border-line/50"
        }`}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          handleFiles(e.dataTransfer.files);
        }}
      >
        <p className="text-sm text-ink/70">
          Drop files here, or{" "}
          <span className="text-ember underline underline-offset-2">
            browse
          </span>
        </p>
        <p className="text-[11px] text-ink/40 mt-1 font-mono">
          .txt · .md · .pdf · .docx · .csv · .json
        </p>
        <input
          ref={inputRef}
          type="file"
          multiple
          className="hidden"
          accept=".txt,.md,.markdown,.pdf,.docx,.csv,.json"
          onChange={(e) => {
            handleFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </div>

      {error && (
        <p className="mx-5 mt-3 text-xs text-ember bg-ember/10 border border-ember/20 rounded px-3 py-2">
          {error}
        </p>
      )}

      <div className="flex-1 overflow-y-auto scrollbar-thin mt-4 px-5 pb-5">
        {pendingNames.map((name) => (
          <div
            key={name}
            className="flex items-center justify-between py-2.5 border-b border-line/10 animate-pulse"
          >
            <span className="text-sm text-ink/60 truncate">{name}</span>
            <span className="text-[10px] font-mono text-ink/40 uppercase tracking-wide">
              indexing…
            </span>
          </div>
        ))}

        {documents.length === 0 && pendingNames.length === 0 ? (
          <p className="text-sm text-ink/40 italic mt-6 text-center">
            No documents shelved yet.
          </p>
        ) : (
          documents.map((doc) => (
            <div
              key={doc.id}
              className="group flex items-start justify-between gap-2 py-2.5 border-b border-line/10"
            >
              <div className="min-w-0">
                <p className="text-sm text-ink truncate">{doc.fileName}</p>
                <p className="text-[11px] font-mono text-ink/40 mt-0.5">
                  {formatBytes(doc.sizeBytes)} · {doc.chunkCount} chunks ·{" "}
                  {formatTime(doc.uploadedAt)}
                </p>
              </div>
              <button
                onClick={() => handleDelete(doc.id)}
                className="opacity-0 group-hover:opacity-100 transition-opacity text-ink/30 hover:text-ember text-xs shrink-0 mt-0.5"
                title="Remove from index"
              >
                remove
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
