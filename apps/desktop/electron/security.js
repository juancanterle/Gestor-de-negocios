const { app, safeStorage } = require('electron')
const bcrypt = require('bcryptjs')
const crypto = require('crypto')
const fs = require('fs')
const path = require('path')

const BCRYPT_COST = 10
let cachedKey = null

function keyFilePath() {
  return path.join(app.getPath('userData'), 'db.key.enc')
}

function getOrCreateDbKey() {
  if (cachedKey) return cachedKey

  const p = keyFilePath()

  if (!safeStorage.isEncryptionAvailable()) {
    throw new Error(
      'safeStorage no disponible en esta plataforma. ' +
      'Instalá un keyring (gnome-keyring / kwallet) o ejecutá en modo desarrollo.'
    )
  }

  if (fs.existsSync(p)) {
    const buf = fs.readFileSync(p)
    cachedKey = safeStorage.decryptString(buf)
    if (!cachedKey || cachedKey.length !== 64) {
      throw new Error('Key de DB corrupta o longitud inválida.')
    }
    return cachedKey
  }

  const raw = crypto.randomBytes(32).toString('hex')
  const enc = safeStorage.encryptString(raw)
  fs.writeFileSync(p, enc, { mode: 0o600 })
  cachedKey = raw
  return cachedKey
}

function hashPin(pin) {
  if (pin == null || String(pin).length === 0) {
    throw new Error('PIN vacío')
  }
  return bcrypt.hashSync(String(pin), BCRYPT_COST)
}

function verifyPin(pin, hash) {
  if (pin == null || !hash) return false
  try {
    return bcrypt.compareSync(String(pin), hash)
  } catch {
    return false
  }
}

function isBcryptHash(value) {
  return typeof value === 'string' && /^\$2[aby]\$\d{2}\$/.test(value) && value.length === 60
}

module.exports = { getOrCreateDbKey, hashPin, verifyPin, isBcryptHash }
