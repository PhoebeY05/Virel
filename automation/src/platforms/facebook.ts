import { BrowserManager } from "../browser/browserManager";
import { AccountSetup } from "../types/platform";
import { BasePlatformAdapter } from "./baseAdapter";

export class FacebookAdapter extends BasePlatformAdapter {
  constructor(setup: AccountSetup, browserManager: BrowserManager) {
    super(setup, browserManager, {
      platform: "facebook",
      homeUrl: "https://www.facebook.com/",
      signupUrl: "https://www.facebook.com/reg/",
      loginUrl: "https://www.facebook.com/login/",
      profileUrl: "https://www.facebook.com/profile.php",
      supportsAutomatedSignup: false,
      supportsAutomatedProfile: false,
      supportsAutomatedPublishing: false
    });
  }
}
