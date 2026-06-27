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

  protected async fillSignupFields(): Promise<void> {
    await this.fillFirstAvailable(
      [
        "input[name='emailOrPhone']",
        "input[aria-label='Mobile Number or Email']",
        "input[placeholder='Mobile Number or Email']",
        "input[autocomplete='email']",
        "input[type='email']"
      ],
      this.setup.email ?? ""
    );
    await this.fillFirstAvailable(
      ["input[name='fullName']", "input[aria-label='Full Name']", "input[placeholder='Full Name']"],
      this.setup.displayName
    );
    await this.fillFirstAvailable(
      ["input[name='username']", "input[aria-label='Username']", "input[placeholder='Username']", "input[autocomplete='username']"],
      this.setup.username
    );
    if (this.setup.password) {
      await this.fillFirstAvailable(["input[name='password']", "input[type='password']"], this.setup.password);
    }
  }
}
