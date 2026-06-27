export const AUTH_API = '/auth/api'
export const API = '/api'
export const AI_API = '/ai/api'

export async function apiFetch(path: string, init?: RequestInit) {
  const res = await fetch(path, { credentials: 'include', ...init })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(err.error || err.detail || 'Request failed')
  }
  return res
}
