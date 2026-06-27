export interface DocumentRecord {
  id: string;
  fileName: string;
  sizeBytes: number;
  chunkCount: number;
  uploadedAt: string;
  threadId?: string;
}