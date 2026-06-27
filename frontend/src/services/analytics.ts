import type { Analytics } from '../types'
import { fromApiAnalytics, type ApiAnalytics, type ApiCampaign, type ApiProject } from './adapters'
import { apiRequest } from './api'

export async function getAnalytics(): Promise<Analytics> {
  const [response, projects, campaigns] = await Promise.all([
    apiRequest<ApiAnalytics>('/analytics'),
    apiRequest<ApiProject[]>('/projects'),
    apiRequest<ApiCampaign[]>('/campaigns'),
  ])

  return fromApiAnalytics(response, {
    activeCampaigns: campaigns.length,
    totalProjects: projects.length,
  })
}
