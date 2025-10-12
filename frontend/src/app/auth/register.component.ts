import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../core/auth.service';
import { CommonModule } from '@angular/common';

@Component({
  standalone: true,
  selector: 'app-register',
  imports: [FormsModule, RouterLink, CommonModule],
  template: `
  <section class="card">
    <h1>Registrieren</h1>
    <form (ngSubmit)="submit()" #f="ngForm">
      <label>E-Mail
        <input type="email" required [(ngModel)]="email" name="email">
      </label>
      <label>Master-Passwort
        <input type="password" required [(ngModel)]="password" name="password">
      </label>
      <label>Master-Passwort wiederholen
        <input type="password" required [(ngModel)]="password2" name="password2">
      </label>
      <button [disabled]="loading || password!==password2">
        {{ loading ? 'Bitte warten…' : 'Konto anlegen' }}
      </button>
      <p class="muted">Schon ein Konto? <a routerLink="/login">Anmelden</a></p>
      <p class="error" *ngIf="error">{{error}}</p>
    </form>
  </section>
  `,
  styles: [`
    .card{max-width:420px;margin:60px auto;padding:24px;border:1px solid #e5e7eb;border-radius:16px}
    label{display:flex;flex-direction:column;gap:6px;margin-bottom:12px}
    input{padding:10px;border:1px solid #d1d5db;border-radius:10px}
    button{width:100%;padding:12px;border:none;border-radius:10px;background:#111827;color:#fff;cursor:pointer}
    .muted{color:#6b7280;margin-top:8px}
    .error{color:#dc2626;margin-top:8px}
  `]
})
export class RegisterComponent {
  private auth = inject(AuthService);
  private router = inject(Router);

  email = '';
  password = '';
  password2 = '';
  error = '';
  loading = false;

  async submit(): Promise<void> {
    if (this.loading) return;
    this.error = '';
    if (this.password !== this.password2) {
      this.error = 'Passwörter stimmen nicht überein.';
      return;
    }
    this.loading = true;
    try {
      await this.auth.register(this.email, this.password);
      const result = await this.auth.login(this.email, this.password);
      if (result === 'OK' || result === 'TWOFA_REQUIRED') {
        await this.router.navigateByUrl(result === 'TWOFA_REQUIRED' ? '/totp-setup' : '/vault');
        return;
      }
      this.error = 'Login nach Registrierung fehlgeschlagen.';
    } catch (e: unknown) {
      this.error = 'Registrierung fehlgeschlagen.';
    } finally {
      this.loading = false;
    }
  }
}
