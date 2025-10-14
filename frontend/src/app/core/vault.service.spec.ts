import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_BASE_URL } from './api.config';
import { VaultItem, VaultPayload, VaultService } from './vault.service';

describe('VaultService', () => {
  const apiBase = 'https://api.example.test';
  let service: VaultService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [{ provide: API_BASE_URL, useValue: apiBase }]
    });

    service = TestBed.inject(VaultService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
  });

  it('list requests the vault collection', async () => {
    const promise = service.list();
    const req = http.expectOne(`${apiBase}/vault`);
    expect(req.request.method).toBe('GET');

    const payload: VaultItem[] = [
      { id: 1, title: 'Email', username: 'user', password: 'secret' }
    ];
    req.flush(payload);

    await expectAsync(promise).toBeResolvedTo(payload);
  });

  it('create posts a new entry', async () => {
    const input: VaultPayload = {
      title: 'Shop',
      username: 'buyer',
      password: 'hunter2',
      url: 'https://shop.invalid',
      notes: 'Note'
    };

    const promise = service.create(input);
    const req = http.expectOne(`${apiBase}/vault`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(input);

    const created: VaultItem = { id: 2, ...input };
    req.flush(created);

    await expectAsync(promise).toBeResolvedTo(created);
  });

  it('update puts the partial payload for an entry', async () => {
    const patch: Partial<VaultPayload> = { username: 'new-user', notes: 'Updated' };
    const promise = service.update(3, patch);
    const req = http.expectOne(`${apiBase}/vault/3`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual(patch);

    const updated: VaultItem = {
      id: 3,
      title: 'Bank',
      username: 'new-user',
      password: 'pass',
      notes: 'Updated'
    };
    req.flush(updated);

    await expectAsync(promise).toBeResolvedTo(updated);
  });

  it('delete removes an entry by id', async () => {
    const promise = service.delete(4);
    const req = http.expectOne(`${apiBase}/vault/4`);
    expect(req.request.method).toBe('DELETE');
    expect(req.request.body).toBeNull();

    req.flush(null);
    await expectAsync(promise).toBeResolved();
  });
});
