import { createHmac, randomBytes } from 'node:crypto'

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'

export function generateTotpSecret() {
  const bytes = randomBytes(20)
  let bits = ''
  for (const byte of bytes) bits += byte.toString(2).padStart(8, '0')
  let output = ''
  for (let i = 0; i < bits.length; i += 5) output += ALPHABET[parseInt(bits.slice(i, i + 5).padEnd(5, '0'), 2)]
  return output
}

function decodeBase32(value: string) {
  const bits = value.replace(/=+$/g, '').toUpperCase().split('').map((char) => ALPHABET.indexOf(char).toString(2).padStart(5, '0')).join('')
  const bytes = []
  for (let i = 0; i + 8 <= bits.length; i += 8) bytes.push(parseInt(bits.slice(i, i + 8), 2))
  return Buffer.from(bytes)
}

export function verifyTotp(secret: string, code: string, now = Date.now()) {
  if (!/^\d{6}$/.test(code)) return false
  const key = decodeBase32(secret)
  const counter = Math.floor(now / 30_000)
  for (const offset of [-1, 0, 1]) {
    const buffer = Buffer.alloc(8)
    buffer.writeBigUInt64BE(BigInt(counter + offset))
    const digest = createHmac('sha1', key).update(buffer).digest()
    const index = digest[digest.length - 1] & 15
    const value = ((digest[index] & 127) << 24) | ((digest[index + 1] & 255) << 16) | ((digest[index + 2] & 255) << 8) | (digest[index + 3] & 255)
    if (String(value % 1_000_000).padStart(6, '0') === code) return true
  }
  return false
}

export function generateTotpCode(secret: string, now = Date.now()) {
  const key = decodeBase32(secret)
  const buffer = Buffer.alloc(8)
  buffer.writeBigUInt64BE(BigInt(Math.floor(now / 30_000)))
  const digest = createHmac('sha1', key).update(buffer).digest()
  const index = digest[digest.length - 1] & 15
  const value = ((digest[index] & 127) << 24) | ((digest[index + 1] & 255) << 16) | ((digest[index + 2] & 255) << 8) | (digest[index + 3] & 255)
  return String(value % 1_000_000).padStart(6, '0')
}
