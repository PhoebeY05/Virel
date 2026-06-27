import type { AutomationSession, GeneratedPost, Platform, PlatformName } from '../types'
import {
  fromApiAutomationSession,
  fromApiPlatform,
  type ApiAutomationSession,
  type ApiSupportedPlatform,
  toPlatformSlug,
} from './adapters'
import { apiRequest } from './api'

export interface AutomationConnectInput {
  projectId: string
  platform: PlatformName
  payload: Record<string, unknown>
  status?: string
  step?: string
  progress?: number
}

export interface AutomationSessionCreateInput {
  projectId: string
  platform: PlatformName
  status?: string
  step?: string
  progress?: number
  payload?: Record<string, unknown>
}

export interface AutomationSmokeRunInput {
  platform: PlatformName
  signupMethod?: 'email' | 'google'
  email?: string
  username: string
  password?: string
  displayName: string
  bio?: string
  holdMs?: number
}

export interface AutomationSmokeBatchInput {
  runs: AutomationSmokeRunInput[]
}

export interface AutomationSmokeBatchResult {
  status: string
  pid: number
  platforms: string[]
  count: number
  logPath: string
  message: string
}

export interface AutomationResumeResult {
  status: string
  pid: number
  platform: string
  logPath: string
  message: string
}

export async function getPlatforms(): Promise<Platform[]> {
  const response = await apiRequest<ApiSupportedPlatform[]>('/platforms')
  return response.map(fromApiPlatform).filter((platform): platform is Platform => platform !== null)
}

export async function launchAutomationSignup(input: AutomationLaunchInput): Promise<AutomationLaunchResult> {
  const platform = toPlatformSlug(input.platform).replace('product_hunt', 'producthunt')
  return apiRequest<AutomationLaunchResult>('/automation/prefill-signup', {
    method: 'POST',
    body: JSON.stringify({
      projectId: input.projectId,
      platform,
      email: input.email,
      password: input.password,
      username: input.username,
      displayName: input.displayName,
      bio: input.bio,
      websiteUrl: input.websiteUrl,
      profileImagePath: input.profileImagePath,
      signupMethod: input.signupMethod ?? 'email',
      holdMs: input.holdMs ?? 300000,
    }),
  })
}

export async function launchPublishBatch(input: PublishBatchInput): Promise<AutomationLaunchResult> {
  const supportedPosts = input.posts
    .map((post) => ({
      post,
      platform: toPlatformSlug(post.platform).replace('product_hunt', 'producthunt'),
    }))
    .filter(({ platform }) =>
      ['instagram', 'facebook', 'x', 'reddit', 'linkedin', 'tiktok', 'xiaohongshu', 'producthunt'].includes(platform),
    )

  if (supportedPosts.length === 0) {
    throw new Error('No generated posts are currently supported by the browser publishing assistant.')
  }

  return apiRequest<AutomationLaunchResult>('/automation/publish-batch', {
    method: 'POST',
    body: JSON.stringify({
      projectId: input.projectId,
      displayName: input.displayName,
      username: input.username,
      bio: input.bio,
      websiteUrl: input.websiteUrl,
      profileImagePath: input.profileImagePath,
      posts: supportedPosts.map(({ post, platform }) => ({
        campaignId: post.campaignId ?? post.projectId,
        postId: post.id,
        accountId: `${platform}-connected-account`,
        platform,
        text: [post.content, post.hashtags?.join(' '), post.callToAction].filter(Boolean).join('\n\n'),
        mediaPaths: [],
      })),
    }),
  })
}

export async function connectAutomation(input: AutomationConnectInput): Promise<AutomationSession> {
  const response = await apiRequest<ApiAutomationSession>('/automation/connect', {
    method: 'POST',
    body: JSON.stringify({
      project_id: input.projectId,
      platform: input.platform.toLowerCase().replaceAll(' ', '_'),
      payload: input.payload,
      status: input.status ?? 'queued',
      step: input.step ?? 'connect_requested',
      progress: input.progress ?? 0,
    }),
  })
  return fromApiAutomationSession(response)
}

export async function createAutomationSession(input: AutomationSessionCreateInput): Promise<AutomationSession> {
  const response = await apiRequest<ApiAutomationSession>('/automation/sessions', {
    method: 'POST',
    body: JSON.stringify({
      project_id: input.projectId,
      platform: input.platform.toLowerCase().replaceAll(' ', '_'),
      status: input.status ?? 'queued',
      step: input.step ?? 'created',
      progress: input.progress ?? 0,
      payload: input.payload ?? {},
    }),
  })
  return fromApiAutomationSession(response)
}

export async function updateAutomationSession(
  sessionId: string,
  patch: Partial<AutomationSession>,
): Promise<AutomationSession> {
  const response = await apiRequest<ApiAutomationSession>(`/automation/sessions/${sessionId}`, {
    method: 'PATCH',
    body: JSON.stringify({
      status: patch.status,
      step: patch.step,
      progress: patch.progress,
      payload: patch.payload,
    }),
  })
  return fromApiAutomationSession(response)
}

export async function getAutomationSession(sessionId: string): Promise<AutomationSession> {
  const response = await apiRequest<ApiAutomationSession>(`/automation/sessions/${sessionId}`)
  return fromApiAutomationSession(response)
}

export async function getAutomationSessions(): Promise<AutomationSession[]> {
  const response = await apiRequest<ApiAutomationSession[]>('/automation/sessions')
  return response.map(fromApiAutomationSession)
}

export async function startAutomationSmokeBatch(input: AutomationSmokeBatchInput): Promise<AutomationSmokeBatchResult> {
  return apiRequest<AutomationSmokeBatchResult>('/automation/test-setup/batch', {
    method: 'POST',
    body: JSON.stringify({
      runs: input.runs.map((run) => ({
        platform: run.platform.toLowerCase().replaceAll(' ', '_'),
        signupMethod: run.signupMethod ?? 'email',
        email: run.email ?? undefined,
        username: run.username,
        password: run.password ?? undefined,
        displayName: run.displayName,
        bio: run.bio ?? undefined,
        holdMs: run.holdMs ?? 15_000,
      })),
    }),
  })
}

export async function resumeAutomationSession(projectId: string, platform: PlatformName): Promise<AutomationResumeResult> {
  return apiRequest<AutomationResumeResult>('/automation/resume-session', {
    method: 'POST',
    body: JSON.stringify({
      project_id: projectId,
      platform: platform.toLowerCase().replaceAll(' ', '_'),
    }),
  })
}
