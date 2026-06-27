import type { Project, ProjectStatus } from '../types'
import { fromApiProject, type ApiProject } from './adapters'
import { apiRequest } from './api'

export interface ProjectInput {
  name: string
  description: string
  targetAudience: string
  goal: string
  status: ProjectStatus
  repoUrl?: string | null
  demoUrl?: string | null
  logoUrl?: string | null
}

export async function getProjects(): Promise<Project[]> {
  const response = await apiRequest<ApiProject[]>('/projects')
  return response.map(fromApiProject)
}

export async function createProject(project: ProjectInput): Promise<Project> {
  const response = await apiRequest<ApiProject>('/projects', {
    method: 'POST',
    body: JSON.stringify(toCreatePayload(project)),
  })
  return fromApiProject(response)
}

export async function updateProject(id: string, patch: Partial<ProjectInput>): Promise<Project> {
  const response = await apiRequest<ApiProject>(`/projects/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(toPatchPayload(patch)),
  })
  return fromApiProject(response)
}

export async function deleteProject(id: string): Promise<void> {
  await apiRequest<void>(`/projects/${id}`, { method: 'DELETE' })
}

function toCreatePayload(project: ProjectInput) {
  return {
    name: project.name,
    description: project.description,
    target_audience: project.targetAudience,
    goal: project.goal,
    status: project.status.toLowerCase(),
    repo_url: project.repoUrl ?? undefined,
    demo_url: project.demoUrl ?? undefined,
    logo_url: project.logoUrl ?? undefined,
  }
}

function toPatchPayload(patch: Partial<ProjectInput>) {
  const payload: Record<string, string | null | undefined> = {}

  if (patch.name !== undefined) payload.name = patch.name
  if (patch.description !== undefined) payload.description = patch.description
  if (patch.targetAudience !== undefined) payload.target_audience = patch.targetAudience
  if (patch.goal !== undefined) payload.goal = patch.goal
  if (patch.status !== undefined) payload.status = patch.status.toLowerCase()
  if (patch.repoUrl !== undefined) payload.repo_url = patch.repoUrl
  if (patch.demoUrl !== undefined) payload.demo_url = patch.demoUrl
  if (patch.logoUrl !== undefined) payload.logo_url = patch.logoUrl

  return payload
}
