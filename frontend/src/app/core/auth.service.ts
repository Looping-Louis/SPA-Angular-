import { Injectable } from '@angular/core';
import { Router } from '@angular/router';

type StoredUser = {
  email: string;
  kdfSaltB64: string;
  totpSecret?: string;    // base32
};

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly USER_KEY = 'pm_user';
  private readonly SESSION_KEY = 'pm_session';
  private readonly BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  private readonly isBrowser = typeof window !== 'undefined' && !!window.localStorage && !!window.sessionStorage;
  private memoryUser: StoredUser | null = null;
  private memorySessionKey: string | null = null;

  constructor(private router: Router) {}

// irgendwo in der Klasse AuthService hinzufügen:
getUserEmail(): string | null {
  const u = this.storedUser;
  return u ? u.email : null;
}

hasTotpSecret(): boolean {
  return !!this.storedUser?.totpSecret;
}

getTotpSecret(): string | null {
  return this.storedUser?.totpSecret ?? null;
}


  private get storedUser(): StoredUser | null {
    if (this.isBrowser) {
      const raw = window.localStorage.getItem(this.USER_KEY);
      return raw ? JSON.parse(raw) as StoredUser : null;
    }
    return this.memoryUser;
  }
  private set storedUser(v: StoredUser | null) {
    if (this.isBrowser) {
      if (v) window.localStorage.setItem(this.USER_KEY, JSON.stringify(v));
      else window.localStorage.removeItem(this.USER_KEY);
    } else {
      this.memoryUser = v;
    }
  }

  /** Registrierung: speichert User + Salt; Passwörter selbst werden NIE gespeichert */
  async register(email: string, masterPassword: string) {
    const enc = new TextEncoder();
    const salt = globalThis.crypto.getRandomValues(new Uint8Array(16));
    const saltB64 = btoa(String.fromCharCode(...salt));
    // Ableiten und kurz prüfen, ob PW tauglich (Key ableitbar)
    await this.deriveKey(enc.encode(masterPassword), salt);
    this.storedUser = { email, kdfSaltB64: saltB64 };
    this.writeSession(null);
  }

  /** Login (1. Faktor): leitet Key ab und legt ihn als Session-Key (CryptoKey) in Memory ab */
  async login(email: string, masterPassword: string): Promise<'OK'|'TWOFA_REQUIRED'|'NO_USER'|'EMAIL_MISMATCH'> {
    const u = this.storedUser;
    if (!u) return 'NO_USER';
    if (u.email !== email) return 'EMAIL_MISMATCH';

    const salt = Uint8Array.from(atob(u.kdfSaltB64), c => c.charCodeAt(0));
    const key = await this.deriveKey(new TextEncoder().encode(masterPassword), salt);

    // 2FA Status
    const twoFAEnabled = !!u.totpSecret;

    // Session schreiben
    const exported = await globalThis.crypto.subtle.exportKey('raw', key);
    const b64 = btoa(String.fromCharCode(...new Uint8Array(exported)));
    this.writeSession(b64);

    return twoFAEnabled ? 'TWOFA_REQUIRED' : 'OK';
  }

  /** 2FA prüfen (TOTP) – nur wenn Secret existiert */
  async verifyTotp(code: string, secretOverride?: string): Promise<boolean> {
    const u = this.storedUser;
    try {
      const secretB32 = secretOverride ?? u?.totpSecret;
      if (!secretB32) return true; // nicht aktiviert oder Secret extern vorgegeben
      const trimmed = (code ?? '').trim();
      if (!/^\d{6}$/.test(trimmed)) return false;
      const secretBytes = this.base32ToBytes(secretB32);
      const timeStep = Math.floor(Date.now() / 1000 / 30);
      for (let offset = -1; offset <= 1; offset++) {
        const otp = await this.generateTotpCode(secretBytes, timeStep + offset, 6);
        if (otp === trimmed) return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  /** Speichert (oder entfernt) TOTP-Secret */
  setTotpSecret(base32: string | null) {
    const u = this.storedUser; if (!u) return;
    u.totpSecret = base32 ?? undefined;
    this.storedUser = u;
  }
  generateTotpSecret(length = 32): string {
    const bytes = new Uint8Array(length);
    this.getRandomBytes(bytes);
    let out = '';
    for (let i = 0; i < length; i++) {
      out += this.BASE32_ALPHABET[bytes[i] % this.BASE32_ALPHABET.length];
    }
    return out;
  }

  isLoggedIn(): boolean {
    return !!this.readSession();
  }

  logout() {
    this.writeSession(null);
    this.router.navigateByUrl('/login');
  }

  /** Liefert den abgeleiteten CryptoKey aus der Session */
  async getSessionKey(): Promise<CryptoKey | null> {
    const b64 = this.readSession();
    if (!b64) return null;
    const raw = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
    return globalThis.crypto.subtle.importKey('raw', raw, 'AES-GCM', false, ['encrypt', 'decrypt']);
    // Hinweis: Key lebt nur in SessionStorage (bis Tab zu)
  }
  private readSession(): string | null {
    if (this.isBrowser) {
      return window.sessionStorage.getItem(this.SESSION_KEY);
    }
    return this.memorySessionKey;
  }

  private writeSession(value: string | null): void {
    if (this.isBrowser) {
      if (value === null) window.sessionStorage.removeItem(this.SESSION_KEY);
      else window.sessionStorage.setItem(this.SESSION_KEY, value);
    } else {
      this.memorySessionKey = value;
    }
  }

  /** PBKDF2 → AES-GCM Key */
  private async deriveKey(passwordBytes: Uint8Array, salt: Uint8Array): Promise<CryptoKey> {
    const subtle = this.getSubtleCrypto();

    const baseKey = await subtle.importKey(
      'raw',
      this.toArrayBuffer(passwordBytes),
      'PBKDF2',
      false,
      ['deriveKey']
    );

    return subtle.deriveKey(
      {
        name: 'PBKDF2',
        hash: 'SHA-256',
        salt: this.toArrayBuffer(salt),
        iterations: 210_000,
      } satisfies Pbkdf2Params,
      baseKey,
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt', 'decrypt']
    );
  }

  private getSubtleCrypto(): SubtleCrypto {
    const cryptoObj = globalThis.crypto ?? null;
    if (!cryptoObj?.subtle) {
      throw new Error('WebCrypto API ist in dieser Umgebung nicht verfügbar.');
    }
    return cryptoObj.subtle;
  }

  private getRandomBytes(target: Uint8Array): void {
    const cryptoObj = globalThis.crypto;
    if (!cryptoObj?.getRandomValues) {
      throw new Error('Krypto-Zufallszahlen nicht verfügbar.');
    }
    cryptoObj.getRandomValues(target);
  }

  private base32ToBytes(input: string): Uint8Array {
    const clean = input.replace(/=+$/, '').toUpperCase();
    let buffer = 0;
    let bits = 0;
    const output: number[] = [];
    for (const char of clean) {
      const value = this.BASE32_ALPHABET.indexOf(char);
      if (value === -1) continue;
      buffer = (buffer << 5) | value;
      bits += 5;
      if (bits >= 8) {
        output.push((buffer >> (bits - 8)) & 0xff);
        bits -= 8;
      }
    }
    return new Uint8Array(output);
  }

  private counterToBuffer(counter: number): ArrayBuffer {
    const buffer = new ArrayBuffer(8);
    const view = new DataView(buffer);
    const big = BigInt(counter);
    view.setUint32(0, Number((big >> 32n) & 0xffffffffn));
    view.setUint32(4, Number(big & 0xffffffffn));
    return buffer;
  }

  private async generateTotpCode(secret: Uint8Array, counter: number, digits: number): Promise<string> {
    if (counter < 0) return '';
    const subtle = this.getSubtleCrypto();
    const key = await subtle.importKey(
      'raw',
      this.toArrayBuffer(secret),
      { name: 'HMAC', hash: 'SHA-1' },
      false,
      ['sign']
    );
    const counterBuffer = this.counterToBuffer(counter);
    const hmac = new Uint8Array(await subtle.sign('HMAC', key, counterBuffer));
    const offset = hmac[hmac.length - 1] & 0x0f;
    const binary = ((hmac[offset] & 0x7f) << 24) |
      ((hmac[offset + 1] & 0xff) << 16) |
      ((hmac[offset + 2] & 0xff) << 8) |
      (hmac[offset + 3] & 0xff);
    const mod = 10 ** digits;
    return (binary % mod).toString().padStart(digits, '0');
  }

  private toArrayBuffer(view: Uint8Array): ArrayBuffer {
    if (
      view.byteOffset === 0 &&
      view.byteLength === view.buffer.byteLength &&
      view.buffer instanceof ArrayBuffer
    ) {
      return view.buffer;
    }

    const copy = new Uint8Array(view.byteLength);
    copy.set(view);
    return copy.buffer;
  }
}
