import { PrismaClient } from '@prisma/client'

if (process.env.PORTFOLIO_FIXTURE !== '1') {
  console.error('Set PORTFOLIO_FIXTURE=1 to write the local development database.')
  process.exit(1)
}

const prisma = new PrismaClient()
const fixtures = [
  { title: 'Signal Garden', slug: 'signal-garden', type: 'project', displayStatus: 'experiment', description: 'A small interaction system documenting signal, space and iteration.', year: 2026, tags: 'interaction, archive' },
  { title: 'Night Transit', slug: 'night-transit', type: 'visual', displayStatus: 'completed', description: 'A visual study in motion, poster frames and quiet transitions.', year: 2025, tags: 'film, motion' },
  { title: 'Prompt Atlas', slug: 'prompt-atlas', type: 'tool', toolMode: 'prompt_vault', displayStatus: 'experiment', description: 'A searchable, reviewable prompt collection.', year: 2026, tags: 'prompt, workflow' },
]

for (const fixture of fixtures) {
  const portfolio = await prisma.portfolio.upsert({ where: { slug: fixture.slug }, update: {}, create: { ...fixture, status: 'published', reviewStatus: 'approved', publishedAt: new Date(), createdBy: 'fixture' } })
  if (!(await prisma.portfolioBlock.findFirst({ where: { portfolioId: portfolio.id, anchor: 'narrative' } }))) await prisma.portfolioBlock.create({ data: { portfolioId: portfolio.id, kind: 'richText', title: 'Narrative', anchor: 'narrative', payloadJson: JSON.stringify({ markdown: fixture.description }), visibility: 'published', sortOrder: 0 } })
  if (fixture.type === 'visual' && !(await prisma.portfolioMedia.findFirst({ where: { portfolioId: portfolio.id, kind: 'cover' } }))) await prisma.portfolioMedia.createMany({ data: [{ portfolioId: portfolio.id, kind: 'cover', publicUrl: '/images/home/hero-moonland.webp', mimeType: 'image/webp', sizeBytes: 240000, derivativeStatus: 'ready', alt: `${fixture.title} cover`, width: 1600, height: 900, status: 'ready', sortOrder: 0 }, { portfolioId: portfolio.id, kind: 'video', publicUrl: '/media/night-transit.mp4', mimeType: 'video/mp4', sizeBytes: 4200000, derivativeStatus: 'ready', posterUrl: '/images/home/hero-moonland.webp', alt: `${fixture.title} excerpt`, width: 1920, height: 1080, duration: 42, status: 'ready', sortOrder: 1 }] })
  if (fixture.type === 'visual') { await prisma.portfolioMedia.updateMany({ where: { portfolioId: portfolio.id, kind: { in: ['cover', 'image', 'gif'] } }, data: { mimeType: 'image/webp', sizeBytes: 240000, derivativeStatus: 'ready' } }); await prisma.portfolioMedia.updateMany({ where: { portfolioId: portfolio.id, kind: 'video' }, data: { mimeType: 'video/mp4', sizeBytes: 4200000, derivativeStatus: 'ready' } }) }
  if (fixture.type === 'tool') await prisma.portfolioPromptEntry.upsert({ where: { portfolioId_slug: { portfolioId: portfolio.id, slug: 'first-pass' } }, update: {}, create: { portfolioId: portfolio.id, title: 'First pass', slug: 'first-pass', category: 'workflow', summary: 'A safe first pass for a new idea.', body: 'Map the intent, constraints and next action.', status: 'published', riskLevel: 'low' } })
}
await prisma.$disconnect()
console.log('Portfolio fixtures ready.')
