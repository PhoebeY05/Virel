import { BrowserManager } from "../browser/browserManager";
import { AccountSetup } from "../types/platform";
import { BasePlatformAdapter } from "./baseAdapter";

export class TelegramAdapter extends BasePlatformAdapter {
  constructor(setup: AccountSetup, browserManager: BrowserManager) {
    super(setup, browserManager, {
      platform: "telegram",
      homeUrl: "https://web.telegram.org/k/",
      signupUrl: "https://web.telegram.org/k/",
      loginUrl: "https://web.telegram.org/k/",
      supportsAutomatedSignup: false,
      supportsAutomatedProfile: false,
      supportsAutomatedPublishing: false
    });
  }

  async login(): Promise<void> {
    await this.init();

    if (await this.restoreSession()) {
      return;
    }

    await this.page.goto(this.definition.loginUrl, { waitUntil: "domcontentloaded" });
    await this.pauseForUser("Complete Telegram login in the browser.");
    await this.saveSession();
  }

  async createAccount(): Promise<void> {
    await this.login();
  }
}
