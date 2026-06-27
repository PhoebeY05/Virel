import { BrowserContext, Page } from "playwright";
import { BrowserManager } from "../browser/browserManager";
import { throwIfVerificationRequired } from "../browser/safety";
import { captureFailureScreenshot } from "../browser/screenshots";
import { AccountSetup, PlatformAdapter, PlatformName, Post } from "../types/platform";
import { AutomationError, UserVerificationRequiredError } from "../utils/errors";
import { normalizeOptionalPath } from "../utils/fs";
import { waitForUserConfirmation } from "../utils/userPrompt";

export interface PlatformDefinition {
  platform: PlatformName;
  homeUrl: string;
  signupUrl: string;
  loginUrl: string;
  profileUrl?: string;
  postUrl?: string;
  supportsAutomatedSignup: boolean;
  supportsAutomatedProfile: boolean;
  supportsAutomatedPublishing: boolean;
}

export abstract class BasePlatformAdapter implements PlatformAdapter {
  protected page!: Page;
  protected context!: BrowserContext;
  protected hadStoredSession = false;

  constructor(
    protected readonly setup: AccountSetup,
    protected readonly browserManager: BrowserManager,
    protected readonly definition: PlatformDefinition
  ) {}

  async init(): Promise<void> {
    const managed = await this.browserManager.createContext(this.definition.platform);
    this.page = managed.page;
    this.context = managed.context;
    this.hadStoredSession = managed.hadStoredSession;
  }

  async login(): Promise<void> {
    await this.ensureInitialized();

    if (await this.restoreSession()) {
      return;
    }

    await this.page.goto(this.definition.loginUrl, { waitUntil: "domcontentloaded" });
    await this.fillLoginFields();
    await this.pauseForUser("Complete login and any verification in the browser.");
    await this.saveSession();
  }

  async createAccount(): Promise<void> {
    await this.ensureInitialized();
    await this.page.goto(this.definition.signupUrl, { waitUntil: "domcontentloaded" });

    if (!this.definition.supportsAutomatedSignup) {
      await this.pauseForUser("This platform requires guided manual signup. Complete the visible signup flow.");
      await this.saveSession();
      return;
    }

    if (this.setup.signupMethod === "google") {
      await this.startGoogleSignup();
      await this.pauseForUser("Complete Google sign-in, then finish any platform verification or username steps.");
    } else {
      await this.fillSignupFields();
      await this.pauseForUser("Review the signup details, submit them, and complete any verification.");
    }
    await this.saveSession();
  }

  async fillProfile(): Promise<void> {
    await this.ensureInitialized();

    if (!this.definition.supportsAutomatedProfile) {
      await this.pauseForUser("Open the profile editor and apply the suggested branding fields manually.");
      await this.saveSession();
      return;
    }

    await this.gotoProfileEditor();
    await this.fillProfileFields();
    await this.pauseForUser("Review and save the profile changes in the browser.");
    await this.saveSession();
  }

  async publishPost(post: Post): Promise<void> {
    await this.ensureInitialized();

    if (!this.definition.supportsAutomatedPublishing) {
      throw new AutomationError(
        `${this.definition.platform} publishing is not automated yet. Use guided browser mode.`,
        "PUBLISHING_NOT_IMPLEMENTED"
      );
    }

    await this.gotoComposer();
    await this.fillPostComposer(post);
    await this.pauseForUser("Review the prepared post and publish it manually when ready.");
  }

  async logout(): Promise<void> {
    await this.ensureInitialized();
    await this.page.goto(this.definition.homeUrl, { waitUntil: "domcontentloaded" });
    await this.pauseForUser("Log out manually if needed.");
  }

  async saveSession(): Promise<void> {
    await this.ensureInitialized();
    await this.browserManager.saveSession(this.definition.platform, this.context);
  }

  async restoreSession(): Promise<boolean> {
    await this.ensureInitialized();
    if (!this.hadStoredSession) {
      return false;
    }

    await this.page.goto(this.definition.homeUrl, { waitUntil: "domcontentloaded" });
    await throwIfVerificationRequired(this.page).catch(async (error) => {
      if (error instanceof UserVerificationRequiredError) {
        await this.pauseForUser("Stored session reached a verification checkpoint.");
        return;
      }
      throw error;
    });

    return true;
  }

  async runSafely<T>(operationName: string, operation: () => Promise<T>): Promise<T> {
    try {
      const result = await operation();
      await throwIfVerificationRequired(this.page);
      return result;
    } catch (error) {
      const screenshotPath = await captureFailureScreenshot(this.page, `${this.definition.platform}-${operationName}`);
      if (error instanceof UserVerificationRequiredError) {
        await this.pauseForUser(`${error.message} Screenshot: ${screenshotPath}`);
        await this.saveSession();
        throw error;
      }
      throw new AutomationError(
        `${this.definition.platform} ${operationName} failed. Screenshot: ${screenshotPath}`,
        "PLATFORM_OPERATION_FAILED",
        error
      );
    }
  }

  protected async fillLoginFields(): Promise<void> {
    await this.fillFirstAvailable(["input[name='email']", "input[type='email']", "input[name='username']", "input[type='text']"], this.setup.email ?? this.setup.username);
    if (this.setup.password) {
      await this.fillFirstAvailable(["input[name='password']", "input[type='password']"], this.setup.password);
    }
  }

  protected async fillSignupFields(): Promise<void> {
    await this.fillFirstAvailable(["input[name='email']", "input[type='email']"], this.setup.email ?? "");
    await this.fillFirstAvailable(["input[name='username']", "input[autocomplete='username']", "input[type='text']"], this.setup.username);
    if (this.setup.password) {
      await this.fillFirstAvailable(["input[name='password']", "input[type='password']"], this.setup.password);
    }
  }

  protected async startGoogleSignup(): Promise<void> {
    const clicked = await this.clickFirstAvailable([
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

    if (!clicked) {
      await this.pauseForUser("No Google signup option was visible. Continue the signup flow manually in this browser.");
    }
  }

  protected async gotoProfileEditor(): Promise<void> {
    await this.page.goto(this.definition.profileUrl ?? this.definition.homeUrl, { waitUntil: "domcontentloaded" });
  }

  protected async fillProfileFields(): Promise<void> {
    await this.fillFirstAvailable(["input[name='name']", "input[aria-label='Name']"], this.setup.displayName);
    await this.fillFirstAvailable(["textarea[name='bio']", "textarea", "[contenteditable='true']"], this.setup.bio ?? "");
    await this.fillFirstAvailable(["input[name='website']", "input[type='url']"], this.setup.websiteUrl ?? "");

    const profileImagePath = normalizeOptionalPath(this.setup.profileImagePath);
    if (profileImagePath) {
      await this.uploadFirstAvailable(["input[type='file']"], profileImagePath);
    }
  }

  protected async gotoComposer(): Promise<void> {
    await this.page.goto(this.definition.postUrl ?? this.definition.homeUrl, { waitUntil: "domcontentloaded" });
  }

  protected async fillPostComposer(post: Post): Promise<void> {
    await this.fillFirstAvailable(["textarea", "[contenteditable='true']"], post.text);
    for (const mediaPath of post.mediaPaths) {
      await this.uploadFirstAvailable(["input[type='file']"], normalizeOptionalPath(mediaPath) ?? mediaPath);
    }
  }

  protected async pauseForUser(message: string): Promise<void> {
    await waitForUserConfirmation(`[${this.definition.platform}] ${message}`);
    await throwIfVerificationRequired(this.page).catch(async (error) => {
      if (error instanceof UserVerificationRequiredError) {
        await waitForUserConfirmation(`[${this.definition.platform}] Verification still appears active. Complete it before continuing.`);
      } else {
        throw error;
      }
    });
  }

  protected async fillFirstAvailable(selectors: string[], value: string): Promise<boolean> {
    if (!value) {
      return false;
    }

    for (const selector of selectors) {
      const locator = this.page.locator(selector).first();
      if (await locator.isVisible({ timeout: 1_000 }).catch(() => false)) {
        await locator.fill(value).catch(async () => {
          await locator.click();
          await this.page.keyboard.insertText(value);
        });
        return true;
      }
    }

    return false;
  }

  protected async uploadFirstAvailable(selectors: string[], filePath: string): Promise<boolean> {
    for (const selector of selectors) {
      const locator = this.page.locator(selector).first();
      if ((await locator.count()) > 0) {
        await locator.setInputFiles(filePath);
        return true;
      }
    }

    return false;
  }

  protected async clickFirstAvailable(selectors: string[]): Promise<boolean> {
    for (const selector of selectors) {
      const locator = this.page.locator(selector).first();
      if (await locator.isVisible({ timeout: 1_500 }).catch(() => false)) {
        await locator.click();
        return true;
      }
    }

    return false;
  }

  private async ensureInitialized(): Promise<void> {
    if (!this.page || !this.context) {
      await this.init();
    }
  }
}
