export function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET
  if (!secret) {
    console.warn('[auth] JWT_SECRET not set, using fallback dev secret')
  }
  return secret || 'dev-secret-change-me'
}
