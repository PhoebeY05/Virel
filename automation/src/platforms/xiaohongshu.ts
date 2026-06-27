import { BrowserManager } from "../browser/browserManager";
import { AccountSetup } from "../types/platform";
import { BasePlatformAdapter } from "./baseAdapter";

export class XiaohongshuAdapter extends BasePlatformAdapter {
  constructor(setup: AccountSetup, browserManager: BrowserManager) {
    super(setup, browserManager, {
      platform: "xiaohongshu",
      homeUrl: "https://www.xiaohongshu.com/",
      signupUrl: "https://www.xiaohongshu.com/",
      loginUrl: "https://www.xiaohongshu.com/",
      supportsAutomatedSignup: false,
      supportsAutomatedProfile: false,
      supportsAutomatedPublishing: false
    });
  }
}
