import { DocumentRecord } from "../types";
import { apiFetch, parseJsonOrThrow } from "./http";

export async function fetchDocuments(
  threadId: string,
): Promise<DocumentRecord[]> {
  const res = await apiFetch(
    `/api/documents?threadId=${encodeURIComponent(threadId)}`,
  );
  const data = await parseJsonOrThrow(res, "Failed to load documents.");
  return data.documents;
}

export async function uploadDocument(
  file: File,
  threadId?: string,
): Promise<DocumentRecord> {
  const formData = new FormData();
  formData.append("file", file);
  if (threadId) {
    formData.append("threadId", threadId);
  }
  const res = await apiFetch("/api/documents/upload", {
    method: "POST",
    body: formData,
  });
  const data = await parseJsonOrThrow(res, "Upload failed.");
  return {
    id: data.id,
    fileName: data.fileName,
    sizeBytes: file.size,
    chunkCount: data.chunkCount,
    uploadedAt: new Date().toISOString(),
    threadId,
  };
}

export async function deleteDocument(id: string): Promise<void> {
  const res = await apiFetch(`/api/documents/${id}`, { method: "DELETE" });
  if (!res.ok && res.status !== 204) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error ?? "Delete failed.");
  }
}
