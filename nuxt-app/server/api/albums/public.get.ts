import { presentPhoto, publicPhotoUrl } from '~/server/utils/photo-presentation'
import { canViewAlbum, canViewPhoto, getRequestUser } from '~/server/utils/permission'

const publicPhotoWhere = {
  photo: {
    visibility: 'public',
    status: 'published',
    reviewStatus: 'approved',
  },
} as const

function visiblePhotoWhere(user: Awaited<ReturnType<typeof getRequestUser>>) {
  if (!user) return publicPhotoWhere
  if (user.role === 'superadmin') return {}
  return {
    photo: {
      status: 'published',
      reviewStatus: 'approved',
      OR: [
        { visibility: 'public' },
        ...user.groups.map((group) => ({ visibility: 'groups', visibleTo: { contains: `group:${group}` } })),
      ],
    },
  }
}

function usableCoverUrl(value: string | null | undefined) {
  const url = publicPhotoUrl(value)
  if (!url) return null
  if (url.startsWith('/api/photos/file') && !url.includes('id=')) return null
  return url
}

export default defineEventHandler(async (event) => {
  try {
    const user = await getRequestUser(event)
    const albums = await prisma.album.findMany({
      select: {
        id: true,
        name: true,
        description: true,
        coverUrl: true,
        visibility: true,
        visibleTo: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    })
    const photoWhere = visiblePhotoWhere(user)

    const result = await Promise.all(albums.map(async (album) => {
      const [photoCount, previews] = await Promise.all([
        prisma.albumPhoto.count({ where: { albumId: album.id, ...photoWhere } }),
        prisma.albumPhoto.findMany({
          where: { albumId: album.id, ...photoWhere },
          select: { photo: { include: { tags: true } } },
          orderBy: { order: 'asc' },
          take: 10,
        }),
      ])

      const previewPhotos = previews.filter(({ photo }) => canViewPhoto(user, photo)).map(({ photo }) => {
        const presented = presentPhoto(photo)
        return { id: presented.id, title: presented.title, thumbnailUrl: presented.thumbnailUrl || presented.mediumUrl }
      })

      return {
        id: album.id,
        name: album.name,
        description: album.description,
        coverUrl: usableCoverUrl(album.coverUrl) || previewPhotos[0]?.thumbnailUrl || null,
        photoCount,
        previewPhotos,
        createdAt: album.createdAt,
      }
    }))

    return { success: true, data: result.filter((album) => album.photoCount > 0).filter((album) => {
      const source = albums.find((item) => item.id === album.id)
      return Boolean(source && canViewAlbum(user, source))
    }) }
  } catch (error: any) {
    console.error('Failed to fetch public albums:', error)
    throw createError({ statusCode: 500, message: 'Failed to fetch public albums' })
  }
})
