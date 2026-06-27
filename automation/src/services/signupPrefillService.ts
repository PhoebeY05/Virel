import { BrowserManager } from "../browser/browserManager";
import { AccountSetup, PlatformName } from "../types/platform";
import { normalizeOptionalPath } from "../utils/fs";

const defaultSignupUrls: Record<PlatformName, string> = {
  instagram: "https://www.instagram.com/accounts/emailsignup/",
  facebook: "https://www.facebook.com/reg/",
  x: "https://x.com/i/flow/signup",
  reddit: "https://www.reddit.com/register/",
  linkedin: "https://www.linkedin.com/signup/",
  tiktok: "https://www.tiktok.com/signup",
  xiaohongshu: "https://www.xiaohongshu.com/",
  producthunt: "https://www.producthunt.com/sign-up"
};

interface FieldSpec {
  label: string;
  value?: string;
  selectors: string[];
}

export interface SignupPrefillResult {
  platform: PlatformName;
  url: string;
  filled: string[];
  skipped: string[];
}

export class SignupPrefillService {
  constructor(private readonly browserManager = new BrowserManager()) {}

  async prefillSignup(setup: AccountSetup, holdMs = 300_000): Promise<SignupPrefillResult> {
    const managed = await this.browserManager.createContext(setup.platform);
    const result: SignupPrefillResult = {
      platform: setup.platform,
      url: this.signupUrlFor(setup.platform),
      filled: [],
      skipped: []
    };

    try {
      await managed.page.goto(result.url, { waitUntil: "domcontentloaded" });
      await managed.page.waitForTimeout(1_500);

      const fields: FieldSpec[] = [
        {
          label: "email",
          value: setup.email,
          selectors: [
            "input[name='email']",
            "input[name='emailOrPhone']",
            "input[autocomplete='email']",
            "input[type='email']",
            "input[aria-label*='email' i]",
            "input[placeholder*='email' i]",
            "input[placeholder*='Mobile Number or Email' i]"
          ]
        },
        {
          label: "display name",
          value: setup.displayName,
          selectors: [
            "input[name='name']",
            "input[name='fullName']",
            "input[autocomplete='name']",
            "input[aria-label*='name' i]",
            "input[placeholder*='name' i]",
            "input[placeholder*='Full Name' i]"
          ]
        },
        {
          label: "username",
          value: setup.username,
          selectors: [
            "input[name='username']",
            "input[autocomplete='username']",
            "input[aria-label*='username' i]",
            "input[placeholder*='username' i]"
          ]
        },
        {
          label: "password",
          value: setup.password,
          selectors: ["input[name='password']", "input[autocomplete='new-password']", "input[type='password']"]
        },
        {
          label: "bio",
          value: setup.bio,
          selectors: [
            "textarea[name='bio']",
            "textarea[aria-label*='bio' i]",
            "textarea[placeholder*='bio' i]",
            "[contenteditable='true'][aria-label*='bio' i]"
          ]
        },
        {
          label: "website",
          value: setup.websiteUrl,
          selectors: [
            "input[name='website']",
            "input[name='url']",
            "input[type='url']",
            "input[aria-label*='website' i]",
            "input[placeholder*='website' i]"
          ]
        }
      ];

      for (const field of fields) {
        if (await this.fillFirstAvailable(managed.page, field)) {
          result.filled.push(field.label);
        } else {
          result.skipped.push(field.label);
        }
      }

      const profileImagePath = normalizeOptionalPath(setup.profileImagePath);
      if (profileImagePath && (await this.uploadFirstAvailable(managed.page, ["input[type='file']"], profileImagePath))) {
        result.filled.push("profile image");
      } else if (setup.profileImagePath) {
        result.skipped.push("profile image");
      }

      console.log(
        `[prefill-signup] ${setup.platform} form prepared. Filled: ${result.filled.join(", ") || "none"}. ` +
          `Skipped: ${result.skipped.join(", ") || "none"}.`
      );
      console.log("[prefill-signup] Review the browser, fill missing verification details, and click final submit manually.");
      console.log(`[prefill-signup] Browser will stay open for ${Math.round(holdMs / 1000)} seconds.`);

      await managed.page.waitForTimeout(holdMs);
      await this.browserManager.saveSession(setup.platform, managed.context);
      return result;
    } finally {
      await this.browserManager.close();
    }
  }

  private async fillFirstAvailable(page: import("playwright").Page, field: FieldSpec): Promise<boolean> {
    if (!field.value) {
      return false;
    }

    for (const selector of field.selectors) {
      const locator = page.locator(selector).first();
      if (await locator.isVisible({ timeout: 1_000 }).catch(() => false)) {
        await locator.fill(field.value).catch(async () => {
          await locator.click();
          await page.keyboard.insertText(field.value ?? "");
        });
        return true;
      }
    }

    return false;
  }

  private signupUrlFor(platform: PlatformName): string {
    const envKey = `SIGNUP_URL_${platform.toUpperCase()}`;
    return process.env[envKey] || defaultSignupUrls[platform];
  }

  private async uploadFirstAvailable(page: import("playwright").Page, selectors: string[], filePath: string): Promise<boolean> {
    for (const selector of selectors) {
      const locator = page.locator(selector).first();
      if ((await locator.count()) > 0) {
        await locator.setInputFiles(filePath);
        return true;
      }
    }

    return false;
  }
}
