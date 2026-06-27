import { BrowserManager } from "../browser/browserManager";
import { BrowserChannel, PlatformName } from "../types/platform";

const signupUrls: Record<PlatformName, string> = {
  instagram: "https://www.instagram.com/accounts/emailsignup/",
  facebook: "https://www.facebook.com/reg/",
  x: "https://x.com/i/flow/signup",
  reddit: "https://www.reddit.com/register/",
  linkedin: "https://www.linkedin.com/signup/",
  tiktok: "https://www.tiktok.com/signup",
  telegram: "https://web.telegram.org/k/",
  xiaohongshu: "https://www.xiaohongshu.com/",
  producthunt: "https://www.producthunt.com/sign-up"
};

const browserChannels: Partial<Record<PlatformName, BrowserChannel>> = {
  reddit: "firefox"
};

export interface SmokeTestInput {
  platform: PlatformName;
  signupMethod?: "email" | "google";
  email?: string;
  username: string;
  password?: string;
  displayName: string;
  bio?: string;
  holdMs?: number;
}

export interface SmokeBatchInput {
  runs: SmokeTestInput[];
}

export class SmokeTestService {
  constructor(private readonly browserManager = new BrowserManager()) {}

  async openSignup(input: SmokeTestInput): Promise<void> {
    const managed = await this.browserManager.createContext(input.platform, browserChannels[input.platform]);

    try {
      await managed.page.goto(signupUrls[input.platform], { waitUntil: "domcontentloaded" });
      if (input.signupMethod === "google") {
        await this.startGoogleSignup(managed.page, input.platform);
      } else if (input.platform === "instagram") {
        await this.fillInstagramSignup(managed.page, input);
      } else if (input.platform === "telegram") {
        console.log("[smoke] telegram opened the login flow. Complete sign-in manually in the browser.");
      } else {
        await this.fillFirstAvailable(managed.page, ["input[name='email']", "input[type='email']"], input.email ?? "");
        await this.fillFirstAvailable(
          managed.page,
          ["input[name='username']", "input[autocomplete='username']", "input[type='text']"],
          input.username
        );
        await this.fillFirstAvailable(managed.page, ["input[name='name']", "input[aria-label='Name']"], input.displayName);
        await this.fillFirstAvailable(managed.page, ["input[name='password']", "input[type='password']"], input.password ?? "");
        await this.fillFirstAvailable(managed.page, ["textarea[name='bio']", "textarea"], input.bio ?? "");
      }

      const holdMs = input.holdMs ?? 300_000;
      console.log(`[smoke] ${input.platform} browser is open for ${Math.round(holdMs / 1000)} seconds.`);
      await new Promise((resolve) => setTimeout(resolve, holdMs));
    } finally {
      await this.browserManager.close();
    }
  }

  async openBatchSignups(input: SmokeBatchInput): Promise<void> {
    for (const [index, run] of input.runs.entries()) {
      console.log(`[smoke] starting run ${index + 1}/${input.runs.length} for ${run.platform}`);
      await this.openSignup(run);
    }
  }

  private async startGoogleSignup(page: import("playwright").Page, platform: PlatformName): Promise<void> {
    const clicked = await this.clickFirstAvailable(page, [
      "button:has-text('Continue with Google')",
      "a:has-text('Continue with Google')",
      "div[role='button']:has-text('Continue with Google')",
      "button:has-text('Sign up with Google')",
      "a:has-text('Sign up with Google')",
      "div[role='button']:has-text('Sign up with Google')",
      "button:has-text('Log in with Google')",
      "a:has-text('Log in with Google')",
      "div[role='button']:has-text('Log in with Google')",
      "button:has-text('Google')",
      "a:has-text('Google')",
      "div[role='button']:has-text('Google')",
      "[aria-label*='Google']",
      "[data-testid*='google' i]"
    ]);

    if (clicked) {
      console.log(`[smoke] ${platform} Google signup entry point clicked. Complete Google auth and platform verification manually.`);
      return;
    }

    console.log(`[smoke] ${platform} did not expose a visible Google signup option. Continue manually in the opened browser.`);
  }

  private async fillInstagramSignup(page: import("playwright").Page, input: SmokeTestInput): Promise<void> {
    await this.fillFirstAvailable(
      page,
      [
        "input[name='emailOrPhone']",
        "input[aria-label='Mobile Number or Email']",
        "input[placeholder='Mobile Number or Email']",
        "input[autocomplete='email']",
        "input[type='email']"
      ],
      input.email ?? ""
    );
    await this.fillFirstAvailable(
      page,
      ["input[name='fullName']", "input[aria-label='Full Name']", "input[placeholder='Full Name']"],
      input.displayName
    );
    await this.fillFirstAvailable(
      page,
      ["input[name='username']", "input[aria-label='Username']", "input[placeholder='Username']", "input[autocomplete='username']"],
      input.username
    );
    await this.fillFirstAvailable(page, ["input[name='password']", "input[type='password']"], input.password ?? "");
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

  private async clickFirstAvailable(page: import("playwright").Page, selectors: string[]): Promise<boolean> {
    for (const selector of selectors) {
      const locator = page.locator(selector).first();
      if (await locator.isVisible({ timeout: 1_500 }).catch(() => false)) {
        await locator.click();
        return true;
      }
    }

    return false;
  }
}
