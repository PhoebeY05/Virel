import type { Analytics } from '../types'
import { fromApiAnalytics, type ApiAnalytics } from './adapters'
import { apiRequest } from './api'

export async function getAnalytics(): Promise<Analytics> {
  const response = await apiRequest<ApiAnalytics>('/analytics')
  return fromApiAnalytics(response)
}
