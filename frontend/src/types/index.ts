export type PlatformName =
  | 'Instagram'
  | 'Reddit'
  | 'LinkedIn'
  | 'TikTok'
  | 'X'
  | 'Facebook'
  | 'Discord'
  | 'Product Hunt'
  | 'Hacker News'

export type ProjectStatus = 'Planning' | 'Active' | 'Paused' | 'Launched'
export type PlatformStatus = 'Connected' | 'Pending' | 'Needs verification' | 'Error'
export type CampaignStatus = 'Draft' | 'Scheduled' | 'Live' | 'Complete'
export type PostStatus = 'Draft' | 'Scheduled' | 'Published'

export interface Project {
  id: string
  name: string
  tagline: string
  status: ProjectStatus
  platforms: PlatformName[]
  progress: number
  lastUpdated: string
}

export interface CampaignDay {
  id: string
  day: number
  title: string
  platforms: PlatformName[]
  content: string
  scheduledTime: string
  status: PostStatus
}

export interface GeneratedPost {
  id: string
  platform: PlatformName
  projectId: string
  title: string
  content: string
  status: PostStatus
  engagementEstimate: number
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
}

export interface AnalyticsPoint {
  label: string
  engagement: number
  likes: number
  comments: number
  shares: number
  ctr: number
}

export interface PlatformAnalytics {
  platform: PlatformName
  engagement: number
  growth: number
}

export interface TopPost {
  id: string
  title: string
  platform: PlatformName
  engagement: number
  ctr: number
}

export interface Analytics {
  summary: {
    activeCampaigns: number
    totalProjects: number
    engagement: number
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
