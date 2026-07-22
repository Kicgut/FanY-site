import type { H3Event } from 'h3'
import { getRequestHeader } from 'h3'
import jwt from 'jsonwebtoken'
import { getJwtSecret } from '~/server/utils/jwt'
import { prisma } from '~/server/utils/db'

// ─── Types ───────────────────────────────────────────────────────────────────

export interface AuthUser {
  id: number
  username: string
  name: string
  role: string
  groups: string[]
  status: string
  aiAccess: boolean
  aiAccessLevel: string
  uploadQuotaMb: number
}

export type AccessOrigin = 'local_trusted' | 'remote_owner' | 'remote_user' | 'public'

// ─── Constants ───────────────────────────────────────────────────────────────

export const STATUS = { ACTIVE: 'active', DISABLED: 'disabled', PENDING: 'pending' } as const
export const ROLES = { SUPERADMIN: 'superadmin', ADMIN: 'admin', USER: 'user' } as const
export const AI_LEVELS = { NONE: 'none', CHAT: 'chat', LIMITED: 'limited', OWNER: 'owner' } as const
export const GROUPS = {} as const

// AI level hierarchy for comparison
const AI_LEVEL_ORDER: Record<string, number> = {
  [AI_LEVELS.NONE]: 0,
  [AI_LEVELS.CHAT]: 1,
  [AI_LEVELS.LIMITED]: 2,
  [AI_LEVELS.OWNER]: 3,
}

// ─── Trusted CIDR matching ──────────────────────────────────────────────────

function parseCidr(cidr: string): { base: number; mask: number } | null {
  const parts = cidr.trim().split('/')
  if (parts.length !== 2) return null
  const ip = parts[0].split('.').map(Number)
  const prefixLen = parseInt(parts[1], 10)
  if (ip.length !== 4 || isNaN(prefixLen) || prefixLen < 0 || prefixLen > 32) return null
  const base = ((ip[0] << 24) | (ip[1] << 16) | (ip[2] << 8) | ip[3]) >>> 0
  const mask = prefixLen === 0 ? 0 : (~0 << (32 - prefixLen)) >>> 0
  return { base: base & mask, mask }
}

function ipToUint32(ip: string): number | null {
  const parts = ip.trim().split('.').map(Number)
  if (parts.length !== 4 || parts.some((p) => isNaN(p) || p < 0 || p > 255)) return null
  return ((parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3]) >>> 0
}

function isIpInCidrs(ip: string, cidrs: string[]): boolean {
  const ipNum = ipToUint32(ip)
  if (ipNum === null) return false
  for (const cidr of cidrs) {
    const parsed = parseCidr(cidr)
    if (parsed && (ipNum & parsed.mask) === parsed.base) return true
  }
  return false
}

function getClientIp(event: H3Event): string {
  const forwarded = getRequestHeader(event, 'x-forwarded-for')
  if (forwarded) {
    const first = forwarded.split(',')[0].trim()
    if (first) return first
  }
  const remote = getRequestHeader(event, 'x-real-ip') || ''
  if (remote) return remote
  // Nitro provides remoteAddress on the node req
  const nodeReq = event.node?.req
  const addr = nodeReq?.socket?.remoteAddress || nodeReq?.connection?.remoteAddress || ''
  // Normalize IPv6-mapped IPv4
  if (addr.startsWith('::ffff:')) return addr.slice(7)
  return addr || '127.0.0.1'
}

function getTrustedCidrs(): string[] {
  const raw = process.env.LOCAL_TRUSTED_CIDRS || '127.0.0.1/32,192.168.0.0/16,10.0.0.0/8'
  return raw.split(',').map((s) => s.trim()).filter(Boolean)
}

// ─── Public helpers ──────────────────────────────────────────────────────────

/** Parse groups JSON string into array, safely */
export function parseGroups(raw: string | null | undefined): string[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.map(String) : []
  } catch {
    return []
  }
}

/** Parse the legacy visibleTo field without substring-based authorization. */
export function parseVisibleTo(raw: string | null | undefined): string[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) return parsed.map(String).map((value) => value.trim()).filter(Boolean)
  } catch {
    // Older rows may contain comma-separated values.
  }
  return raw.split(',').map((value) => value.trim()).filter(Boolean)
}

export function canAccessVisibleTo(raw: string | null | undefined, user: AuthUser | null | undefined): boolean {
  if (!user) return false
  if (user.role === ROLES.SUPERADMIN || user.groups.includes('all')) return true
  const allowed = new Set(parseVisibleTo(raw))
  return allowed.has(user.username) || user.groups.some((group) => allowed.has(`group:${group}`) || allowed.has(group))
}

/** Visibility is independent from role: public is anonymous, private is owner/admin,
 * and group visibility matches any group assigned to the user. `friends` is kept as
 * a legacy alias for group:friends during migration. */
export function canAccessVisibility(visibility: string | null | undefined, visibleTo: string | null | undefined, user: AuthUser | null | undefined, ownerId?: number | null): boolean {
  if (user?.role === ROLES.ADMIN || user?.role === ROLES.SUPERADMIN) return true
  if (visibility === 'public') return true
  if (!user) return false
  if (visibility === 'private') return ownerId === user.id
  if (visibility === 'friends') return user.groups.includes('friends')
  if (visibility === 'groups' || visibleTo) return canAccessVisibleTo(visibleTo, user)
  return false
}

/** Build an AuthUser from a raw Prisma User row */
export function toAuthUser(user: {
  id: number
  username: string
  name: string
  role: string
  groups: string | null
  status: string
  aiAccess: boolean
  aiAccessLevel: string
  uploadQuotaMb: number
}): AuthUser {
  return {
    id: user.id,
    username: user.username,
    name: user.name,
    role: user.role === ROLES.SUPERADMIN ? ROLES.SUPERADMIN : user.role === ROLES.ADMIN ? ROLES.ADMIN : ROLES.USER,
    groups: user.role === ROLES.SUPERADMIN ? ['all'] : parseGroups(user.groups),
    status: user.status,
    aiAccess: user.aiAccess,
    aiAccessLevel: user.aiAccessLevel,
    uploadQuotaMb: user.uploadQuotaMb,
  }
}

// ─── Core functions ──────────────────────────────────────────────────────────

/**
 * Extract the authenticated user from the event.
 * Returns null if no valid token or user not found/disabled.
 */
export async function getRequestUser(event: H3Event): Promise<AuthUser | null> {
  // 1. If middleware already resolved user, reuse it
  if (event.context.authUser) {
    return event.context.authUser as AuthUser
  }

  // 2. Try to decode from Authorization header
  const authHeader = getRequestHeader(event, 'Authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null

  const token = authHeader.slice(7)
  let decoded: { id: number }
  try {
    decoded = jwt.verify(token, getJwtSecret()) as { id: number }
  } catch {
    return null
  }

  // 3. Fetch fresh user from DB (always, to catch status changes)
  const dbUser = await prisma.user.findUnique({ where: { id: decoded.id } })
  if (!dbUser || dbUser.status === STATUS.DISABLED) return null

  const authUser = toAuthUser(dbUser)
  // Cache on context so subsequent calls don't hit DB again
  event.context.authUser = authUser
  return authUser
}

/**
 * Require a logged-in, active user or throw 401.
 */
export async function requireLogin(event: H3Event): Promise<AuthUser> {
  const user = await getRequestUser(event)
  if (!user) {
    throw createError({ statusCode: 401, message: 'Authentication required' })
  }
  return user
}

/**
 * Require an admin user or throw 403.
 */
export async function requireAdmin(event: H3Event): Promise<AuthUser> {
  const user = await requireLogin(event)
  if (user.role !== ROLES.ADMIN && user.role !== ROLES.SUPERADMIN) {
    throw createError({ statusCode: 403, message: 'Admin access required' })
  }
  return user
}

/**
 * Determine the access origin for the request.
 * Must be called AFTER user resolution (or pass null for unauthenticated).
 */
export function getAccessOrigin(event: H3Event, user?: AuthUser | null): AccessOrigin {
  const ip = getClientIp(event)
  const trustedCidrs = getTrustedCidrs()
  if (isIpInCidrs(ip, trustedCidrs)) return 'local_trusted'
  if (user && (user.role === ROLES.ADMIN || user.role === ROLES.SUPERADMIN)) return 'remote_owner'
  if (user) return 'remote_user'
  return 'public'
}

/**
 * Check whether a user has sufficient AI access level.
 */
export function canAccessAi(user: AuthUser, levelRequired: string): boolean {
  if (!user.aiAccess) return false
  const userLevel = AI_LEVEL_ORDER[user.aiAccessLevel] ?? 0
  const required = AI_LEVEL_ORDER[levelRequired] ?? 0
  return userLevel >= required
}

/**
 * Check whether actor can manage target user.
 */
export function canManageUser(actor: AuthUser, targetUserId: number, origin: AccessOrigin): boolean {
  // Only admins can manage other users
  if (actor.role !== ROLES.ADMIN && actor.role !== ROLES.SUPERADMIN) return false
  // Self-management (setting own profile) is allowed for admins
  if (actor.id === targetUserId) return true
  // Admin can manage others from any origin (but dangerous ops are separately gated)
  return true
}

/**
 * Check whether a dangerous (destructive) operation is allowed.
 * Per AGENTS.md: high-danger ops require local_trusted access.
 */
export function canPerformDangerousOperation(actor: AuthUser, origin: AccessOrigin): boolean {
  // Only local_trusted may perform dangerous ops
  if (origin !== 'local_trusted') return false
  // Must be admin
  return actor.role === ROLES.SUPERADMIN
}

/**
 * Require that the request originates from a local trusted network.
 * Must be called AFTER user resolution so origin considers auth state.
 * Throws 403 if the request is not local_trusted.
 */
export async function requireLocalTrusted(event: H3Event): Promise<{ user: AuthUser; origin: AccessOrigin }> {
  const user = await requireAdmin(event)
  const origin = getAccessOrigin(event, user)
  if (origin !== 'local_trusted') {
    throw createError({
      statusCode: 403,
      message: 'This operation requires local network access. Remote admin cannot perform dangerous operations.',
    })
  }
  return { user, origin }
}
