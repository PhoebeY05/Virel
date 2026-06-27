import { BrowserManager } from "../browser/browserManager";
import { AccountSetup } from "../types/platform";
import { BasePlatformAdapter } from "./baseAdapter";

export class ProductHuntAdapter extends BasePlatformAdapter {
  constructor(setup: AccountSetup, browserManager: BrowserManager) {
    super(setup, browserManager, {
      platform: "producthunt",
      homeUrl: "https://www.producthunt.com/",
      signupUrl: "https://www.producthunt.com/sign-up",
      loginUrl: "https://www.producthunt.com/login",
      profileUrl: "https://www.producthunt.com/settings/profile",
      supportsAutomatedSignup: true,
      supportsAutomatedProfile: true,
      supportsAutomatedPublishing: false
    });
  }
}
