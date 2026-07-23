export function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET
  if (secret) return secret
  if (process.env.NODE_ENV === 'production') {
    throw new Error('[auth] JWT_SECRET must be configured in production')
  }
  console.warn('[auth] JWT_SECRET not set, using development-only fallback')
  return 'dev-secret-change-me'
}
