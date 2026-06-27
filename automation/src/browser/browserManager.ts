import { Browser, BrowserContext, BrowserType, chromium, firefox, Page, webkit } from "playwright";
import { env } from "../config/env";
import { SessionStore } from "../sessions/sessionStore";
import { PlatformName } from "../types/platform";
import { ensureDir } from "../utils/fs";
import { fromAutomationRoot } from "../utils/paths";
import { retry } from "../utils/retry";

export interface ManagedContext {
  browser: Browser;
  context: BrowserContext;
  page: Page;
  hadStoredSession: boolean;
}

export class BrowserManager {
  private browser?: Browser;
  private readonly sessionStore = new SessionStore();

  async launch(): Promise<Browser> {
    if (this.browser?.isConnected()) {
      return this.browser;
    }

    const browserType = this.getBrowserType();
    this.browser = await retry(() =>
      browserType.launch({
        headless: env.HEADLESS,
        slowMo: env.SLOW_MO_MS
      })
    );

    return this.browser;
  }

  async createContext(platform: PlatformName): Promise<ManagedContext> {
    const browser = await this.launch();
    await ensureDir(fromAutomationRoot(env.DOWNLOAD_DIR));

    const statePath = await this.sessionStore.getStatePath(platform);
    const hadStoredSession = await this.sessionStore.hasSession(platform);
    const context = await browser.newContext({
      acceptDownloads: true,
      storageState: hadStoredSession ? statePath : undefined,
      viewport: { width: 1280, height: 900 }
    });
    const page = await context.newPage();

    return { browser, context, page, hadStoredSession };
  }

  async saveSession(platform: PlatformName, context: BrowserContext): Promise<string> {
    return this.sessionStore.save(platform, context);
  }

  async close(): Promise<void> {
    if (!this.browser) {
      return;
    }

    await this.browser.close().catch(() => undefined);
    this.browser = undefined;
  }

  private getBrowserType(): BrowserType {
    if (env.BROWSER_CHANNEL === "firefox") {
      return firefox;
    }
    if (env.BROWSER_CHANNEL === "webkit") {
      return webkit;
    }
    return chromium;
  }
}
