import type { Campaign, PlatformName } from '../types'
import { fromApiCampaign, toPlatformSlug, type ApiCampaign } from './adapters'
import { apiRequest } from './api'

export interface GenerateCampaignInput {
  projectId: string
  goal: string
  platforms: PlatformName[]
  tone?: string
  title?: string
}

export async function getCampaigns(): Promise<Campaign[]> {
  const response = await apiRequest<ApiCampaign[]>('/campaigns')
  return response.map(fromApiCampaign)
}

export async function getCampaign(campaignId: string): Promise<Campaign> {
  const response = await apiRequest<ApiCampaign>(`/campaigns/${campaignId}`)
  return fromApiCampaign(response)
}

export async function generateCampaign(input: GenerateCampaignInput): Promise<Campaign> {
  const response = await apiRequest<ApiCampaign>('/campaigns/generate', {
    method: 'POST',
    body: JSON.stringify({
      project_id: input.projectId,
      goal: input.goal,
      platforms: input.platforms.map(toPlatformSlug),
      tone: input.tone ?? 'confident',
      title: input.title,
    }),
  })
  return fromApiCampaign(response)
}

export async function updateCampaign(
  campaignId: string,
  patch: {
    title?: string
    summary?: string
    goal?: string
    tone?: string
    status?: string
    platforms?: PlatformName[]
  },
): Promise<Campaign> {
  const response = await apiRequest<ApiCampaign>(`/campaigns/${campaignId}`, {
    method: 'PATCH',
    body: JSON.stringify({
      title: patch.title,
      summary: patch.summary,
      goal: patch.goal,
      tone: patch.tone,
      status: patch.status?.toLowerCase(),
      platforms: patch.platforms?.map(toPlatformSlug),
    }),
  })
  return fromApiCampaign(response)
}
