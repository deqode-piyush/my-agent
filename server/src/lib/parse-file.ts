import fs from "node:fs/promises";
import path from "node:path";
import { PDFParse } from "pdf-parse";

const TEXT_EXTENSIONS = new Set([".txt", ".md", ".markdown", ".csv", ".json"]);

export async function extractText(
  filePath: string,
  originalName: string,
): Promise<string> {
  const ext = path.extname(originalName).toLowerCase();

  if (ext === ".pdf") {
    const parser = new PDFParse({ url: filePath });
    const result = await parser.getText();
    return result.text;
  }

  if (ext === ".docx") {
    const mammoth = await import("mammoth");
    const buffer = await fs.readFile(filePath);
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  }

  if (TEXT_EXTENSIONS.has(ext)) {
    return fs.readFile(filePath, "utf-8");
  }

  throw new Error(
    `Unsupported file type "${ext}". Supported types: .txt, .md, .pdf, .docx, .csv, .json`,
  );
}
