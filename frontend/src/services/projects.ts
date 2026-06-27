import { projects as seedProjects } from '../mocks/data'
import type { Project } from '../types'
import { fromApiProject, toApiProject, type ApiProject } from './adapters'
import { apiRequest } from './api'

let projects = [...seedProjects]

const wait = (ms = 350) => new Promise((resolve) => window.setTimeout(resolve, ms))

export async function getProjects(): Promise<Project[]> {
  try {
    const response = await apiRequest<ApiProject[]>('/projects')
    return response.map(fromApiProject)
  } catch {
    await wait()
    return [...projects]
  }
}

export async function createProject(project: Omit<Project, 'id' | 'lastUpdated' | 'progress'>): Promise<Project> {
  try {
    const response = await apiRequest<ApiProject>('/projects', {
      method: 'POST',
      body: JSON.stringify(toApiProject(project)),
    })
    return { ...fromApiProject(response), platforms: project.platforms }
  } catch {
    await wait()
    const created: Project = {
      ...project,
      id: `proj-${Date.now()}`,
      progress: 12,
      lastUpdated: new Date().toISOString().slice(0, 10),
    }
    projects = [created, ...projects]
    return created
  }
}

export async function updateProject(id: string, patch: Partial<Project>): Promise<Project> {
  try {
    const response = await apiRequest<ApiProject>(`/projects/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(toApiProject(patch)),
    })
    const existing = projects.find((project) => project.id === id)
    return { ...fromApiProject(response), platforms: patch.platforms ?? existing?.platforms ?? [] }
  } catch {
    await wait()
    projects = projects.map((project) =>
      project.id === id
        ? { ...project, ...patch, lastUpdated: new Date().toISOString().slice(0, 10) }
        : project,
    )
    const updated = projects.find((project) => project.id === id)
    if (!updated) throw new Error('Project not found')
    return updated
  }
}

export async function deleteProject(id: string): Promise<void> {
  try {
    await apiRequest<void>(`/projects/${id}`, { method: 'DELETE' })
  } catch {
    await wait()
  }
  projects = projects.filter((project) => project.id !== id)
}
