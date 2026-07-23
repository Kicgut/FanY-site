import type { H3Event } from 'h3'

const failures = new Map<string, { count: number; resetAt: number }>()
const WINDOW_MS = 15 * 60_000
const MAX_FAILURES = 10

function clientAddress(event: H3Event) {
  const address = event.node?.req?.socket?.remoteAddress || 'unknown'
  return address.startsWith('::ffff:') ? address.slice(7) : address
}

function key(event: H3Event, username: string) {
  return `${clientAddress(event)}:${username.trim().toLowerCase()}`
}

export function isLoginRateLimited(event: H3Event, username: string) {
  const entry = failures.get(key(event, username))
  if (!entry) return false
  if (Date.now() >= entry.resetAt) { failures.delete(key(event, username)); return false }
  return entry.count >= MAX_FAILURES
}

export function recordLoginFailure(event: H3Event, username: string) {
  const mapKey = key(event, username)
  const now = Date.now()
  const entry = failures.get(mapKey)
  if (!entry || now >= entry.resetAt) failures.set(mapKey, { count: 1, resetAt: now + WINDOW_MS })
  else entry.count += 1
}

export function clearLoginFailures(event: H3Event, username: string) {
  failures.delete(key(event, username))
}

setInterval(() => {
  const now = Date.now()
  for (const [mapKey, entry] of failures) if (now >= entry.resetAt) failures.delete(mapKey)
}, WINDOW_MS).unref?.()
