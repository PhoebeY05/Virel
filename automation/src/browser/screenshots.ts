import path from "node:path";
import { Page } from "playwright";
import { env } from "../config/env";
import { ensureDir, timestampedFileName } from "../utils/fs";
import { fromAutomationRoot } from "../utils/paths";

export async function captureFailureScreenshot(page: Page, label: string): Promise<string> {
  const screenshotDir = fromAutomationRoot(env.SCREENSHOT_DIR);
  await ensureDir(screenshotDir);

  const safeLabel = label.replace(/[^a-z0-9-_]+/gi, "-").toLowerCase();
  const screenshotPath = path.join(screenshotDir, timestampedFileName(safeLabel, "png"));
  await page.screenshot({ path: screenshotPath, fullPage: true }).catch(() => undefined);
  return screenshotPath;
}
