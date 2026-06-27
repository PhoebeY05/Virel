import { BrowserManager } from "../browser/browserManager";
import { AccountSetup, Post } from "../types/platform";
import { BasePlatformAdapter } from "./baseAdapter";

export class RedditAdapter extends BasePlatformAdapter {
  constructor(setup: AccountSetup, browserManager: BrowserManager) {
    super(setup, browserManager, {
      platform: "reddit",
      homeUrl: "https://www.reddit.com/",
      signupUrl: "https://www.reddit.com/register/",
      loginUrl: "https://www.reddit.com/login/",
      profileUrl: "https://www.reddit.com/settings/profile",
      postUrl: "https://www.reddit.com/submit/",
      supportsAutomatedSignup: true,
      supportsAutomatedProfile: true,
      supportsAutomatedPublishing: true
    });
  }

  protected override async fillPostComposer(post: Post): Promise<void> {
    await this.fillFirstAvailable(["textarea[name='title']", "textarea", "[contenteditable='true']"], post.text.slice(0, 280));
    if (post.linkUrl) {
      await this.fillFirstAvailable(["input[name='url']", "input[type='url']"], post.linkUrl);
    }
  }
}
