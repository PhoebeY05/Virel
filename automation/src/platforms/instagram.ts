import { BrowserManager } from "../browser/browserManager";
import { AccountSetup } from "../types/platform";
import { BasePlatformAdapter } from "./baseAdapter";

export class InstagramAdapter extends BasePlatformAdapter {
  constructor(setup: AccountSetup, browserManager: BrowserManager) {
    super(setup, browserManager, {
      platform: "instagram",
      homeUrl: "https://www.instagram.com/",
      signupUrl: "https://www.instagram.com/accounts/emailsignup/",
      loginUrl: "https://www.instagram.com/accounts/login/",
      profileUrl: "https://www.instagram.com/accounts/edit/",
      supportsAutomatedSignup: true,
      supportsAutomatedProfile: true,
      supportsAutomatedPublishing: false
    });
  }
}
