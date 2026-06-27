import { BackendClient } from "../api/backendClient";
import { BrowserManager } from "../browser/browserManager";
import { createPlatformAdapter } from "../platforms";
import { AccountSetup, Post } from "../types/platform";

export class PublishingService {
  constructor(
    private readonly backendClient = new BackendClient(),
    private readonly browserManager = new BrowserManager()
  ) {}

  async publish(setup: AccountSetup, post: Post): Promise<void> {
    const session = await this.backendClient.createAutomationSession({
      platform: setup.platform,
      accountId: setup.accountId,
      status: "running",
      message: `Publishing post ${post.postId}`
    });

    const adapter = createPlatformAdapter(setup, this.browserManager);

    try {
      await adapter.login();
      await adapter.publishPost(post);
      const sessionPath = await adapter.saveSession();
      if (setup.accountId) {
        await this.backendClient.updateAccount(setup.accountId, {
          status: "connected",
          sessionPath,
          message: "Session saved"
        });
      }
      await this.backendClient.updateAutomationSession(session.id, {
        status: "completed",
        message: "Post prepared/published successfully"
      });
    } catch (error) {
      await this.backendClient.updateAutomationSession(session.id, {
        status: "failed",
        message: error instanceof Error ? error.message : "Unknown publishing failure"
      });
      throw error;
    } finally {
      await this.browserManager.close();
    }
  }
}
