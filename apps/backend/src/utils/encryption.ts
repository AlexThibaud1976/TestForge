import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 96 bits — recommandé pour GCM
const TAG_LENGTH = 16; // 128 bits

function getKey(): Buffer {
  const hex = process.env['ENCRYPTION_KEY'];
  if (!hex) throw new Error('ENCRYPTION_KEY environment variable is not set');
  if (hex.length !== 64) throw new Error('ENCRYPTION_KEY must be a 64-character hex string (32 bytes)');
  return Buffer.from(hex, 'hex');
}

/**
 * Chiffre une chaîne en AES-256-GCM.
 * Format de sortie : `iv_hex:tag_hex:ciphertext_hex`
 */
export function encrypt(plaintext: string): string {
  const key = getKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);

  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();

  return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`;
}

/**
 * Déchiffre une chaîne produite par `encrypt()`.
 * Lève une erreur si le ciphertext est altéré (authentification GCM échoue).
 */
export function decrypt(ciphertext: string): string {
  const key = getKey();
  const parts = ciphertext.split(':');

  if (parts.length !== 3) {
    throw new Error('Invalid ciphertext format — expected iv:tag:data');
  }

  const [ivHex, tagHex, encryptedHex] = parts as [string, string, string];
  const decipher = createDecipheriv(ALGORITHM, key, Buffer.from(ivHex, 'hex'));
  decipher.setAuthTag(Buffer.from(tagHex, 'hex'));

  return (
    decipher.update(Buffer.from(encryptedHex, 'hex')).toString('utf8') +
    decipher.final('utf8')
  );
}
