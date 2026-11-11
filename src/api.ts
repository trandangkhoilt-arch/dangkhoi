export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers)
  if (init?.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json')
  const response = await fetch(path, { ...init, headers, credentials: 'same-origin' })
  const result = await response.json() as T & { error?: string }
  if (!response.ok) throw new Error(result.error || 'Không thể hoàn tất yêu cầu.')
  return result
}

export const jsonBody = (value: unknown) => ({
  method: 'POST',
  body: JSON.stringify(value),
})
