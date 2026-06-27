import path from "node:path";
import { BrowserContext } from "playwright";
import { env } from "../config/env";
import { PlatformName } from "../types/platform";
import { ensureDir, fileExists } from "../utils/fs";
import { fromAutomationRoot } from "../utils/paths";

export class SessionStore {
  private readonly sessionDir = fromAutomationRoot(env.SESSION_DIR);

  async getStatePath(sessionKey: string): Promise<string> {
    await ensureDir(this.sessionDir);
    return path.join(this.sessionDir, `${sessionKey}.json`);
  }

  async hasSession(sessionKey: string): Promise<boolean> {
    return fileExists(await this.getStatePath(sessionKey));
  }

  async save(sessionKey: string, context: BrowserContext): Promise<string> {
    const statePath = await this.getStatePath(sessionKey);
    await context.storageState({ path: statePath });
    return statePath;
  }
}
