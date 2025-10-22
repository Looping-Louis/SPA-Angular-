import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_GRAPHQL_URL } from './api.config';
import { VaultItem, VaultPayload, VaultService } from './vault.service';

describe('VaultService', () => {
  const graphqlUrl = 'https://graphql.example.test/graphql';
  let service: VaultService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [{ provide: API_GRAPHQL_URL, useValue: graphqlUrl }]
    });

    service = TestBed.inject(VaultService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
  });

  it('list requests the vault collection via GraphQL', async () => {
    const promise = service.list();
    const req = http.expectOne(graphqlUrl);
    expect(req.request.method).toBe('POST');
    expect(req.request.body.query).toContain('query VaultItems');

    const payload: VaultItem[] = [
      { id: 1, title: 'Email', username: 'user', password: 'secret', url: undefined, notes: undefined }
    ];
    req.flush({ data: { vaultItems: payload } });

    await expectAsync(promise).toBeResolvedTo(payload);
  });

  it('create calls the GraphQL mutation and returns the created entry', async () => {
    const input: VaultPayload = {
      title: 'Shop',
      username: 'buyer',
      password: 'hunter2',
      url: 'https://shop.invalid',
      notes: 'Note'
    };

    const promise = service.create(input);
    const req = http.expectOne(graphqlUrl);
    expect(req.request.method).toBe('POST');
    expect(req.request.body.query).toContain('mutation CreateVaultItem');
    expect(req.request.body.variables).toEqual({ input });

    const created: VaultItem = { id: 2, ...input };
    req.flush({ data: { createVaultItem: created } });

    await expectAsync(promise).toBeResolvedTo(created);
  });

  it('update calls the GraphQL mutation with id and payload', async () => {
    const patch: Partial<VaultPayload> = { username: 'new-user', notes: 'Updated' };
    const promise = service.update(3, patch);
    const req = http.expectOne(graphqlUrl);
    expect(req.request.method).toBe('POST');
    expect(req.request.body.query).toContain('mutation UpdateVaultItem');
    expect(req.request.body.variables).toEqual({ id: '3', input: patch });

    const updated: VaultItem = {
      id: 3,
      title: 'Bank',
      username: 'new-user',
      password: 'pass',
      url: undefined,
      notes: 'Updated'
    };
    req.flush({ data: { updateVaultItem: updated } });

    await expectAsync(promise).toBeResolvedTo(updated);
  });

  it('delete invokes the GraphQL mutation and resolves', async () => {
    const promise = service.delete(4);
    const req = http.expectOne(graphqlUrl);
    expect(req.request.method).toBe('POST');
    expect(req.request.body.query).toContain('mutation DeleteVaultItem');
    expect(req.request.body.variables).toEqual({ id: '4' });

    req.flush({ data: { deleteVaultItem: true } });
    await expectAsync(promise).toBeResolved();
  });
});
