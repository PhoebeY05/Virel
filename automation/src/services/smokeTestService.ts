import { BrowserManager } from "../browser/browserManager";
import { PlatformName } from "../types/platform";

const signupUrls: Record<PlatformName, string> = {
  instagram: "https://www.instagram.com/accounts/emailsignup/",
  facebook: "https://www.facebook.com/reg/",
  x: "https://x.com/i/flow/signup",
  reddit: "https://www.reddit.com/register/",
  linkedin: "https://www.linkedin.com/signup/",
  tiktok: "https://www.tiktok.com/signup",
  xiaohongshu: "https://www.xiaohongshu.com/",
  producthunt: "https://www.producthunt.com/sign-up"
};

export interface SmokeTestInput {
  platform: PlatformName;
  email?: string;
  username: string;
  password?: string;
  displayName: string;
  bio?: string;
  holdMs?: number;
}

export class SmokeTestService {
  constructor(private readonly browserManager = new BrowserManager()) {}

  async openSignup(input: SmokeTestInput): Promise<void> {
    const managed = await this.browserManager.createContext(input.platform);

    try {
      await managed.page.goto(signupUrls[input.platform], { waitUntil: "domcontentloaded" });
      await this.fillFirstAvailable(managed.page, ["input[name='email']", "input[type='email']"], input.email ?? "");
      await this.fillFirstAvailable(
        managed.page,
        ["input[name='username']", "input[autocomplete='username']", "input[type='text']"],
        input.username
      );
      await this.fillFirstAvailable(managed.page, ["input[name='name']", "input[aria-label='Name']"], input.displayName);
      await this.fillFirstAvailable(managed.page, ["input[name='password']", "input[type='password']"], input.password ?? "");
      await this.fillFirstAvailable(managed.page, ["textarea[name='bio']", "textarea"], input.bio ?? "");

      const holdMs = input.holdMs ?? 300_000;
      console.log(`[smoke] ${input.platform} browser is open for ${Math.round(holdMs / 1000)} seconds.`);
      await new Promise((resolve) => setTimeout(resolve, holdMs));
    } finally {
      await this.browserManager.close();
    }
  }

  private async fillFirstAvailable(page: import("playwright").Page, selectors: string[], value: string): Promise<void> {
    if (!value) {
      return;
    }

    for (const selector of selectors) {
      const locator = page.locator(selector).first();
      if (await locator.isVisible({ timeout: 1_000 }).catch(() => false)) {
        await locator.fill(value).catch(async () => {
          await locator.click();
          await page.keyboard.insertText(value);
        });
        return;
      }
    }
  }
}
