import { z } from "zod";
import { AccountSetupSchema, PostSchema, PlatformNameSchema } from "./platform";

export const ProjectSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  websiteUrl: z.string().url().optional()
});

export type Project = z.infer<typeof ProjectSchema>;

export const AccountSchema = AccountSetupSchema.extend({
  id: z.string(),
  platform: PlatformNameSchema,
  status: z.string().optional()
});

export type Account = z.infer<typeof AccountSchema>;

export const CampaignSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  name: z.string()
});

export type Campaign = z.infer<typeof CampaignSchema>;

export const CampaignPostSchema = PostSchema;
export type CampaignPost = z.infer<typeof CampaignPostSchema>;

export const AutomationSessionSchema = z.object({
  id: z.string(),
  platform: PlatformNameSchema,
  accountId: z.string().optional(),
  status: z.string()
});

export type AutomationSession = z.infer<typeof AutomationSessionSchema>;
