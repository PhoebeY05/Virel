import { BrowserManager } from "../browser/browserManager";
import { AccountSetup } from "../types/platform";
import { BasePlatformAdapter } from "./baseAdapter";

export class XAdapter extends BasePlatformAdapter {
  constructor(setup: AccountSetup, browserManager: BrowserManager) {
    super(setup, browserManager, {
      platform: "x",
      homeUrl: "https://x.com/home",
      signupUrl: "https://x.com/i/flow/signup",
      loginUrl: "https://x.com/i/flow/login",
      profileUrl: "https://x.com/settings/profile",
      postUrl: "https://x.com/compose/post",
      supportsAutomatedSignup: false,
      supportsAutomatedProfile: true,
      supportsAutomatedPublishing: true
    });
  }
}
