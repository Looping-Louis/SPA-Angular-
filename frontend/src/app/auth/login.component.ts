import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../core/auth.service';
import { CommonModule } from '@angular/common';

@Component({
  standalone: true,
  selector: 'app-login',
  imports: [FormsModule, CommonModule, RouterLink],
  template: `
  <section class="card">
    <h1>Anmelden</h1>
    <form (ngSubmit)="submit()" #f="ngForm">
      <label>E-Mail
        <input type="email" required [(ngModel)]="email" name="email">
      </label>
      <label>Master-Passwort
        <input type="password" required [(ngModel)]="password" name="password">
      </label>

      <ng-container *ngIf="need2fa">
        <label>2FA Code (TOTP)
          <input type="text" maxlength="6" pattern="\\d{6}" [(ngModel)]="otp" name="otp">
        </label>
      </ng-container>

      <button [disabled]="loading">{{ loading ? 'Bitte warten…' : (need2fa ? 'Bestätigen' : 'Login') }}</button>
      <p class="muted">Noch kein Konto? <a routerLink="/register">Registrieren</a></p>
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
export class LoginComponent {
  private auth = inject(AuthService);
  private router = inject(Router);

  email = '';
  password = '';
  otp = '';
  need2fa = false;
  loading = false;
  error = '';

  async submit(): Promise<void> {
    this.error = '';
    this.loading = true;
    try {
      if (!this.need2fa) {
        const res = await this.auth.login(this.email, this.password);
        if (res === 'OK') {
          await this.router.navigateByUrl('/vault');
          return;
        }
        if (res === 'TWOFA_REQUIRED') {
          this.need2fa = true;
          return;
        }
        this.error = res === 'NO_USER' ? 'Kein Benutzer registriert.' : 'E-Mail passt nicht.';
      } else {
        const normalizedOtp = this.otp.replace(/\D/g, '');
        this.otp = normalizedOtp;
        const ok = await this.auth.verifyTotp(normalizedOtp);
        if (ok) {
          await this.router.navigateByUrl('/vault');
          return;
        }
        this.error = 'TOTP Code ungültig.';
      }
    } finally {
      this.loading = false;
    }
  }
}
