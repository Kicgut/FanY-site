import { createHash } from 'node:crypto'
import { existsSync, readFileSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'

const root = resolve(process.cwd())
const db = join(root, '.data', 'ecs-prod.db')
const backup = join(root, '.data', 'backups', 'ecs-prod-pre-portfolio-release-20260801.db')
const service = readFileSync(join(root, 'server', 'services', 'portfolio.ts'), 'utf8')
const schema = readFileSync(join(root, 'prisma', 'schema.prisma'), 'utf8')
const portfolioModel = schema.match(/model Portfolio\s*\{([\s\S]*?)\n\}/)?.[1] || ''
const ops = readFileSync(join(root, '..', 'docs', 'ops', '作品页面发布回滚清单.md'), 'utf8')
const checks = [
  ['database exists', existsSync(db)],
  ['release backup exists', existsSync(backup)],
  ['backup is not empty', existsSync(backup) && statSync(backup).size > 0],
  ['legacy runtime fallback removed', !service.includes('legacyCover') && !service.includes('item.coverImage') && !service.includes('item.content')],
  ['legacy Portfolio columns removed', !/\b(content|coverImage|images|link)\b/.test(portfolioModel)],
  ['media processing gate exists', service.includes('derivativeStatus') && service.includes('sizeBytes')],
  ['controlled media model exists', schema.includes('model PortfolioMedia') && schema.includes('derivativeStatus')],
  ['cache invalidation strategy documented', ops.includes('cache invalidation')],
]
const failed = checks.filter(([, ok]) => !ok)
if (failed.length) { console.error(failed.map(([name]) => `FAIL ${name}`).join('\n')); process.exit(1) }
const hash = createHash('sha256').update(readFileSync(backup)).digest('hex')
console.log('Portfolio release preflight passed')
console.log(`backup=${backup}`)
console.log(`sha256=${hash}`)
console.log(`checks=${checks.length}`)
