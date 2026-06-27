import fs from "node:fs/promises";
import crypto from "node:crypto";
import os from "node:os";
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

export async function resolveOptionalAssetPath(source?: string): Promise<string | undefined> {
  if (!source) {
    return undefined;
  }

  if (!/^https?:\/\//i.test(source)) {
    return normalizeOptionalPath(source);
  }

  const url = new URL(source);
  const extension = path.extname(url.pathname) || ".bin";
  const cacheDir = path.join(os.tmpdir(), "virel-assets");
  await ensureDir(cacheDir);

  const filePath = path.join(cacheDir, `${crypto.createHash("sha1").update(source).digest("hex")}${extension}`);
  if (await fileExists(filePath)) {
    return filePath;
  }

  const response = await fetch(source);
  if (!response.ok) {
    return undefined;
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  await fs.writeFile(filePath, buffer);
  return filePath;
}
