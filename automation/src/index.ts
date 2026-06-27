import { BackendClient } from "./api/backendClient";
import { AccountSetupService } from "./services/accountSetupService";
import { PublishingService } from "./services/publishingService";
import { SessionResumeService } from "./services/sessionResumeService";
import { SmokeTestService } from "./services/smokeTestService";
import { AccountSetup, AccountSetupSchema, PlatformNameSchema, PostSchema } from "./types/platform";
import { z } from "zod";

const SmokeTestInputSchema = AccountSetupSchema.pick({
  platform: true,
  email: true,
  username: true,
  password: true,
  displayName: true,
  bio: true,
  signupMethod: true
}).extend({
  holdMs: z.number().int().min(5_000).max(900_000).optional()
});

const SmokeBatchInputSchema = z.object({
  runs: z.array(SmokeTestInputSchema).min(1)
});

async function main(): Promise<void> {
  const [, , command, ...args] = process.argv;

  if (command === "setup") {
    const input = parseJsonArg(args[0], "setup JSON");
    await new AccountSetupService().setupAccount(AccountSetupSchema.parse(input));
    return;
  }

  if (command === "smoke") {
    const input = parseJsonArg(args[0], "smoke test JSON");
    await new SmokeTestService().openSignup(SmokeTestInputSchema.parse(input));
    return;
  }

  if (command === "smoke-batch") {
    const input = parseJsonArg(args[0], "smoke batch JSON");
    await new SmokeTestService().openBatchSignups(SmokeBatchInputSchema.parse(input));
    return;
  }

  if (command === "setup-from-backend") {
    const [projectId, platformName] = args;
    const platform = PlatformNameSchema.parse(platformName);
    const backend = new BackendClient();
    const setup = await buildAccountSetupFromBackend(backend, projectId, platform);

    await new AccountSetupService(backend).setupAccount(setup);
    return;
  }

  if (command === "publish") {
    const setupInput = parseJsonArg(args[0], "account setup JSON");
    const postInput = parseJsonArg(args[1], "post JSON");
    await new PublishingService().publish(AccountSetupSchema.parse(setupInput), PostSchema.parse(postInput));
    return;
  }

  if (command === "publish-from-backend") {
    const [projectId, campaignId, platformName] = args;
    const platform = PlatformNameSchema.parse(platformName);
    const backend = new BackendClient();
    const setup = await buildAccountSetupFromBackend(backend, projectId, platform);
    const posts = await backend.getCampaignPosts(campaignId);
    const post = posts.find((candidate) => candidate.platform === platform);

    if (!post) {
      throw new Error(`Missing ${platform} post for project ${projectId} campaign ${campaignId}.`);
    }

    await new PublishingService(backend).publish(setup, PostSchema.parse(post));
    return;
  }

  if (command === "resume-from-backend") {
    const [projectId, platformName] = args;
    const platform = PlatformNameSchema.parse(platformName);
    const backend = new BackendClient();
    const setup = await buildAccountSetupFromBackend(backend, projectId, platform);

    await new SessionResumeService(backend).resumeSession(setup);
    return;
  }

  printUsage();
}

function parseJsonArg(value: string | undefined, label: string): unknown {
  if (!value) {
    throw new Error(`Missing ${label}.`);
  }

  return JSON.parse(value);
}

function printUsage(): void {
  console.log(`Virel automation service

Commands:
  npm run setup -- '<account setup json>'
  npm run smoke -- '<smoke test json>'
  npm run smoke-batch -- '<smoke batch json>'
  npm run publish -- '<account setup json>' '<post json>'
  npm run dev -- setup-from-backend <projectId> <platform>
  npm run dev -- publish-from-backend <projectId> <campaignId> <platform>
  npm run dev -- resume-from-backend <projectId> <platform>
`);
}

async function buildAccountSetupFromBackend(backend: BackendClient, projectId: string, platform: z.infer<typeof PlatformNameSchema>): Promise<AccountSetup> {
  const accounts = await backend.getProjectAccounts(projectId);
  const account = accounts.find((candidate) => candidate.platform === platform);

  if (!account) {
    throw new Error(`No ${platform} account found for project ${projectId}.`);
  }

  const settings = await backend.getUserSettings();

  return {
    projectId,
    accountId: account.id,
    platform,
    signupMethod: "email",
    email: settings.support_email || settings.backup_email || settings.google_account_email || undefined,
    password: undefined,
    displayName: settings.display_name || account.username,
    username: account.username,
    bio: account.bio || settings.brand_bio || "",
    websiteUrl: settings.website_url || account.account_url || undefined,
    profileImagePath: undefined,
    bannerImagePath: undefined
  };
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
