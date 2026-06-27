import fs from "node:fs/promises";
import path from "node:path";

export async function ensureDir(dirPath: string): Promise<void> {
  await fs.mkdir(dirPath, { recursive: true });
}

export async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

export function timestampedFileName(prefix: string, extension: string): string {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  return `${prefix}-${stamp}.${extension.replace(/^\./, "")}`;
}

export function normalizeOptionalPath(filePath?: string): string | undefined {
  if (!filePath) {
    return undefined;
  }

  return path.resolve(filePath);
}
