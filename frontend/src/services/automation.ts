import type { AutomationSession, Platform, PlatformName } from '../types'
import {
  fromApiAutomationSession,
  fromApiPlatform,
  type ApiAutomationSession,
  type ApiSupportedPlatform,
} from './adapters'
import { apiRequest } from './api'

export interface AutomationConnectInput {
  projectId: string
  platform: PlatformName
  payload: Record<string, unknown>
  status?: string
  step?: string
  progress?: number
}

export interface AutomationSessionCreateInput {
  projectId: string
  platform: PlatformName
  status?: string
  step?: string
  progress?: number
  payload?: Record<string, unknown>
}

export async function getPlatforms(): Promise<Platform[]> {
  const response = await apiRequest<ApiSupportedPlatform[]>('/platforms')
  return response.map(fromApiPlatform).filter((platform): platform is Platform => platform !== null)
}

export async function connectAutomation(input: AutomationConnectInput): Promise<AutomationSession> {
  const response = await apiRequest<ApiAutomationSession>('/automation/connect', {
    method: 'POST',
    body: JSON.stringify({
      project_id: input.projectId,
      platform: input.platform.toLowerCase().replaceAll(' ', '_'),
      payload: input.payload,
      status: input.status ?? 'queued',
      step: input.step ?? 'connect_requested',
      progress: input.progress ?? 0,
    }),
  })
  return fromApiAutomationSession(response)
}

export async function createAutomationSession(input: AutomationSessionCreateInput): Promise<AutomationSession> {
  const response = await apiRequest<ApiAutomationSession>('/automation/sessions', {
    method: 'POST',
    body: JSON.stringify({
      project_id: input.projectId,
      platform: input.platform.toLowerCase().replaceAll(' ', '_'),
      status: input.status ?? 'queued',
      step: input.step ?? 'created',
      progress: input.progress ?? 0,
      payload: input.payload ?? {},
    }),
  })
  return fromApiAutomationSession(response)
}

export async function updateAutomationSession(
  sessionId: string,
  patch: Partial<AutomationSession>,
): Promise<AutomationSession> {
  const response = await apiRequest<ApiAutomationSession>(`/automation/sessions/${sessionId}`, {
    method: 'PATCH',
    body: JSON.stringify({
      status: patch.status,
      step: patch.step,
      progress: patch.progress,
      payload: patch.payload,
    }),
  })
  return fromApiAutomationSession(response)
}

export async function getAutomationSession(sessionId: string): Promise<AutomationSession> {
  const response = await apiRequest<ApiAutomationSession>(`/automation/sessions/${sessionId}`)
  return fromApiAutomationSession(response)
}

export async function getAutomationSessions(): Promise<AutomationSession[]> {
  const response = await apiRequest<ApiAutomationSession[]>('/automation/sessions')
  return response.map(fromApiAutomationSession)
}
