import { createHash } from 'node:crypto'
import exifr from 'exifr'

export interface ExtractedPhotoMetadata {
  checksum: string
  width: number | null
  height: number | null
  orientation: number | null
  takenAt: Date | null
  location: string | null
  gpsLatitude: number | null
  gpsLongitude: number | null
  cameraMake: string | null
  cameraModel: string | null
  lens: string | null
  iso: number | null
  focalLength: number | null
  keywords: string | null
}

function asString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function asNumber(value: unknown): number | null {
  const parsed = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function asDate(...values: unknown[]): Date | null {
  for (const value of values) {
    if (value instanceof Date && !Number.isNaN(value.getTime())) return value
    if (typeof value === 'string' || typeof value === 'number') {
      const date = new Date(value)
      if (!Number.isNaN(date.getTime())) return date
    }
  }
  return null
}

export async function extractPhotoMetadata(data: Buffer): Promise<ExtractedPhotoMetadata> {
  const result: ExtractedPhotoMetadata = {
    checksum: createHash('sha256').update(data).digest('hex'),
    width: null,
    height: null,
    orientation: null,
    takenAt: null,
    location: null,
    gpsLatitude: null,
    gpsLongitude: null,
    cameraMake: null,
    cameraModel: null,
    lens: null,
    iso: null,
    focalLength: null,
    keywords: null,
  }

  try {
    const sharp = (await import('sharp')).default
    const image = await sharp(data, { failOn: 'none' }).metadata()
    result.width = image.width ?? null
    result.height = image.height ?? null
    result.orientation = image.orientation ?? null
    if (image.orientation && image.orientation >= 5 && image.orientation <= 8) {
      ;[result.width, result.height] = [result.height, result.width]
    }
  } catch {
    // Metadata is best effort; the upload remains usable without it.
  }

  try {
    const exif: any = await exifr.parse(data, {
      tiff: true,
      xmp: true,
      iptc: true,
      exif: true,
      gps: true,
      reviveValues: true,
    })
    if (!exif) return result
    result.takenAt = asDate(exif.DateTimeOriginal, exif.CreateDate, exif.ModifyDate)
    result.gpsLatitude = asNumber(exif.latitude ?? exif.GPSLatitude)
    result.gpsLongitude = asNumber(exif.longitude ?? exif.GPSLongitude)
    result.cameraMake = asString(exif.Make)
    result.cameraModel = asString(exif.Model)
    result.lens = asString(exif.LensModel ?? exif.Lens)
    result.iso = asNumber(exif.ISO)
    result.focalLength = asNumber(exif.FocalLength)
    const keywords = Array.isArray(exif.Keywords) ? exif.Keywords : exif.Keywords ? [exif.Keywords] : []
    result.keywords = keywords.map(String).map((value: string) => value.trim()).filter(Boolean).join(',') || null
    result.location = [exif.City, exif.State, exif.Country].map(asString).filter(Boolean).join(', ') || null
  } catch {
    // Corrupt or non-EXIF images are still valid uploads.
  }

  return result
}
