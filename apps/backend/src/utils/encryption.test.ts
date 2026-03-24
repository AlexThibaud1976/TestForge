import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { encrypt, decrypt } from './encryption.js';

const VALID_KEY = 'a'.repeat(64); // 64 hex chars = 32 bytes

describe('encryption', () => {
  beforeEach(() => {
    process.env['ENCRYPTION_KEY'] = VALID_KEY;
  });

  afterEach(() => {
    delete process.env['ENCRYPTION_KEY'];
  });

  describe('encrypt', () => {
    it('returns a string with 3 colon-separated parts', () => {
      const result = encrypt('hello');
      const parts = result.split(':');
      expect(parts).toHaveLength(3);
    });

    it('produces different ciphertexts for the same plaintext (random IV)', () => {
      const a = encrypt('same plaintext');
      const b = encrypt('same plaintext');
      expect(a).not.toBe(b);
    });

    it('throws if ENCRYPTION_KEY is not set', () => {
      delete process.env['ENCRYPTION_KEY'];
      expect(() => encrypt('test')).toThrow('ENCRYPTION_KEY environment variable is not set');
    });

    it('throws if ENCRYPTION_KEY has wrong length', () => {
      process.env['ENCRYPTION_KEY'] = 'tooshort';
      expect(() => encrypt('test')).toThrow('64-character hex string');
    });
  });

  describe('decrypt', () => {
    it('round-trips plaintext correctly', () => {
      const plaintext = 'my-secret-api-key-12345';
      expect(decrypt(encrypt(plaintext))).toBe(plaintext);
    });

    it('round-trips unicode and special characters', () => {
      const plaintext = 'clé avec accents éàü & "quotes" \'single\' 🔑';
      expect(decrypt(encrypt(plaintext))).toBe(plaintext);
    });

    it('round-trips empty string', () => {
      expect(decrypt(encrypt(''))).toBe('');
    });

    it('throws on malformed ciphertext format', () => {
      expect(() => decrypt('notvalid')).toThrow('Invalid ciphertext format');
    });

    it('throws on tampered ciphertext (GCM auth tag fails)', () => {
      const ciphertext = encrypt('original');
      const parts = ciphertext.split(':');
      // Altérer le dernier octet du ciphertext
      const tampered = parts[2]!.slice(0, -2) + '00';
      expect(() => decrypt(`${parts[0]}:${parts[1]}:${tampered}`)).toThrow();
    });
  });
});
