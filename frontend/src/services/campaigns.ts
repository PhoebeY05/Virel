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
