import { BrowserManager } from "../browser/browserManager";
import { AccountSetup } from "../types/platform";
import { BasePlatformAdapter } from "./baseAdapter";

export class HackerNewsAdapter extends BasePlatformAdapter {
  constructor(setup: AccountSetup, browserManager: BrowserManager) {
    super(setup, browserManager, {
      platform: "hacker_news",
      homeUrl: "https://news.ycombinator.com/",
      signupUrl: "https://news.ycombinator.com/login",
      loginUrl: "https://news.ycombinator.com/login",
      profileUrl: "https://news.ycombinator.com/",
      supportsAutomatedSignup: false,
      supportsAutomatedProfile: false,
      supportsAutomatedPublishing: false
    });
  }
}
