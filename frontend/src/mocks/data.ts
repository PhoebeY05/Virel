import type { Analytics, Campaign, Platform, PlatformName, Project, User } from '../types'

export const platformNames: PlatformName[] = [
  'Instagram',
  'Reddit',
  'LinkedIn',
  'TikTok',
  'X',
  'Facebook',
  'Discord',
  'Product Hunt',
  'Hacker News',
]

export const projects: Project[] = [
  {
    id: 'proj-1',
    name: 'StudySnap AI',
    tagline: 'Turn messy lecture notes into revision cards in seconds.',
    status: 'Active',
    platforms: ['Instagram', 'Reddit', 'TikTok', 'Product Hunt'],
    progress: 72,
    lastUpdated: '2026-06-24',
  },
  {
    id: 'proj-2',
    name: 'CampusSwap',
    tagline: 'A trusted marketplace for dorm essentials and textbooks.',
    status: 'Planning',
    platforms: ['Facebook', 'Discord', 'Reddit'],
    progress: 38,
    lastUpdated: '2026-06-22',
  },
  {
    id: 'proj-3',
    name: 'PitchPilot',
    tagline: 'AI feedback for hackathon demo scripts and slides.',
    status: 'Launched',
    platforms: ['LinkedIn', 'X', 'Hacker News', 'Product Hunt'],
    progress: 94,
    lastUpdated: '2026-06-20',
  },
  {
    id: 'proj-4',
    name: 'MindfulMiles',
    tagline: 'A gentle habit tracker for student runners.',
    status: 'Paused',
    platforms: ['Instagram', 'TikTok', 'Discord'],
    progress: 51,
    lastUpdated: '2026-06-18',
  },
]

export const campaigns: Campaign[] = [
  {
    id: 'camp-1',
    projectId: 'proj-1',
    name: 'StudySnap launch week',
    audience: 'College students preparing for finals',
    goal: 'Drive beta signups',
    platforms: ['Instagram', 'Reddit', 'TikTok', 'Product Hunt'],
    status: 'Live',
    days: [
      {
        id: 'day-1',
        day: 1,
        title: 'Problem reveal',
        platforms: ['Instagram', 'TikTok'],
        content: 'Show the pain of scattered notes and tease a faster study workflow.',
        scheduledTime: '09:00',
        status: 'Published',
      },
      {
        id: 'day-2',
        day: 2,
        title: 'Founder story',
        platforms: ['Reddit', 'LinkedIn'],
        content: 'Share why the team built StudySnap after a chaotic exam week.',
        scheduledTime: '12:30',
        status: 'Scheduled',
      },
      {
        id: 'day-3',
        day: 3,
        title: 'Demo clip',
        platforms: ['TikTok', 'Instagram'],
        content: 'Convert a real lecture screenshot into flashcards in under 20 seconds.',
        scheduledTime: '16:00',
        status: 'Draft',
      },
      {
        id: 'day-4',
        day: 4,
        title: 'Community ask',
        platforms: ['Reddit', 'Discord'],
        content: 'Ask students which classes create the worst note overload.',
        scheduledTime: '18:00',
        status: 'Draft',
      },
      {
        id: 'day-5',
        day: 5,
        title: 'Beta invite',
        platforms: ['Product Hunt', 'X'],
        content: 'Invite early users to test the beta and give feedback.',
        scheduledTime: '10:15',
        status: 'Draft',
      },
      {
        id: 'day-6',
        day: 6,
        title: 'Proof point',
        platforms: ['Instagram', 'LinkedIn'],
        content: 'Highlight mock results: 400 cards generated across 25 testers.',
        scheduledTime: '14:45',
        status: 'Draft',
      },
      {
        id: 'day-7',
        day: 7,
        title: 'Launch recap',
        platforms: ['X', 'Facebook', 'Discord'],
        content: 'Share learnings, thank testers, and point followers to the waitlist.',
        scheduledTime: '17:30',
        status: 'Draft',
      },
    ],
    posts: platformNames.map((platform, index) => ({
      id: `post-${index + 1}`,
      platform,
      projectId: 'proj-1',
      title: `${platform} launch post`,
      content: `StudySnap AI helps students turn lecture chaos into focused revision. Join the beta and help shape the study workflow students actually want.`,
      status: index < 2 ? 'Scheduled' : 'Draft',
      engagementEstimate: 52 + index * 5,
    })),
  },
]

export const analytics: Analytics = {
  summary: {
    activeCampaigns: 6,
    totalProjects: 4,
    engagement: 18420,
    ctr: 7.8,
  },
  timeline: [
    { label: 'Mon', engagement: 1800, likes: 780, comments: 120, shares: 90, ctr: 4.7 },
    { label: 'Tue', engagement: 2400, likes: 940, comments: 170, shares: 130, ctr: 5.5 },
    { label: 'Wed', engagement: 3100, likes: 1300, comments: 220, shares: 180, ctr: 6.8 },
    { label: 'Thu', engagement: 2900, likes: 1210, comments: 205, shares: 160, ctr: 6.2 },
    { label: 'Fri', engagement: 4200, likes: 1900, comments: 310, shares: 260, ctr: 8.4 },
    { label: 'Sat', engagement: 3950, likes: 1650, comments: 285, shares: 240, ctr: 8.1 },
    { label: 'Sun', engagement: 5070, likes: 2300, comments: 380, shares: 310, ctr: 9.7 },
  ],
  platforms: [
    { platform: 'TikTok', engagement: 5200, growth: 19 },
    { platform: 'Instagram', engagement: 4600, growth: 15 },
    { platform: 'Reddit', engagement: 3700, growth: 11 },
    { platform: 'Product Hunt', engagement: 2800, growth: 8 },
    { platform: 'LinkedIn', engagement: 2120, growth: 6 },
  ],
  topPosts: [
    { id: 'top-1', title: 'From lecture notes to flashcards', platform: 'TikTok', engagement: 4200, ctr: 9.8 },
    { id: 'top-2', title: 'We built this after finals week', platform: 'Reddit', engagement: 3100, ctr: 8.9 },
    { id: 'top-3', title: 'StudySnap beta is open', platform: 'Product Hunt', engagement: 2800, ctr: 8.1 },
  ],
}

export const platforms: Platform[] = [
  { id: 'plat-1', name: 'Instagram', status: 'Connected', username: '@studysnapai', phoneRequired: false, automation: 'Assisted setup' },
  { id: 'plat-2', name: 'Reddit', status: 'Connected', username: 'u/StudySnapAI', phoneRequired: false, automation: 'Assisted setup' },
  { id: 'plat-3', name: 'LinkedIn', status: 'Needs verification', username: 'StudySnap AI', phoneRequired: true, automation: 'Guidance only' },
  { id: 'plat-4', name: 'TikTok', status: 'Pending', username: '@studysnapai', phoneRequired: true, automation: 'Assisted setup' },
  { id: 'plat-5', name: 'X', status: 'Error', username: '@StudySnapAI', phoneRequired: true, automation: 'Assisted setup' },
  { id: 'plat-6', name: 'Discord', status: 'Connected', username: 'StudySnap Community', phoneRequired: false, automation: 'Ready' },
]

export const user: User = {
  id: 'user-1',
  name: 'Avery Chen',
  email: 'avery@virel.local',
  role: 'Student founder',
  theme: 'System',
}
