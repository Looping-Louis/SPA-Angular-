import { Inject, Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { API_BASE_URL } from './api.config';

type LoginResponse = { tmpToken: string } | SessionPayload;
type SessionPayload = { token: string; userId: string; email: string; expiresAt?: string };

export type TotpSetupPayload = {
  otpauthUrl?: string;
  qrCodeDataUrl?: string;
  secret?: string;
};

export type RegisterResult =
  | { status: 'SUCCESS'; totp?: TotpSetupPayload }
  | { status: 'EMAIL_EXISTS' }
  | { status: 'SERVER_ERROR' };
export type LoginResult = 'OK' | 'TWOFA_REQUIRED' | 'INVALID_CREDENTIALS' | 'SERVER_ERROR';
export type TotpResult = 'OK' | 'INVALID_CODE' | 'SERVER_ERROR';

type ErrorCode = 'INVALID_CREDENTIALS' | 'INVALID_TOTP' | 'EMAIL_EXISTS' | 'SERVER_ERROR';

type SessionState = SessionPayload;

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly SESSION_KEY = 'pm_session_v2';
  private readonly isBrowser = typeof window !== 'undefined';
  private session: SessionState | null;
  private tmpToken: string | null = null;

  constructor(
    private readonly router: Router,
    private readonly http: HttpClient,
    @Inject(API_BASE_URL) private readonly apiBaseUrl: string
  ) {
    this.session = this.restoreSession();
  }

  async register(email: string, password: string): Promise<RegisterResult> {
    try {
      const response = await firstValueFrom(
        this.http.post<unknown>(`${this.apiBaseUrl}/auth/register`, { email, password })
      );
      const totp = this.extractTotp(response);
      return { status: 'SUCCESS', totp };
    } catch (error: unknown) {
      const code = this.mapError(error);
      if (code === 'EMAIL_EXISTS') return { status: 'EMAIL_EXISTS' };
      return { status: 'SERVER_ERROR' };
    }
  }

  async login(email: string, password: string): Promise<LoginResult> {
    try {
      const response = await firstValueFrom(
        this.http.post<LoginResponse>(`${this.apiBaseUrl}/auth/login`, { email, password })
      );
      if ('tmpToken' in response) {
        this.tmpToken = response.tmpToken;
        return 'TWOFA_REQUIRED';
      }
      this.persistSession(response);
      return 'OK';
    } catch (error: unknown) {
      const code = this.mapError(error);
      if (code === 'INVALID_CREDENTIALS') return 'INVALID_CREDENTIALS';
      return 'SERVER_ERROR';
    }
  }

  async verifyTotp(code: string): Promise<TotpResult> {
    if (!this.tmpToken) return 'INVALID_CODE';
    try {
      const response = await firstValueFrom(
        this.http.post<SessionPayload>(`${this.apiBaseUrl}/auth/totp-verify`, {
          tmpToken: this.tmpToken,
          code
        })
      );
      this.persistSession(response);
      this.tmpToken = null;
      return 'OK';
    } catch (error: unknown) {
      const code = this.mapError(error);
      if (code === 'INVALID_TOTP' || code === 'INVALID_CREDENTIALS') {
        return 'INVALID_CODE';
      }
      return 'SERVER_ERROR';
    }
  }

  async requestTotpSetup(): Promise<TotpSetupPayload | null> {
    const response = await firstValueFrom(
      this.http.post<unknown>(`${this.apiBaseUrl}/auth/totp-setup`, {})
    );
    return this.extractTotp(response) ?? null;
  }

  isLoggedIn(): boolean {
    if (!this.session) return false;
    if (!this.session.expiresAt) return true;
    return new Date(this.session.expiresAt).getTime() > Date.now();
  }

  getToken(): string | null {
    return this.session?.token ?? null;
  }

  getUserEmail(): string | null {
    return this.session?.email ?? null;
  }

  logout(): void {
    this.clearSession();
    this.router.navigateByUrl('/login');
  }

  handleUnauthorized(): void {
    const hadSession = !!this.session;
    this.clearSession();
    if (hadSession) {
      this.router.navigateByUrl('/login');
    }
  }

  private persistSession(payload: SessionPayload): void {
    this.session = payload;
    if (!this.isBrowser) return;
    window.localStorage.setItem(this.SESSION_KEY, JSON.stringify(payload));
  }

  private restoreSession(): SessionState | null {
    if (!this.isBrowser) return null;
    try {
      const stored = window.localStorage.getItem(this.SESSION_KEY);
      return stored ? (JSON.parse(stored) as SessionState) : null;
    } catch {
      return null;
    }
  }

  private clearSession(): void {
    this.session = null;
    this.tmpToken = null;
    if (this.isBrowser) {
      window.localStorage.removeItem(this.SESSION_KEY);
    }
  }

  private extractTotp(response: unknown): TotpSetupPayload | undefined {
    if (!response || typeof response !== 'object') return undefined;
    const data = response as Record<string, unknown>;

    const otpauthUrl = this.pickString(data, [
      'totpProvisioningUri',
      'totpUri',
      'otpauth',
      'otpauthUrl',
      'otpauth_url'
    ]);
    const qrCodeDataUrl = this.pickString(data, [
      'totpQrCodeDataUrl',
      'totpQrCode',
      'qrCodeDataUrl',
      'qr'
    ]);
    const secret = this.pickString(data, ['totpSecret', 'secret']);

    if (!otpauthUrl && !qrCodeDataUrl && !secret) return undefined;
    return { otpauthUrl, qrCodeDataUrl, secret };
  }

  private mapError(error: unknown): ErrorCode {
    if (error instanceof HttpErrorResponse) {
      if (error.status === 409) return 'EMAIL_EXISTS';
      if (error.status === 400 || error.status === 401 || error.status === 422) {
        const backendCode = this.extractBackendCode(error);
        if (backendCode === 'INVALID_TOTP') return 'INVALID_TOTP';
        return 'INVALID_CREDENTIALS';
      }
    }
    return 'SERVER_ERROR';
  }

  private pickString(source: Record<string, unknown>, keys: string[]): string | undefined {
    for (const key of keys) {
      const value = source[key];
      if (typeof value === 'string' && value.trim().length > 0) {
        return value;
      }
    }
    return undefined;
  }

  private extractBackendCode(error: HttpErrorResponse): string | undefined {
    if (typeof error.error === 'string') return undefined;
    if (error.error && typeof error.error === 'object') {
      if ('code' in error.error && typeof error.error.code === 'string') {
        return error.error.code;
      }
    }
    return undefined;
  }
}
