import { PrismaClient } from '@prisma/client'
import { isAbsolute, resolve } from 'node:path'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

const configuredDatabaseUrl = process.env.DATABASE_URL
const databasePath = configuredDatabaseUrl?.startsWith('file:')
  ? configuredDatabaseUrl.slice('file:'.length)
  : null
const datasourceUrl = databasePath
  ? `file:${isAbsolute(databasePath) ? databasePath : resolve(process.cwd(), databasePath)}`
  : `file:${resolve(process.cwd(), 'prisma/dev.db')}`

export const prisma = globalForPrisma.prisma || new PrismaClient({ datasourceUrl })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
