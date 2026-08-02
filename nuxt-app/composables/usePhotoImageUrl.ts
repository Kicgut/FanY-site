/** Add the current short-lived JWT to protected photo URLs used by <img>. */
export function usePhotoImageUrl() {
  function authImageUrl(url?: string | null) {
    if (!url || !import.meta.client) return url || ''
    const token = localStorage.getItem('token')
    if (!token || !url.startsWith('/api/photos/file')) return url
    return `${url}${url.includes('?') ? '&' : '?'}token=${encodeURIComponent(token)}`
  }

  return { authImageUrl }
}
