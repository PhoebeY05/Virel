import { BrowserManager } from "../browser/browserManager";
import { AccountSetup } from "../types/platform";
import { BasePlatformAdapter } from "./baseAdapter";

export class TikTokAdapter extends BasePlatformAdapter {
  constructor(setup: AccountSetup, browserManager: BrowserManager) {
    super(setup, browserManager, {
      platform: "tiktok",
      homeUrl: "https://www.tiktok.com/",
      signupUrl: "https://www.tiktok.com/signup",
      loginUrl: "https://www.tiktok.com/login",
      profileUrl: "https://www.tiktok.com/profile",
      postUrl: "https://www.tiktok.com/upload",
      supportsAutomatedSignup: false,
      supportsAutomatedProfile: false,
      supportsAutomatedPublishing: false
    });
  }
}
