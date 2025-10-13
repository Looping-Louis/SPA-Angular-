import { InjectionToken } from '@angular/core';

/**
 * Base URL of the backend API. Centralised in an injection token so the value
 * can easily be swapped for different environments.
 */
export const API_BASE_URL = new InjectionToken<string>('API_BASE_URL', {
  providedIn: 'root',
  factory: () => 'https://password-backend-fc0k.onrender.com'
});
