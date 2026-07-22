import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto'
import { readFileSync, writeFileSync } from 'fs'

const ALGORITHM = 'aes-256-gcm'

/**
 * Encrypts a plaintext string using AES-256-GCM.
 * Returns a hex-encoded string: iv:authTag:ciphertext
 */
export function encrypt(plaintext: string, password: string): string {
  const salt = randomBytes(16)
  const key = scryptSync(password, salt, 32)
  const iv = randomBytes(12)
  const cipher = createCipheriv(ALGORITHM, key, iv)
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const authTag = cipher.getAuthTag()
  return [salt, iv, authTag, encrypted].map(b => b.toString('hex')).join(':')
}

/**
 * Decrypts an AES-256-GCM encrypted string.
 */
export function decrypt(ciphertext: string, password: string): string {
  const [saltHex, ivHex, authTagHex, encryptedHex] = ciphertext.split(':')
  const salt = Buffer.from(saltHex, 'hex')
  const iv = Buffer.from(ivHex, 'hex')
  const authTag = Buffer.from(authTagHex, 'hex')
  const encrypted = Buffer.from(encryptedHex, 'hex')
  const key = scryptSync(password, salt, 32)
  const decipher = createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(authTag)
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8')
}

/**
 * Loads and parses a .env file, decrypting any values prefixed with ENC:
 */
export function loadSecureConfig(envPath: string, password?: string): Record<string, string> {
  const lines = readFileSync(envPath, 'utf8').split('\n')
  const config: Record<string, string> = {}
  const pass = password || process.env.CONFIG_PASSWORD || 'default-dev-password'

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eqIdx = trimmed.indexOf('=')
    if (eqIdx === -1) continue
    const key = trimmed.slice(0, eqIdx).trim()
    let value = trimmed.slice(eqIdx + 1).trim()
    if (value.startsWith('ENC:')) {
      try {
        value = decrypt(value.slice(4), pass)
      } catch {
        console.warn(`[secure-config] Failed to decrypt ${key}, using raw value`)
      }
    }
    config[key] = value
    process.env[key] = value
  }

  return config
}
