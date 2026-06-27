import type { PlatformAccount, PlatformAccountStatus, PlatformName } from '../types'
import { fromApiPlatformAccount, type ApiPlatformAccount } from './adapters'
import { apiRequest } from './api'

export interface AccountInput {
  platform: PlatformName
  username: string
  bio: string
  profileImageUrl?: string | null
  accountUrl?: string | null
  status?: PlatformAccountStatus
  notes?: string
  phoneRequired?: boolean
}

export async function getProjectAccounts(projectId: string): Promise<PlatformAccount[]> {
  const response = await apiRequest<ApiPlatformAccount[]>(`/projects/${projectId}/accounts`)
  return response.map(fromApiPlatformAccount)
}

export async function createProjectAccount(projectId: string, account: AccountInput): Promise<PlatformAccount> {
  const response = await apiRequest<ApiPlatformAccount>(`/projects/${projectId}/accounts`, {
    method: 'POST',
    body: JSON.stringify(toApiAccount(account)),
  })
  return fromApiPlatformAccount(response)
}

export async function updateProjectAccount(accountId: string, patch: Partial<AccountInput>): Promise<PlatformAccount> {
  const response = await apiRequest<ApiPlatformAccount>(`/accounts/${accountId}`, {
    method: 'PATCH',
    body: JSON.stringify(toApiAccountPatch(patch)),
  })
  return fromApiPlatformAccount(response)
}

export async function deleteProjectAccount(accountId: string): Promise<void> {
  await apiRequest<void>(`/accounts/${accountId}`, { method: 'DELETE' })
}

function toApiAccount(account: AccountInput) {
  return {
    platform: account.platform.toLowerCase().replaceAll(' ', '_'),
    username: account.username,
    bio: account.bio,
    profile_image_url: account.profileImageUrl ?? undefined,
    account_url: account.accountUrl ?? undefined,
    status: toApiAccountStatus(account.status),
    notes: account.notes ?? '',
    phone_required: account.phoneRequired ?? false,
  }
}

function toApiAccountPatch(patch: Partial<AccountInput>) {
  const payload: Record<string, string | boolean | null | undefined> = {}
  if (patch.platform !== undefined) payload.platform = patch.platform.toLowerCase().replaceAll(' ', '_')
  if (patch.username !== undefined) payload.username = patch.username
  if (patch.bio !== undefined) payload.bio = patch.bio
  if (patch.profileImageUrl !== undefined) payload.profile_image_url = patch.profileImageUrl
  if (patch.accountUrl !== undefined) payload.account_url = patch.accountUrl
  if (patch.status !== undefined) payload.status = toApiAccountStatus(patch.status)
  if (patch.notes !== undefined) payload.notes = patch.notes
  if (patch.phoneRequired !== undefined) payload.phone_required = patch.phoneRequired
  return payload
}

function toApiAccountStatus(status?: PlatformAccountStatus) {
  if (!status) return undefined
  return status.toLowerCase().replace(/\s+/g, '_')
}
