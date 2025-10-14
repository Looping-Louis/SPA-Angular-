import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { API_BASE_URL } from './api.config';

export type VaultItem = {
  id: number;
  title: string;
  username: string;
  password: string;
  url?: string;
  notes?: string;
};

export type VaultPayload = Omit<VaultItem, 'id'>;

@Injectable({ providedIn: 'root' })
export class VaultService {
  private readonly http = inject(HttpClient);
  private readonly apiBaseUrl = inject(API_BASE_URL);

  list(): Promise<VaultItem[]> {
    return firstValueFrom(this.http.get<VaultItem[]>(`${this.apiBaseUrl}/vault`));
  }

  create(payload: VaultPayload): Promise<VaultItem> {
    return firstValueFrom(
      this.http.post<VaultItem>(`${this.apiBaseUrl}/vault`, payload)
    );
  }

  update(id: number, payload: Partial<VaultPayload>): Promise<VaultItem> {
    return firstValueFrom(
      this.http.put<VaultItem>(`${this.apiBaseUrl}/vault/${id}`, payload)
    );
  }

  delete(id: number): Promise<void> {
    return firstValueFrom(
      this.http.delete<void>(`${this.apiBaseUrl}/vault/${id}`)
    );
  }
}
