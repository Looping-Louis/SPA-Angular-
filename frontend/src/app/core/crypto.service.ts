import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class CryptoService {
  async encryptJson(key: CryptoKey, data: unknown): Promise<string> {
    const iv = globalThis.crypto.getRandomValues(new Uint8Array(12));
    const plaintext = new TextEncoder().encode(JSON.stringify(data));
    const cipher = await globalThis.crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, plaintext);
    // Format: iv:cipher (beides base64)
    const ivB64 = btoa(String.fromCharCode(...iv));
    const cB64 = btoa(String.fromCharCode(...new Uint8Array(cipher)));
    return `${ivB64}:${cB64}`;
  }

  async decryptJson<T>(key: CryptoKey, blob: string): Promise<T> {
    const [ivB64, cB64] = blob.split(':');
    const iv = Uint8Array.from(atob(ivB64), c => c.charCodeAt(0));
    const cipher = Uint8Array.from(atob(cB64), c => c.charCodeAt(0));
    const plain = await globalThis.crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, cipher);
    const text = new TextDecoder().decode(plain);
    return JSON.parse(text) as T;
  }
}
