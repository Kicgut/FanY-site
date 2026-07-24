import test from 'node:test'
import assert from 'node:assert/strict'
import QRCode from 'qrcode'

test('TOTP otpauth URI renders a scannable PNG data URL', async () => {
  const uri = 'otpauth://totp/FanY%20Site:owner?secret=JBSWY3DPEHPK3PXP&issuer=FanY%20Site&algorithm=SHA1&digits=6&period=30'
  const dataUrl = await QRCode.toDataURL(uri, { errorCorrectionLevel: 'M', width: 240, margin: 2 })
  assert.match(dataUrl, /^data:image\/png;base64,[A-Za-z0-9+/]+=*$/)
  assert.ok(dataUrl.length > 500)
})
