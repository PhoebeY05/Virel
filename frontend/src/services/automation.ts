import { platforms as seedPlatforms } from '../mocks/data'
import type { Platform } from '../types'
import { apiRequest } from './api'

let platforms = [...seedPlatforms]
const wait = (ms = 350) => new Promise((resolve) => window.setTimeout(resolve, ms))

export async function getPlatforms(): Promise<Platform[]> {
  try {
    return await apiRequest<Platform[]>('/platforms')
  } catch {
    await wait()
    return [...platforms]
  }
}

export async function connectPlatform(id: string): Promise<Platform> {
  try {
    return await apiRequest<Platform>('/automation/connect', {
      method: 'POST',
      body: JSON.stringify({ platformId: id }),
    })
  } catch {
    await wait()
    platforms = platforms.map((platform) =>
      platform.id === id ? { ...platform, status: 'Pending' } : platform,
    )
    const updated = platforms.find((platform) => platform.id === id)
    if (!updated) throw new Error('Platform not found')
    return updated
  }
}

export async function disconnectPlatform(id: string): Promise<Platform> {
  try {
    return await apiRequest<Platform>('/automation/disconnect', {
      method: 'POST',
      body: JSON.stringify({ platformId: id }),
    })
  } catch {
    await wait()
    platforms = platforms.map((platform) =>
      platform.id === id ? { ...platform, status: 'Needs verification' } : platform,
    )
    const updated = platforms.find((platform) => platform.id === id)
    if (!updated) throw new Error('Platform not found')
    return updated
  }
}
