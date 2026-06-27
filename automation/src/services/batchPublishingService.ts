import { BrowserManager } from "../browser/browserManager";
import { createPlatformAdapter } from "../platforms";
import { AccountSetup, PlatformName, Post } from "../types/platform";

export interface BatchPublishInput {
  projectId: string;
  displayName: string;
  username: string;
  bio?: string;
  websiteUrl?: string;
  profileImagePath?: string;
  posts: Array<Post & { platform: PlatformName }>;
}

export interface BatchPublishResult {
  platform: PlatformName;
  postId: string;
  status: "prepared" | "skipped" | "failed";
  message: string;
}

const guidanceOnlyPlatforms = new Set<PlatformName>(["instagram", "facebook", "tiktok", "xiaohongshu", "producthunt"]);

export class BatchPublishingService {
  async publishAll(input: BatchPublishInput): Promise<BatchPublishResult[]> {
    const results: BatchPublishResult[] = [];

    for (const post of input.posts) {
      if (guidanceOnlyPlatforms.has(post.platform)) {
        results.push({
          platform: post.platform,
          postId: post.postId,
          status: "skipped",
          message: "Browser-assisted composer filling is not enabled for this platform yet."
        });
        continue;
      }

      const browserManager = new BrowserManager();
      const setup: AccountSetup = {
        projectId: input.projectId,
        platform: post.platform,
        signupMethod: "google",
        displayName: input.displayName,
        username: input.username,
        bio: input.bio,
        websiteUrl: input.websiteUrl,
        profileImagePath: input.profileImagePath
      };
      const adapter = createPlatformAdapter(setup, browserManager);

      try {
        await adapter.login();
        await adapter.publishPost(post);
        await adapter.saveSession();
        results.push({
          platform: post.platform,
          postId: post.postId,
          status: "prepared",
          message: "Composer prepared. User reviewed and completed the platform flow."
        });
      } catch (error) {
        results.push({
          platform: post.platform,
          postId: post.postId,
          status: "failed",
          message: error instanceof Error ? error.message : "Unknown publishing failure."
        });
      } finally {
        await browserManager.close();
      }
    }

    return results;
  }
}
