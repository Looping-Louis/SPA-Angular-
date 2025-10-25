/// <reference types="jasmine" />
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { AuthService, LoginResult, RegisterResult, TotpResult } from './auth.service';
import { API_BASE_URL } from './api.config';

describe('AuthService', () => {
  const apiBase = 'https://api.example.test';
  let service: AuthService;
  let http: HttpTestingController;
  let router: jasmine.SpyObj<Router>;
  let storage: Record<string, string>;

  beforeEach(() => {
    router = jasmine.createSpyObj<Router>('Router', ['navigateByUrl']);
    storage = {};

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        { provide: Router, useValue: router },
        { provide: API_BASE_URL, useValue: apiBase }
      ]
    });

    spyOn(window.localStorage, 'getItem').and.callFake((key: string) => storage[key] ?? null);
    spyOn(window.localStorage, 'setItem').and.callFake((key: string, value: string) => {
      storage[key] = value;
    });
    spyOn(window.localStorage, 'removeItem').and.callFake((key: string) => {
      delete storage[key];
    });

    service = TestBed.inject(AuthService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
    router.navigateByUrl.calls.reset();
  });

  function expectResolved<T>(promise: Promise<T>, expected: T): PromiseLike<void> {
    return expectAsync(promise).toBeResolvedTo(expected);
  }

  it('register posts credentials to /auth/register', async () => {
    const promise = service.register('user@example.com', 'secret');
    const req = http.expectOne(`${apiBase}/auth/register`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ email: 'user@example.com', password: 'secret' });
    req.flush({
      totpProvisioningUri: 'otpauth://totp/MyApp:user@example.com?secret=ABC123&issuer=MyApp',
      totpSecret: 'ABC123'
    });

    const result = await promise;
    expect(result.status).toBe('SUCCESS');
    if (result.status !== 'SUCCESS') {
      return fail('expected registration to succeed');
    }
    expect(result.totp?.otpauthUrl).toContain('otpauth://totp/');
    expect(result.totp?.secret).toBe('ABC123');
  });

  it('register maps duplicate email errors', async () => {
    const promise = service.register('user@example.com', 'secret');
    const req = http.expectOne(`${apiBase}/auth/register`);
    req.flush({ code: 'EMAIL_EXISTS' }, { status: 409, statusText: 'Conflict' });

    const result = await promise;
    expect(result.status).toBe('EMAIL_EXISTS');
  });

  it('login stores session when backend returns payload', async () => {
    const session = {
      token: 'jwt-token',
      userId: '42',
      email: 'user@example.com',
      expiresAt: '2099-01-01T00:00:00.000Z'
    };

    const result = service.login('user@example.com', 'secret');
    const req = http.expectOne(`${apiBase}/auth/login`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ email: 'user@example.com', password: 'secret' });
    req.flush(session);

    await expectResolved<LoginResult>(result, 'OK');
    expect(storage['pm_session_v2']).toEqual(JSON.stringify(session));
    expect(service.getToken()).toBe(session.token);
    expect(service.isLoggedIn()).toBeTrue();
  });

  it('login returns TWOFA_REQUIRED and stores temporary token', async () => {
    const loginResult = service.login('user@example.com', 'secret');
    const req = http.expectOne(`${apiBase}/auth/login`);
    req.flush({ tmpToken: 'tmp-token' });

    await expectResolved<LoginResult>(loginResult, 'TWOFA_REQUIRED');
    expect(service.getToken()).toBeNull();

    const verifyResult = service.verifyTotp('123456');
    const verifyReq = http.expectOne(`${apiBase}/auth/totp-verify`);
    expect(verifyReq.request.method).toBe('POST');
    expect(verifyReq.request.body).toEqual({ tmpToken: 'tmp-token', code: '123456' });

    const session = { token: 'jwt', userId: '1', email: 'user@example.com' };
    verifyReq.flush(session);
    await expectResolved<TotpResult>(verifyResult, 'OK');
    expect(storage['pm_session_v2']).toEqual(JSON.stringify(session));
  });

  it('verifyTotp maps invalid code responses', async () => {
    const loginPromise = service.login('user@example.com', 'secret');
    http.expectOne(`${apiBase}/auth/login`).flush({ tmpToken: 'tmp-token' });
    await expectResolved<LoginResult>(loginPromise, 'TWOFA_REQUIRED');

    const verifyResult = service.verifyTotp('654321');
    const req = http.expectOne(`${apiBase}/auth/totp-verify`);
    req.flush({ code: 'INVALID_TOTP' }, { status: 400, statusText: 'Bad Request' });

    await expectResolved<TotpResult>(verifyResult, 'INVALID_CODE');
    expect(storage['pm_session_v2']).toBeUndefined();
  });

  it('logout clears persisted session and navigates to login', async () => {
    const loginPromise = service.login('user@example.com', 'secret');
    http.expectOne(`${apiBase}/auth/login`).flush({ token: 'jwt', userId: '1', email: 'user@example.com' });
    await expectResolved<LoginResult>(loginPromise, 'OK');

    router.navigateByUrl.calls.reset();
    service.logout();

    expect(storage['pm_session_v2']).toBeUndefined();
    expect(router.navigateByUrl).toHaveBeenCalledWith('/login');
    expect(service.isLoggedIn()).toBeFalse();
  });

  it('handleUnauthorized only navigates when a session existed', async () => {
    service.handleUnauthorized();
    expect(router.navigateByUrl).not.toHaveBeenCalled();

    const loginPromise = service.login('user@example.com', 'secret');
    http.expectOne(`${apiBase}/auth/login`).flush({ token: 'jwt', userId: '1', email: 'user@example.com' });
    await expectResolved<LoginResult>(loginPromise, 'OK');

    router.navigateByUrl.calls.reset();
    service.handleUnauthorized();
    expect(storage['pm_session_v2']).toBeUndefined();
    expect(router.navigateByUrl).toHaveBeenCalledWith('/login');
  });
});
