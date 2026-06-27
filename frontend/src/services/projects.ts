import { projects as seedProjects } from '../mocks/data'
import type { Project } from '../types'
import { apiRequest } from './api'

let projects = [...seedProjects]

const wait = (ms = 350) => new Promise((resolve) => window.setTimeout(resolve, ms))

export async function getProjects(): Promise<Project[]> {
  try {
    return await apiRequest<Project[]>('/projects')
  } catch {
    await wait()
    return [...projects]
  }
}

export async function createProject(project: Omit<Project, 'id' | 'lastUpdated' | 'progress'>): Promise<Project> {
  try {
    return await apiRequest<Project>('/projects', {
      method: 'POST',
      body: JSON.stringify(project),
    })
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
    return await apiRequest<Project>(`/projects/${id}`, {
      method: 'PUT',
      body: JSON.stringify(patch),
    })
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
