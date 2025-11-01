import { InjectionToken } from '@angular/core';

export const GQL_URL = 'https://password-graphql-721738115352.europe-west1.run.app/graphql';
export const BACKEND_URL = 'https://password-backend-721738115352.europe-west1.run.app/api';

export const API_BASE_URL = new InjectionToken<string>('API_BASE_URL', {
  providedIn: 'root',
  factory: () => BACKEND_URL
});

export const API_GRAPHQL_URL = new InjectionToken<string>('API_GRAPHQL_URL', {
  providedIn: 'root',
  factory: () => GQL_URL
});
