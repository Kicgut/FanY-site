import { createHash, randomBytes } from 'node:crypto'

export function createRefreshToken() {
  const token = randomBytes(48).toString('base64url')
  return { token, hash: hashRefreshToken(token) }
}

export function hashRefreshToken(token: string) {
  return createHash('sha256').update(token).digest('hex')
}
