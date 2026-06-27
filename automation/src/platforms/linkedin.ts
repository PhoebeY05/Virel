import { BrowserManager } from "../browser/browserManager";
import { AccountSetup } from "../types/platform";
import { BasePlatformAdapter } from "./baseAdapter";

export class LinkedinAdapter extends BasePlatformAdapter {
  constructor(setup: AccountSetup, browserManager: BrowserManager) {
    super(setup, browserManager, {
      platform: "linkedin",
      homeUrl: "https://www.linkedin.com/feed/",
      signupUrl: "https://www.linkedin.com/signup/",
      loginUrl: "https://www.linkedin.com/login/",
      profileUrl: "https://www.linkedin.com/in/me/edit/intro/",
      postUrl: "https://www.linkedin.com/feed/",
      supportsAutomatedSignup: false,
      supportsAutomatedProfile: false,
      supportsAutomatedPublishing: true
    });
  }
}
