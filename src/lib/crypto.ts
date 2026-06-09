/**
 * Encriptación AES-256-GCM para mensajes de chat.
 * La clave se deriva de CHAT_ENCRYPTION_KEY en variables de entorno.
 * Los mensajes se guardan encriptados en Supabase — el servidor los desencripta al leerlos.
 */

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 12 // 96 bits recomendado para GCM
const AUTH_TAG_LENGTH = 16

function getKey(): Buffer {
  const raw = process.env.CHAT_ENCRYPTION_KEY
  if (!raw) throw new Error('CHAT_ENCRYPTION_KEY no está definida')
  // Derivar 32 bytes a partir del string usando sha256
  const { createHash } = require('crypto')
  return createHash('sha256').update(raw).digest()
}

export function encryptMessage(plaintext: string): string {
  const { createCipheriv, randomBytes } = require('crypto')
  const key = getKey()
  const iv = randomBytes(IV_LENGTH)
  const cipher = createCipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH })

  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ])
  const authTag = cipher.getAuthTag()

  // Formato: iv(12) + authTag(16) + ciphertext — todo en base64
  return Buffer.concat([iv, authTag, encrypted]).toString('base64')
}

export function decryptMessage(ciphertext: string): string {
  try {
    const { createDecipheriv } = require('crypto')
    const key = getKey()
    const buf = Buffer.from(ciphertext, 'base64')

    const iv = buf.subarray(0, IV_LENGTH)
    const authTag = buf.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH)
    const encrypted = buf.subarray(IV_LENGTH + AUTH_TAG_LENGTH)

    const decipher = createDecipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH })
    decipher.setAuthTag(authTag)

    return decipher.update(encrypted).toString('utf8') + decipher.final('utf8')
  } catch {
    // Si falla (mensaje viejo sin encriptar), devolver el texto tal cual
    return ciphertext
  }
}
