import fs from "node:fs/promises";
import path from "node:path";

export interface DocumentRecord {
  id: string;
  fileName: string;
  sizeBytes: number;
  chunkCount: number;
  uploadedAt: string;
  threadId: string;
}

const dataDir = path.resolve(process.cwd(), "data");
const registryPath = path.join(dataDir, "documents.json");

async function readAll(): Promise<DocumentRecord[]> {
  try {
    const raw = await fs.readFile(registryPath, "utf-8");
    return JSON.parse(raw) as DocumentRecord[];
  } catch {
    return [];
  }
}

async function writeAll(records: DocumentRecord[]): Promise<void> {
  await fs.mkdir(dataDir, { recursive: true });
  await fs.writeFile(registryPath, JSON.stringify(records, null, 2), "utf-8");
}

export async function listDocuments(
  threadId: string,
): Promise<DocumentRecord[]> {
  const records = await readAll();
  return records
    .filter((r) => r.threadId === threadId)
    .sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt));
}

export async function addDocument(record: DocumentRecord): Promise<void> {
  const records = await readAll();
  records.push(record);
  await writeAll(records);
}

export async function getDocument(id: string): Promise<DocumentRecord | null> {
  const records = await readAll();
  return records.find((r) => r.id === id) ?? null;
}

export async function removeDocument(id: string): Promise<void> {
  const records = await readAll();
  await writeAll(records.filter((r) => r.id !== id));
}
