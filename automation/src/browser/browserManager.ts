import { Browser, BrowserContext, BrowserType, chromium, firefox, Page, webkit } from "playwright";
import { env } from "../config/env";
import { SessionStore } from "../sessions/sessionStore";
import { BrowserChannel } from "../types/platform";
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
  private browserChannel?: BrowserChannel;
  private readonly sessionStore = new SessionStore();

  async launch(browserChannel: BrowserChannel = env.BROWSER_CHANNEL): Promise<Browser> {
    if (this.browser?.isConnected() && this.browserChannel === browserChannel) {
      return this.browser;
    }

    if (this.browser?.isConnected()) {
      await this.close();
    }

    const browserType = this.getBrowserType(browserChannel);
    this.browser = await retry(() =>
      browserType.launch({
        headless: env.HEADLESS,
        slowMo: env.SLOW_MO_MS
      })
    );
    this.browserChannel = browserChannel;

    return this.browser;
  }

  async createContext(sessionKey: string, browserChannel: BrowserChannel = env.BROWSER_CHANNEL): Promise<ManagedContext> {
    const browser = await this.launch(browserChannel);
    await ensureDir(fromAutomationRoot(env.DOWNLOAD_DIR));

    const statePath = await this.sessionStore.getStatePath(sessionKey);
    const hadStoredSession = await this.sessionStore.hasSession(sessionKey);
    const context = await browser.newContext({
      acceptDownloads: true,
      storageState: hadStoredSession ? statePath : undefined,
      viewport: { width: 1280, height: 900 }
    });
    const page = await context.newPage();

    return { browser, context, page, hadStoredSession };
  }

  async saveSession(sessionKey: string, context: BrowserContext): Promise<string> {
    return this.sessionStore.save(sessionKey, context);
  }

  async close(): Promise<void> {
    if (!this.browser) {
      return;
    }

    await this.browser.close().catch(() => undefined);
    this.browser = undefined;
    this.browserChannel = undefined;
  }

  private getBrowserType(browserChannel: BrowserChannel): BrowserType {
    if (browserChannel === "firefox") {
      return firefox;
    }
    if (browserChannel === "webkit") {
      return webkit;
    }
    return chromium;
  }
}
