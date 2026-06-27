import { BackendClient } from "../api/backendClient";
import { BrowserManager } from "../browser/browserManager";
import { AccountSetup } from "../types/platform";
import { AutomationError, UserVerificationRequiredError } from "../utils/errors";
import { createPlatformAdapter } from "../platforms";

export class AccountSetupService {
  constructor(
    private readonly backendClient = new BackendClient(),
    private readonly browserManager = new BrowserManager()
  ) {}

  async setupAccount(setup: AccountSetup): Promise<void> {
    const session = await this.backendClient.createAutomationSession({
      platform: setup.platform,
      accountId: setup.accountId,
      status: "running",
      message: "Starting account setup"
    });

    const adapter = createPlatformAdapter(setup, this.browserManager);

    try {
      await adapter.createAccount();
      await adapter.fillProfile();
      await adapter.saveSession();

      await this.backendClient.updateAutomationSession(session.id, {
        status: "completed",
        message: "Account setup completed"
      });

      if (setup.accountId) {
        await this.backendClient.updateAccount(setup.accountId, {
          status: "connected",
          message: "Session saved"
        });
      }
    } catch (error) {
      const waiting = error instanceof UserVerificationRequiredError;
      await this.backendClient.updateAutomationSession(session.id, {
        status: waiting ? "waiting_for_user" : "failed",
        message: error instanceof Error ? error.message : "Unknown automation failure"
      });

      if (error instanceof AutomationError || error instanceof UserVerificationRequiredError) {
        throw error;
      }

      throw new AutomationError("Account setup failed.", "ACCOUNT_SETUP_FAILED", error);
    } finally {
      await this.browserManager.close();
    }
  }
}
