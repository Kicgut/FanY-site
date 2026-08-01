import { z } from 'zod'

export const portfolioTypeSchema = z.enum(['project', 'visual', 'tool'])
export const portfolioMediaKindSchema = z.enum(['cover', 'image', 'video', 'gif'])
export const portfolioBlockKindSchema = z.enum(['richText', 'timeline', 'code', 'comparison', 'imageGallery', 'embed'])
export const portfolioStatusSchema = z.enum(['draft', 'published', 'archived'])
export const reviewStatusSchema = z.enum(['pending', 'submitted', 'reviewing', 'approved', 'rejected', 'changes_requested'])

export const portfolioDraftSchema = z.object({
  title: z.string().trim().min(1).max(180), slug: z.string().trim().min(1).max(120).regex(/^[a-z0-9][a-z0-9-]*$/i),
  description: z.string().max(2000).nullable().optional(), type: portfolioTypeSchema.optional(), displayStatus: z.string().max(80).optional(),
  tags: z.array(z.string().trim().min(1).max(60)).max(30).optional(), category: z.string().max(80).nullable().optional(),
  featured: z.boolean().optional(), order: z.number().int().min(0).max(100000).optional(), year: z.number().int().min(1900).max(2200).nullable().optional(),
  roles: z.array(z.string().trim().min(1).max(80)).max(30).optional(), techStack: z.array(z.string().trim().min(1).max(80)).max(50).optional(), medium: z.array(z.string().trim().min(1).max(80)).max(30).optional(),
  location: z.string().max(160).nullable().optional(), toolMode: z.string().max(80).optional(), version: z.number().int().positive().optional(),
}).passthrough()
export const portfolioCreateSchema = z.object({ title: z.string().trim().min(1).max(180), slug: z.string().trim().max(120).regex(/^[a-z0-9][a-z0-9-]*$/i).optional(), type: portfolioTypeSchema.optional() }).passthrough()

export const portfolioMediaSchema = z.object({
  kind: portfolioMediaKindSchema.optional(), publicUrl: z.string().min(1).max(2000), mimeType: z.string().max(120).nullable().optional(), sizeBytes: z.number().int().nonnegative().max(2_000_000_000).nullable().optional(), derivativeStatus: z.enum(['pending', 'ready', 'failed']).optional(), posterUrl: z.string().max(2000).nullable().optional(), alt: z.string().max(240).optional(), caption: z.string().max(500).optional(),
  width: z.number().int().positive().max(50000).nullable().optional(), height: z.number().int().positive().max(50000).nullable().optional(), duration: z.number().int().positive().max(86400).nullable().optional(), sortOrder: z.number().int().min(0).max(100000).optional(), status: z.enum(['draft', 'ready', 'failed']).optional(),
})
export const portfolioPromptSchema = z.object({
  title: z.string().trim().min(1).max(180), slug: z.string().trim().min(1).max(120).regex(/^[a-z0-9][a-z0-9-]*$/i), category: z.string().max(80).nullable().optional(), summary: z.string().max(500).nullable().optional(), body: z.string().min(1).max(100000), variables: z.record(z.any()).optional(), examples: z.record(z.any()).optional(), riskLevel: z.enum(['low', 'medium', 'high']).optional(), tags: z.array(z.string().trim().min(1).max(60)).max(30).optional(), sortOrder: z.number().int().min(0).max(100000).optional(), status: z.enum(['draft', 'published', 'archived']).optional(),
})
export const portfolioBlockSchema = z.object({ kind: portfolioBlockKindSchema, anchor: z.string().max(120).regex(/^[a-z0-9-]*$/i).nullable().optional(), title: z.string().max(180).nullable().optional(), payload: z.record(z.any()), sortOrder: z.number().int().min(0).max(100000).optional(), visibility: z.enum(['draft', 'published', 'hidden']).optional() })
export const portfolioResourceSchema = z.object({ kind: z.string().trim().min(1).max(60), label: z.string().trim().min(1).max(180), url: z.string().min(1).max(2000), external: z.boolean().optional(), sortOrder: z.number().int().min(0).max(100000).optional(), isPrimary: z.boolean().optional() })

export function parsePortfolio<T>(schema: z.ZodType<T>, input: unknown): T {
  const result = schema.safeParse(input)
  if (!result.success) throw createError({ statusCode: 422, message: 'Invalid portfolio payload', data: result.error.flatten() })
  return result.data
}
