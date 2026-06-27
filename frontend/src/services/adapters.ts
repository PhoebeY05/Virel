import type {
  Analytics,
  Campaign,
  CampaignDay,
  CampaignStatus,
  GeneratedPost,
  Platform,
  PlatformName,
  PlatformAccount,
  PlatformAccountStatus,
  PostStatus,
  Project,
  ProjectStatus,
  AutomationSession,
} from '../types'

export interface ApiProject {
  id: string
  name: string
  description?: string
  target_audience?: string
  goal?: string
  status?: string
  repo_url?: string | null
  demo_url?: string | null
  logo_url?: string | null
  created_at?: string
  updated_at?: string
}

export interface ApiCampaign {
  id: string
  project_id: string
  title: string
  summary?: string
  goal: string
  tone?: string
  platforms?: string[]
  status?: string
  created_at?: string
  updated_at?: string
  phases?: ApiCampaignPhase[]
  posts?: ApiGeneratedPost[]
}

export interface ApiCampaignPhase {
  id: string
  phase_number: number
  theme: string
  objective: string
  posts?: ApiGeneratedPost[]
}

export interface ApiGeneratedPost {
  id: string
  campaign_id: string
  campaign_day_id: string
  platform: string
  day_number: number
  title: string
  content: string
  hashtags?: string[]
  call_to_action?: string
  scheduled_at?: string | null
  status?: string
  created_at?: string
  updated_at?: string
  likes?: number
  comments?: number
  shares?: number
  clicks?: number
  ctr?: number
}

export interface ApiAnalytics {
  likes: number
  comments: number
  shares: number
  clicks: number
  ctr: number
  engagement: number
  best_platform: string
  active_campaigns: number
  total_projects: number
  engagement_timeline: {
    date: string
    likes: number
    comments: number
    shares: number
    clicks: number
    ctr: number
  }[]
  platforms: {
    platform: string
    likes: number
    comments: number
    shares: number
    clicks: number
    ctr: number
    engagement: number
    posts: number
  }[]
  top_posts: {
    id: string
    platform: string
    title: string
    likes: number
    comments: number
    shares: number
    clicks: number
    ctr: number
    engagement: number
    scheduled_at?: string | null
  }[]
}

export interface ApiSupportedPlatform {
  name: string
  slug: string
  writing_style: string
  requires_human_verification: boolean
  phone_required: string
  automation_level: string
  notes: string
}

export interface ApiAutomationSession {
  id: string
  project_id: string
  platform: string
  status: string
  step: string
  progress: number
  payload: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface ApiPlatformAccount {
  id: string
  project_id: string
  platform: string
  username: string
  bio: string
  profile_image_url?: string | null
  account_url?: string | null
  status: string
  notes: string
  phone_required: boolean
  session_path?: string | null
  created_at: string
  updated_at: string
}

const slugToName: Record<string, PlatformName> = {
  instagram: 'Instagram',
  reddit: 'Reddit',
  linkedin: 'LinkedIn',
  tiktok: 'TikTok',
  x: 'X',
  facebook: 'Facebook',
  telegram: 'Telegram',
  hacker_news: 'Hacker News',
}

const nameToSlug = Object.fromEntries(
  Object.entries(slugToName).map(([slug, name]) => [name, slug]),
) as Record<PlatformName, string>

export function toPlatformSlug(platform: PlatformName): string {
  return nameToSlug[platform] ?? platform.toLowerCase().replaceAll(' ', '_')
}

export function toPlatformName(platform: string): PlatformName {
  return slugToName[platform] ?? (platform as PlatformName)
}

type ProjectPayload = Partial<Project> & {
  description?: string
  targetAudience?: string
  repoUrl?: string | null
  demoUrl?: string | null
  logoUrl?: string | null
}

export function toApiProject(input: ProjectPayload) {
  return {
    name: input.name ?? '',
    description: input.description ?? input.tagline ?? '',
    target_audience: input.targetAudience ?? input.platforms?.join(', ') ?? '',
    goal: input.goal ?? '',
    status: toApiProjectStatus(input.status),
    repo_url: input.repoUrl ?? undefined,
    demo_url: input.demoUrl ?? undefined,
    logo_url: input.logoUrl ?? undefined,
  }
}

export function fromApiProject(project: ApiProject): Project {
  return {
    id: project.id,
    name: project.name,
    tagline: project.description || project.goal || 'Launch-ready student project.',
    status: fromApiProjectStatus(project.status),
    platforms: [],
    progress: project.status?.toLowerCase() === 'launched' ? 94 : project.status?.toLowerCase() === 'active' ? 72 : 38,
    lastUpdated: formatDate(project.updated_at ?? project.created_at),
    description: project.description,
    targetAudience: project.target_audience,
    goal: project.goal,
    repoUrl: project.repo_url ?? null,
    demoUrl: project.demo_url ?? null,
    logoUrl: project.logo_url ?? null,
    createdAt: project.created_at,
    updatedAt: project.updated_at,
  }
}

export function fromApiCampaign(campaign: ApiCampaign): Campaign {
  const apiPosts = campaign.posts ?? []
  const posts = apiPosts.map(fromApiPost)
  const phases = (campaign.phases ?? []).map((phase) => fromApiPhase(phase, apiPosts))

  return {
    id: campaign.id,
    projectId: campaign.project_id,
    name: campaign.title,
    audience: campaign.summary || campaign.tone || 'Student launch audience',
    goal: campaign.goal,
    platforms: (campaign.platforms ?? []).map(toPlatformName),
    status: fromApiCampaignStatus(campaign.status),
    days: phases,
    posts,
    summary: campaign.summary,
    tone: campaign.tone,
    createdAt: campaign.created_at,
    updatedAt: campaign.updated_at,
  }
}

export function fromApiPhase(phase: ApiCampaignPhase, posts: ApiGeneratedPost[]): CampaignDay {
  const phasePosts = phase.posts?.length ? phase.posts : posts.filter((post) => post.campaign_day_id === phase.id)
  const firstPost = phasePosts[0]
  return {
    id: phase.id,
    day: phase.phase_number,
    title: phase.theme,
    platforms: phasePosts.map((post) => toPlatformName(post.platform)),
    content: phase.objective,
    scheduledTime: formatTime(firstPost?.scheduled_at),
    status: fromApiPostStatus(firstPost?.status),
    posts: phasePosts.map(fromApiPost),
  }
}

export function fromApiPost(post: ApiGeneratedPost): GeneratedPost & { scheduledTime?: string } {
  const likes = post.likes ?? 0
  const comments = post.comments ?? 0
  const shares = post.shares ?? 0
  const clicks = post.clicks ?? 0
  const ctr = post.ctr ?? 0
  return {
    id: post.id,
    platform: toPlatformName(post.platform),
    projectId: post.campaign_id,
    campaignId: post.campaign_id,
    campaignDayId: post.campaign_day_id,
    title: post.title,
    content: post.content,
    status: fromApiPostStatus(post.status),
    engagementEstimate: Math.round(likes + comments + shares + clicks),
    likes,
    comments,
    shares,
    clicks,
    ctr: toPercent(ctr),
    hashtags: post.hashtags ?? [],
    callToAction: post.call_to_action ?? '',
    scheduledAt: post.scheduled_at,
    scheduledTime: formatTime(post.scheduled_at),
  }
}

export function fromApiAnalytics(analytics: ApiAnalytics): Analytics {
  const timeline = analytics.engagement_timeline.map((point) => ({
    label: formatDay(point.date),
    engagement: point.likes + point.comments + point.shares + point.clicks,
    likes: point.likes,
    comments: point.comments,
    shares: point.shares,
    ctr: toPercent(point.ctr),
  }))
  const platforms = analytics.platforms.map((platform) => ({
    platform: toPlatformName(platform.platform),
    likes: platform.likes,
    comments: platform.comments,
    shares: platform.shares,
    clicks: platform.clicks,
    ctr: toPercent(platform.ctr),
    engagement: platform.engagement,
    posts: platform.posts,
  }))
  const topPosts = analytics.top_posts.map((post) => ({
    id: post.id,
    platform: toPlatformName(post.platform),
    title: post.title,
    likes: post.likes,
    comments: post.comments,
    shares: post.shares,
    clicks: post.clicks,
    ctr: toPercent(post.ctr),
    engagement: post.engagement,
    scheduledAt: post.scheduled_at,
  }))

  return {
    summary: {
      activeCampaigns: analytics.active_campaigns,
      totalProjects: analytics.total_projects,
      engagement: analytics.engagement,
      ctr: toPercent(analytics.ctr),
    },
    timeline,
    platforms,
    topPosts,
  }
}

export function fromApiPlatform(platform: ApiSupportedPlatform): Platform | null {
  const name = toPlatformName(platform.slug)
  if (!nameToSlug[name]) return null

  return {
    id: platform.slug,
    name,
    status: platform.requires_human_verification ? 'Needs verification' : 'Pending',
    username: defaultUsername(name),
    phoneRequired: platform.phone_required === 'required' || platform.phone_required === 'often',
    automation: fromApiAutomationLevel(platform.automation_level),
    notes: platform.notes,
  }
}

export function fromApiAutomationSession(session: ApiAutomationSession): AutomationSession {
  return {
    id: session.id,
    projectId: session.project_id,
    platform: toPlatformName(session.platform),
    status: session.status,
    step: session.step,
    progress: session.progress,
    payload: session.payload,
    createdAt: session.created_at,
    updatedAt: session.updated_at,
  }
}

export function fromApiPlatformAccount(account: ApiPlatformAccount): PlatformAccount {
  return {
    id: account.id,
    projectId: account.project_id,
    platform: toPlatformName(account.platform),
    username: account.username,
    bio: account.bio,
    profileImageUrl: account.profile_image_url ?? null,
    accountUrl: account.account_url ?? null,
    status: toPlatformAccountStatus(account.status),
    notes: account.notes,
    phoneRequired: account.phone_required,
    sessionPath: account.session_path ?? null,
    createdAt: account.created_at,
    updatedAt: account.updated_at,
  }
}

function toApiProjectStatus(status?: ProjectStatus): string | undefined {
  return status?.toLowerCase()
}

function fromApiProjectStatus(status = 'planning'): ProjectStatus {
  const normalized = status.toLowerCase()
  if (normalized === 'active') return 'Active'
  if (normalized === 'paused') return 'Paused'
  if (normalized === 'launched') return 'Launched'
  return 'Planning'
}

function fromApiCampaignStatus(status = 'draft'): CampaignStatus {
  const normalized = status.toLowerCase()
  if (normalized === 'scheduled') return 'Scheduled'
  if (normalized === 'live') return 'Live'
  if (normalized === 'complete') return 'Complete'
  return 'Draft'
}

function fromApiPostStatus(status = 'draft'): PostStatus {
  const normalized = status.toLowerCase()
  if (normalized === 'scheduled') return 'Scheduled'
  if (normalized === 'published') return 'Published'
  return 'Draft'
}

function fromApiAutomationLevel(level: string): Platform['automation'] {
  if (level === 'guidance-only') return 'Guidance only'
  if (level === 'assisted' || level === 'partially-assisted') return 'Assisted setup'
  return 'Ready'
}

function formatDate(value?: string) {
  return value ? value.slice(0, 10) : new Date().toISOString().slice(0, 10)
}

function formatTime(value?: string | null) {
  return value ? value.slice(11, 16) : '09:00'
}

function formatDay(value: string) {
  return new Intl.DateTimeFormat('en', { weekday: 'short' }).format(new Date(value))
}

function toPercent(value: number) {
  return value <= 1 ? Number((value * 100).toFixed(1)) : value
}

function defaultUsername(platform: PlatformName) {
  if (platform === 'Reddit') return 'u/VirelHQ'
  if (platform === 'LinkedIn') return 'Virel'
  return '@virel'
}

function toPlatformAccountStatus(value: string): PlatformAccountStatus {
  const normalized = value.toLowerCase()
  if (normalized === 'connected') return 'Connected'
  if (normalized === 'needs_verification') return 'Needs verification'
  if (normalized === 'paused') return 'Paused'
  if (normalized === 'error') return 'Error'
  if (normalized === 'planned') return 'Planned'
  return 'Pending'
}
