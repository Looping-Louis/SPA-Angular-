import { Inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { API_GRAPHQL_URL } from './api.config';

export type VaultItem = {
  id: number;
  title: string;
  username: string;
  password: string;
  url?: string;
  notes?: string;
};

export type VaultPayload = Omit<VaultItem, 'id'>;

type GraphqlResponse<T> = {
  data?: T;
  errors?: Array<{ message: string }>;
};

type VaultItemGraph = VaultItem & { id: number | string };

const ITEM_FIELDS = `
  id
  title
  username
  password
  url
  notes
`;

@Injectable({ providedIn: 'root' })
export class VaultService {
  constructor(
    private readonly http: HttpClient,
    @Inject(API_GRAPHQL_URL) private readonly graphqlUrl: string
  ) {}

  async list(): Promise<VaultItem[]> {
    const result = await this.execute<{ vaultItems: VaultItemGraph[] }>(
      `
      query VaultItems {
        vaultItems {
          ${ITEM_FIELDS}
        }
      }
      `
    );
    return result.vaultItems.map(item => this.normalize(item));
  }

  async create(payload: VaultPayload): Promise<VaultItem> {
    const result = await this.execute<{ createVaultItem: VaultItemGraph }>(
      `
      mutation CreateVaultItem($input: VaultUpsertInput!) {
        createVaultItem(input: $input) {
          ${ITEM_FIELDS}
        }
      }
      `,
      { input: payload }
    );
    return this.normalize(result.createVaultItem);
  }

  async update(id: number, payload: Partial<VaultPayload>): Promise<VaultItem> {
    const result = await this.execute<{ updateVaultItem: VaultItemGraph }>(
      `
      mutation UpdateVaultItem($id: ID!, $input: VaultUpsertInput!) {
        updateVaultItem(id: $id, input: $input) {
          ${ITEM_FIELDS}
        }
      }
      `,
      { id: String(id), input: payload }
    );
    return this.normalize(result.updateVaultItem);
  }

  async delete(id: number): Promise<void> {
    const result = await this.execute<{ deleteVaultItem: boolean }>(
      `
      mutation DeleteVaultItem($id: ID!) {
        deleteVaultItem(id: $id)
      }
      `,
      { id: String(id) }
    );
    if (!result.deleteVaultItem) {
      throw new Error('Vault item could not be deleted.');
    }
  }

  private async execute<T>(query: string, variables?: Record<string, unknown>): Promise<T> {
    const response = await firstValueFrom(
      this.http.post<GraphqlResponse<T>>(this.graphqlUrl, { query, variables })
    );

    if (response.errors?.length) {
      const message = response.errors.map(error => error.message).join('; ');
      throw new Error(message || 'GraphQL request failed');
    }

    if (!response.data) {
      throw new Error('GraphQL request returned no data');
    }

    return response.data;
  }

  private normalize(item: VaultItemGraph): VaultItem {
    const id = typeof item.id === 'number' ? item.id : Number(item.id);
    if (!Number.isFinite(id)) {
      throw new Error('Invalid vault item id');
    }

    return {
      id,
      title: item.title,
      username: item.username,
      password: item.password,
      url: item.url ?? undefined,
      notes: item.notes ?? undefined
    };
  }
}
