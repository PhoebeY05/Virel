import { analytics } from '../mocks/data'
import type { Analytics } from '../types'
import { fromApiAnalytics, type ApiAnalytics, type ApiCampaign, type ApiProject } from './adapters'
import { apiRequest } from './api'

const wait = (ms = 350) => new Promise((resolve) => window.setTimeout(resolve, ms))

export async function getAnalytics(): Promise<Analytics> {
  try {
    const [response, projects, campaigns] = await Promise.all([
      apiRequest<ApiAnalytics>('/analytics'),
      apiRequest<ApiProject[]>('/projects').catch(() => []),
      apiRequest<ApiCampaign[]>('/campaigns').catch(() => []),
    ])
    return fromApiAnalytics(response, {
      activeCampaigns: campaigns.length,
      totalProjects: projects.length,
    })
  } catch {
    await wait()
    return { ...analytics }
  }
}
