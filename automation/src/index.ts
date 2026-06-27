import { BackendClient } from "./api/backendClient";
import { AccountSetupService } from "./services/accountSetupService";
import { BatchPublishingService } from "./services/batchPublishingService";
import { PublishingService } from "./services/publishingService";
import { SessionResumeService } from "./services/sessionResumeService";
import { SmokeTestService } from "./services/smokeTestService";
import { SignupPrefillService } from "./services/signupPrefillService";
import { AccountSetup, AccountSetupSchema, PlatformNameSchema, PostSchema } from "./types/platform";
import { Account, Project, UserSettings } from "./types/backend";
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

const SignupPrefillInputSchema = AccountSetupSchema.extend({
  holdMs: z.number().int().min(5_000).max(900_000).optional()
});

const BatchPublishInputSchema = z.object({
  projectId: z.string(),
  displayName: z.string(),
  username: z.string(),
  bio: z.string().optional(),
  websiteUrl: z.string().url().optional(),
  profileImagePath: z.string().optional(),
  posts: z.array(PostSchema).min(1)
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

  if (command === "prefill-signup") {
    const input = SignupPrefillInputSchema.parse(parseJsonArg(args[0], "signup prefill JSON"));
    const { holdMs, ...setup } = input;
    const result = await new SignupPrefillService().prefillSignup(setup, holdMs);
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  if (command === "publish-batch") {
    const input = parseJsonArg(args[0], "publish batch JSON");
    const results = await new BatchPublishingService().publishAll(BatchPublishInputSchema.parse(input));
    console.log(JSON.stringify({ results }, null, 2));
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
  npm run prefill-signup -- '<account setup json with optional holdMs>'
  npm run smoke -- '<smoke test json>'
  npm run smoke-batch -- '<smoke batch json>'
  npm run publish -- '<account setup json>' '<post json>'
  npm run publish-batch -- '<publish batch json>'
  npm run dev -- setup-from-backend <projectId> <platform>
  npm run dev -- publish-from-backend <projectId> <campaignId> <platform>
  npm run dev -- resume-from-backend <projectId> <platform>
`);
}

async function buildAccountSetupFromBackend(
  backend: BackendClient,
  projectId: string,
  platform: z.infer<typeof PlatformNameSchema>,
): Promise<AccountSetup> {
  const [project, accounts, settings] = await Promise.all([
    backend.getProject(projectId),
    backend.getProjectAccounts(projectId),
    backend.getUserSettings(),
  ]);
  const account = accounts.find((candidate) => candidate.platform === platform);

  if (!account) {
    throw new Error(`No ${platform} account found for project ${projectId}.`);
  }

  return AccountSetupSchema.parse(buildAccountSetupInput(project, account, settings, platform));
}

function buildAccountSetupInput(
  project: Project,
  account: Account,
  settings: UserSettings,
  platform: z.infer<typeof PlatformNameSchema>,
): AccountSetup {
  const displayName = project.name;
  const bio = trimToLength(firstNonEmpty(account.bio, project.description, project.goal, project.target_audience), 500);
  const email = firstNonEmpty(settings.support_email, settings.backup_email, settings.google_account_email);
  const websiteUrl = firstNonEmpty(settings.website_url, project.demo_url ?? undefined, project.repo_url ?? undefined);
  const signupMethod = settings.google_link_status === "Linked" && settings.google_account_email ? "google" : "email";

  return {
    projectId: project.id,
    accountId: account.id,
    platform,
    signupMethod,
    email,
    password: undefined,
    displayName,
    username: account.username,
    bio,
    websiteUrl,
    profileImagePath: firstNonEmpty(project.logo_url ?? undefined, account.profile_image_url ?? undefined),
    bannerImagePath: undefined,
  };
}

function firstNonEmpty(...values: Array<string | null | undefined>): string | undefined {
  for (const value of values) {
    if (value && value.trim()) {
      return value;
    }
  }

  return undefined;
}

function trimToLength(value: string | undefined, maxLength: number): string | undefined {
  if (!value) {
    return undefined;
  }

  return value.length <= maxLength ? value : value.slice(0, maxLength).trimEnd();
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
