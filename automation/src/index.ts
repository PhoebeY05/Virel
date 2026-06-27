import { BackendClient } from "./api/backendClient";
import { AccountSetupService } from "./services/accountSetupService";
import { PublishingService } from "./services/publishingService";
import { SmokeTestService } from "./services/smokeTestService";
import { AccountSetupSchema, PlatformNameSchema, PostSchema } from "./types/platform";
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

  if (command === "setup-from-backend") {
    const [projectId, platformName] = args;
    const platform = PlatformNameSchema.parse(platformName);
    const backend = new BackendClient();
    const accounts = await backend.getProjectAccounts(projectId);
    const account = accounts.find((candidate) => candidate.platform === platform);

    if (!account) {
      throw new Error(`No ${platform} account found for project ${projectId}.`);
    }

    await new AccountSetupService(backend).setupAccount(AccountSetupSchema.parse(account));
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
    const accounts = await backend.getProjectAccounts(projectId);
    const posts = await backend.getCampaignPosts(campaignId);
    const account = accounts.find((candidate) => candidate.platform === platform);
    const post = posts.find((candidate) => candidate.platform === platform);

    if (!account || !post) {
      throw new Error(`Missing ${platform} account or post for project ${projectId} campaign ${campaignId}.`);
    }

    await new PublishingService(backend).publish(AccountSetupSchema.parse(account), PostSchema.parse(post));
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
  npm run publish -- '<account setup json>' '<post json>'
  npm run dev -- setup-from-backend <projectId> <platform>
  npm run dev -- publish-from-backend <projectId> <campaignId> <platform>
`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
