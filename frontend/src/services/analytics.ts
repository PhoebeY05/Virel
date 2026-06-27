import { analytics } from '../mocks/data'
import type { Analytics } from '../types'
import { apiRequest } from './api'

const wait = (ms = 350) => new Promise((resolve) => window.setTimeout(resolve, ms))

export async function getAnalytics(): Promise<Analytics> {
  try {
    return await apiRequest<Analytics>('/analytics')
  } catch {
    await wait()
    return { ...analytics }
  }
}
