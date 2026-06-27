import { campaigns, platformNames } from '../mocks/data'
import type { Campaign, CampaignDay, GeneratedPost, PlatformName } from '../types'
import { fromApiCampaign, toPlatformSlug, type ApiCampaign } from './adapters'
import { apiRequest } from './api'

let campaignStore = [...campaigns]
const wait = (ms = 400) => new Promise((resolve) => window.setTimeout(resolve, ms))

export async function getCampaigns(): Promise<Campaign[]> {
  try {
    const response = await apiRequest<ApiCampaign[]>('/campaigns')
    return response.map(fromApiCampaign)
  } catch {
    await wait()
    return [...campaignStore]
  }
}

export async function generateCampaign(input: {
  projectId: string
  projectName: string
  audience: string
  goal: string
  platforms: PlatformName[]
}): Promise<Campaign> {
  try {
    const response = await apiRequest<ApiCampaign>('/campaigns/generate', {
      method: 'POST',
      body: JSON.stringify({
        project_id: input.projectId,
        goal: input.goal,
        platforms: input.platforms.map(toPlatformSlug),
        title: `${input.projectName} generated launch`,
        tone: 'confident',
      }),
    })
    return fromApiCampaign(response)
  } catch {
    await wait(600)
    const selectedPlatforms = input.platforms.length ? input.platforms : platformNames.slice(0, 4)
    const days: CampaignDay[] = Array.from({ length: 7 }, (_, index) => ({
      id: `generated-day-${Date.now()}-${index}`,
      day: index + 1,
      title: ['Hook', 'Story', 'Demo', 'Community', 'Proof', 'Invite', 'Recap'][index],
      platforms: selectedPlatforms.slice(0, Math.min(selectedPlatforms.length, index % 3 + 1)),
      content: `${input.projectName} campaign day ${index + 1}: speak to ${input.audience.toLowerCase()} and move them toward ${input.goal.toLowerCase()}.`,
      scheduledTime: `${String(9 + index).padStart(2, '0')}:00`,
      status: 'Draft',
    }))
    const posts: GeneratedPost[] = selectedPlatforms.map((platform, index) => ({
      id: `generated-post-${Date.now()}-${index}`,
      platform,
      projectId: input.projectId,
      title: `${input.projectName} on ${platform}`,
      content: `Launch note for ${platform}: ${input.projectName} is built for ${input.audience.toLowerCase()}. ${input.goal}.`,
      status: 'Draft',
      engagementEstimate: 58 + index * 7,
    }))
    const campaign: Campaign = {
      id: `camp-${Date.now()}`,
      projectId: input.projectId,
      name: `${input.projectName} generated launch`,
      audience: input.audience,
      goal: input.goal,
      platforms: selectedPlatforms,
      status: 'Draft',
      days,
      posts,
    }
    campaignStore = [campaign, ...campaignStore]
    return campaign
  }
}
