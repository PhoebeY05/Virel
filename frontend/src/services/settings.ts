import type { GoogleLinkStatus, ThemeMode, UserSettings } from '../types'
import { apiRequest } from './api'

export interface ApiUserSettings {
  id: string
  user_id: string
  company_name: string
  legal_entity_name: string
  company_start_date: string
  website_url: string
  support_email: string
  phone_number: string
  country: string
  timezone: string
  display_name: string
  brand_handle: string
  brand_bio: string
  profile_image_url?: string | null
  backup_email: string
  google_account_email: string
  google_link_status: string
  linkedin_url: string
  instagram_handle: string
  x_handle: string
  tiktok_handle: string
  reddit_username: string
  email_notifications: boolean
  default_tone: string
  theme_mode: string
}

export async function getUserSettings(): Promise<UserSettings> {
  const response = await apiRequest<ApiUserSettings>('/settings')
  return fromApiUserSettings(response)
}

export async function updateUserSettings(settings: UserSettings): Promise<UserSettings> {
  const response = await apiRequest<ApiUserSettings>('/settings', {
    method: 'PUT',
    body: JSON.stringify(toApiUserSettings(settings)),
  })
  return fromApiUserSettings(response)
}

export function fromApiUserSettings(settings: ApiUserSettings): UserSettings {
  return {
    companyName: settings.company_name,
    legalEntityName: settings.legal_entity_name,
    companyStartDate: settings.company_start_date,
    websiteUrl: settings.website_url,
    supportEmail: settings.support_email,
    phoneNumber: settings.phone_number,
    country: settings.country,
    timezone: settings.timezone,
    displayName: settings.display_name,
    brandHandle: settings.brand_handle,
    brandBio: settings.brand_bio,
    profileImageUrl: settings.profile_image_url ?? '',
    backupEmail: settings.backup_email,
    googleAccountEmail: settings.google_account_email,
    googleLinkStatus: toGoogleLinkStatus(settings.google_link_status),
    linkedinUrl: settings.linkedin_url,
    instagramHandle: settings.instagram_handle,
    xHandle: settings.x_handle,
    tiktokHandle: settings.tiktok_handle,
    redditUsername: settings.reddit_username,
    emailNotifications: settings.email_notifications,
    defaultTone: settings.default_tone,
    themeMode: toThemeMode(settings.theme_mode),
  }
}

function toApiUserSettings(settings: UserSettings): Record<string, string | boolean | null> {
  return {
    company_name: settings.companyName,
    legal_entity_name: settings.legalEntityName,
    company_start_date: settings.companyStartDate,
    website_url: settings.websiteUrl,
    support_email: settings.supportEmail,
    phone_number: settings.phoneNumber,
    country: settings.country,
    timezone: settings.timezone,
    display_name: settings.displayName,
    brand_handle: settings.brandHandle,
    brand_bio: settings.brandBio,
    profile_image_url: settings.profileImageUrl || null,
    backup_email: settings.backupEmail,
    google_account_email: settings.googleAccountEmail,
    google_link_status: settings.googleLinkStatus,
    linkedin_url: settings.linkedinUrl,
    instagram_handle: settings.instagramHandle,
    x_handle: settings.xHandle,
    tiktok_handle: settings.tiktokHandle,
    reddit_username: settings.redditUsername,
    email_notifications: settings.emailNotifications,
    default_tone: settings.defaultTone,
    theme_mode: settings.themeMode,
  }
}

function toGoogleLinkStatus(value: string): GoogleLinkStatus {
  if (value === 'Pending') return 'Pending'
  if (value === 'Linked') return 'Linked'
  return 'Not linked'
}

function toThemeMode(value: string): ThemeMode {
  if (value === 'Light') return 'Light'
  if (value === 'Dark') return 'Dark'
  return 'System'
}
