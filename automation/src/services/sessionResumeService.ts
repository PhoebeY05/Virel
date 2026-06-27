import { BackendClient } from "../api/backendClient";
import { BrowserManager } from "../browser/browserManager";
import { createPlatformAdapter } from "../platforms";
import { AccountSetup } from "../types/platform";
import { AutomationError, UserVerificationRequiredError } from "../utils/errors";

export class SessionResumeService {
  constructor(
    private readonly backendClient = new BackendClient(),
    private readonly browserManager = new BrowserManager()
  ) {}

  async resumeSession(setup: AccountSetup): Promise<void> {
    const session = await this.backendClient.createAutomationSession({
      platform: setup.platform,
      accountId: setup.accountId,
      status: "running",
      message: "Restoring saved browser session"
    });

    const adapter = createPlatformAdapter(setup, this.browserManager);

    try {
      await adapter.login();
      const sessionPath = await adapter.saveSession();

      if (setup.accountId) {
        await this.backendClient.updateAccount(setup.accountId, {
          status: "connected",
          sessionPath,
          message: "Session restored"
        });
      }

      await this.backendClient.updateAutomationSession(session.id, {
        status: "completed",
        message: "Browser session restored"
      });
    } catch (error) {
      const waiting = error instanceof UserVerificationRequiredError;
      await this.backendClient.updateAutomationSession(session.id, {
        status: waiting ? "waiting_for_user" : "failed",
        message: error instanceof Error ? error.message : "Unknown automation failure"
      });

      if (error instanceof AutomationError || error instanceof UserVerificationRequiredError) {
        throw error;
      }

      throw new AutomationError("Session resume failed.", "SESSION_RESUME_FAILED", error);
    } finally {
      await this.browserManager.close();
    }
  }
}
