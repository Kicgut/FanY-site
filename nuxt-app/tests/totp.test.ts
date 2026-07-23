import test from 'node:test'
import assert from 'node:assert/strict'
import { generateTotpCode, generateTotpSecret, verifyTotp } from '../server/utils/totp.ts'

test('TOTP generated code verifies in its time window', () => {
  const secret = generateTotpSecret()
  const now = 1_700_000_000_000
  const code = generateTotpCode(secret, now)
  assert.match(code, /^\d{6}$/)
  assert.equal(verifyTotp(secret, code, now), true)
  assert.equal(verifyTotp(secret, code, now + 30_000), true)
})

test('TOTP rejects malformed and incorrect codes', () => {
  const secret = generateTotpSecret()
  assert.equal(verifyTotp(secret, '12345'), false)
  assert.equal(verifyTotp(secret, '000000', 1_700_000_000_000), false)
})
