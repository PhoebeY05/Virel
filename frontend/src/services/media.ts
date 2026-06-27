import { API_URL } from './api'

export interface UploadedMedia {
  url: string
  filename: string
  content_type: string
  size: number
}

export async function uploadImage(file: File): Promise<UploadedMedia> {
  const formData = new FormData()
  formData.append('file', file)

  const response = await fetch(`${API_URL}/uploads/image`, {
    method: 'POST',
    body: formData,
  })

  if (!response.ok) {
    const message = await response.text()
    throw new Error(message || `Image upload failed: ${response.status}`)
  }

  return (await response.json()) as UploadedMedia
}
