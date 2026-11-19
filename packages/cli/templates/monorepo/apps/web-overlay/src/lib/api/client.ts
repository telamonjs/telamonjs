// Single client for the NestJS API (/v1) — same origin in production
// (Traefik routes by PathPrefix), same origin here in dev too via the
// rewrite below; cookies included, SuperJSON body.
import superjson from 'superjson'

async function parse<T>(res: Response, errorMessage: string): Promise<T> {
  const text = await res.text()
  const body = text ? (JSON.parse(text) as unknown) : null
  if (!res.ok) {
    // Errors go through the global exception filter (plain JSON, no
    // SuperJSON) — `{ message }`.
    throw new Error((body as { message?: string } | null)?.message ?? errorMessage)
  }
  return body === null ? (undefined as T) : (superjson.deserialize(body as never) as T)
}

export function apiFetch<T>(path: string, init?: RequestInit, errorMessage = 'Erro ao chamar a API'): Promise<T> {
  return fetch(`/v1${path}`, { ...init, credentials: 'include' }).then((res) => parse<T>(res, errorMessage))
}

export function apiGet<T>(path: string, errorMessage?: string): Promise<T> {
  return apiFetch<T>(path, undefined, errorMessage)
}

export function apiPost<T>(path: string, data: unknown, errorMessage?: string): Promise<T> {
  return apiFetch<T>(
    path,
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) },
    errorMessage
  )
}

export function apiPatch<T>(path: string, data: unknown, errorMessage?: string): Promise<T> {
  return apiFetch<T>(
    path,
    { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) },
    errorMessage
  )
}

export function apiDelete(path: string, errorMessage?: string): Promise<void> {
  return apiFetch<void>(path, { method: 'DELETE' }, errorMessage)
}
