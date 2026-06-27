export type PlatformName =
  | 'Instagram'
  | 'Reddit'
  | 'LinkedIn'
  | 'TikTok'
  | 'X'
  | 'Facebook'
  | 'Telegram'

export type ProjectStatus = 'Planning' | 'Active' | 'Paused' | 'Launched'
export type PlatformStatus = 'Connected' | 'Pending' | 'Needs verification' | 'Error'
export type CampaignStatus = 'Draft' | 'Scheduled' | 'Live' | 'Complete'
export type PostStatus = 'Draft' | 'Scheduled' | 'Published'
export type GoogleLinkStatus = 'Not linked' | 'Pending' | 'Linked'
export type ThemeMode = 'System' | 'Light' | 'Dark'
export type PlatformAccountStatus = 'Planned' | 'Pending' | 'Connected' | 'Needs verification' | 'Paused' | 'Error'

export interface Project {
  id: string
  name: string
  tagline: string
  status: ProjectStatus
  platforms: PlatformName[]
  progress: number
  lastUpdated: string
  description?: string
  targetAudience?: string
  goal?: string
  repoUrl?: string | null
  demoUrl?: string | null
  logoUrl?: string | null
  createdAt?: string
  updatedAt?: string
}

export interface CampaignDay {
  id: string
  day: number
  title: string
  platforms: PlatformName[]
  content: string
  scheduledTime: string
  status: PostStatus
  posts?: GeneratedPost[]
}

export interface GeneratedPost {
  id: string
  platform: PlatformName
  projectId: string
  title: string
  content: string
  status: PostStatus
  engagementEstimate: number
  likes?: number
  comments?: number
  shares?: number
  clicks?: number
  ctr?: number
  campaignId?: string
  campaignDayId?: string
  hashtags?: string[]
  callToAction?: string
  scheduledAt?: string | null
  scheduledTime?: string
}

export interface Campaign {
  id: string
  projectId: string
  name: string
  audience: string
  goal: string
  platforms: PlatformName[]
  status: CampaignStatus
  days: CampaignDay[]
  posts: GeneratedPost[]
  summary?: string
  tone?: string
  createdAt?: string
  updatedAt?: string
}

export interface AnalyticsPoint {
  label: string
  engagement: number
  likes: number
  comments: number
  shares: number
  views: number
  followers: number
  ctr: number
}

export interface PlatformAnalytics {
  platform: PlatformName
  likes: number
  comments: number
  shares: number
  views: number
  followers: number
  clicks: number
  ctr: number
  engagement: number
  posts: number
}

export interface TopPost {
  id: string
  title: string
  platform: PlatformName
  likes: number
  comments: number
  shares: number
  clicks: number
  ctr: number
  engagement: number
  scheduledAt?: string | null
}

export interface Analytics {
  summary: {
    activeCampaigns: number
    totalProjects: number
    engagement: number
    views: number
    followers: number
    ctr: number
  }
  timeline: AnalyticsPoint[]
  platforms: PlatformAnalytics[]
  topPosts: TopPost[]
}

export interface Platform {
  id: string
  name: PlatformName
  status: PlatformStatus
  username: string
  phoneRequired: boolean
  automation: 'Assisted setup' | 'Guidance only' | 'Ready'
  notes?: string
}

export interface PlatformAccount {
  id: string
  projectId: string
  platform: PlatformName
  username: string
  bio: string
  profileImageUrl?: string | null
  accountUrl?: string | null
  status: PlatformAccountStatus
  notes: string
  phoneRequired: boolean
  sessionPath?: string | null
  createdAt: string
  updatedAt: string
}

export interface AutomationSession {
  id: string
  projectId: string
  platform: PlatformName
  status: string
  step: string
  progress: number
  payload: Record<string, unknown>
  createdAt: string
  updatedAt: string
}

export interface UserSettings {
  companyName: string
  legalEntityName: string
  companyStartDate: string
  websiteUrl: string
  supportEmail: string
  phoneNumber: string
  country: string
  timezone: string
  profileImageUrl: string
  backupEmail: string
  googleAccountEmail: string
  googleLinkStatus: GoogleLinkStatus
  linkedinUrl: string
  emailNotifications: boolean
  defaultTone: string
  themeMode: ThemeMode
}

export interface Comment {
  id: string
  postId: string
  author: string
  content: string
  sentiment: 'Positive' | 'Neutral' | 'Question'
}

export interface Reply {
  id: string
  commentId: string
  content: string
  tone: 'Helpful' | 'Friendly' | 'Founder'
}

export interface Media {
  id: string
  type: 'Image' | 'Video'
  url: string
  alt: string
}

export interface User {
  id: string
  name: string
  email: string
  role: string
  theme: 'System' | 'Light' | 'Dark'
}
