import { z } from "zod";

export const PlatformNameSchema = z.enum([
  "instagram",
  "facebook",
  "x",
  "reddit",
  "linkedin",
  "tiktok",
  "xiaohongshu",
  "producthunt"
]);

export type PlatformName = z.infer<typeof PlatformNameSchema>;

export const AccountSetupSchema = z.object({
  projectId: z.string(),
  accountId: z.string().optional(),
  platform: PlatformNameSchema,
  email: z.string().email().optional(),
  password: z.string().optional(),
  displayName: z.string(),
  username: z.string(),
  bio: z.string().max(500).optional(),
  websiteUrl: z.string().url().optional(),
  profileImagePath: z.string().optional(),
  bannerImagePath: z.string().optional()
});

export type AccountSetup = z.infer<typeof AccountSetupSchema>;

export const PostSchema = z.object({
  campaignId: z.string(),
  postId: z.string(),
  accountId: z.string(),
  platform: PlatformNameSchema,
  text: z.string().min(1),
  mediaPaths: z.array(z.string()).default([]),
  linkUrl: z.string().url().optional()
});

export type Post = z.infer<typeof PostSchema>;

export type AutomationStatus =
  | "pending"
  | "running"
  | "waiting_for_user"
  | "completed"
  | "failed";

export interface PlatformAdapter {
  login(): Promise<void>;
  createAccount(): Promise<void>;
  fillProfile(): Promise<void>;
  publishPost(post: Post): Promise<void>;
  logout(): Promise<void>;
  saveSession(): Promise<void>;
  restoreSession(): Promise<boolean>;
}
