import path from "node:path";
import { BrowserContext } from "playwright";
import { env } from "../config/env";
import { PlatformName } from "../types/platform";
import { ensureDir, fileExists } from "../utils/fs";
import { fromAutomationRoot } from "../utils/paths";

export class SessionStore {
  private readonly sessionDir = fromAutomationRoot(env.SESSION_DIR);

  async getStatePath(platform: PlatformName): Promise<string> {
    await ensureDir(this.sessionDir);
    return path.join(this.sessionDir, `${platform}.json`);
  }

  async hasSession(platform: PlatformName): Promise<boolean> {
    return fileExists(await this.getStatePath(platform));
  }

  async save(platform: PlatformName, context: BrowserContext): Promise<string> {
    const statePath = await this.getStatePath(platform);
    await context.storageState({ path: statePath });
    return statePath;
  }
}
