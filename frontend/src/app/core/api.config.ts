import { InjectionToken } from '@angular/core';

/** Production endpoints (Render) - fest verdrahtet */
export const GQL_URL = 'https://password-graphql.onrender.com/graphql';
export const BACKEND_URL = 'https://password-backend-fc0k.onrender.com';

/**
 * Base URL of the backend API. Centralised in an injection token so the value
 * can easily be swapped for different environments.
 */
export const API_BASE_URL = new InjectionToken<string>('API_BASE_URL', {
  providedIn: 'root',
  factory: () => BACKEND_URL
});

/**
 * GraphQL endpoint. Exposed as an injection token for upcoming features that
 * need to execute GraphQL operations.
 */
export const API_GRAPHQL_URL = new InjectionToken<string>('API_GRAPHQL_URL', {
  providedIn: 'root',
  factory: () => GQL_URL
});
