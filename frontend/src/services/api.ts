export const API_URL =
  (import.meta.env.VITE_API_URL as string | undefined) ??
  'http://localhost:8000'

export async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  })

  if (!response.ok) {
    const message = await response.text()
    throw new Error(message || `API request failed: ${response.status}`)
  }

  if (response.status === 204) {
    return undefined as T
  }

  return (await response.json()) as T
}
