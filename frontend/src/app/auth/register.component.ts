import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService, TotpSetupPayload } from '../core/auth.service';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

@Component({
  standalone: true,
  selector: 'app-register',
  imports: [FormsModule, RouterLink, CommonModule],
  template: `
  <section class="card">
    <h1>Registrieren</h1>
    <form (ngSubmit)="submit()" #f="ngForm" [class.completed]="registrationCompleted">
      <label>E-Mail
        <input type="email" required [(ngModel)]="email" name="email" [disabled]="registrationCompleted">
      </label>
      <label>Master-Passwort
        <input type="password" required [(ngModel)]="password" name="password" [disabled]="registrationCompleted">
      </label>
      <label>Master-Passwort wiederholen
        <input type="password" required [(ngModel)]="password2" name="password2" [disabled]="registrationCompleted">
      </label>
      <button [disabled]="loading || password!==password2 || registrationCompleted">
        {{ loading ? 'Bitte warten…' : 'Konto anlegen' }}
      </button>
      <p class="muted">Schon ein Konto? <a routerLink="/login">Anmelden</a></p>
      <p class="error" *ngIf="error">{{error}}</p>
    </form>

    <section class="totp" *ngIf="registrationCompleted">
      <h2>2FA einrichten</h2>
      <p>
        Bitte scanne den QR-Code mit deiner Authenticator-App oder gib den Code manuell ein.
        Ohne diesen Schritt kannst du dich nicht anmelden.
      </p>
      <img *ngIf="totpQrCode" [src]="totpQrCode" alt="TOTP QR Code">
      <button class="secondary" type="button" (click)="goToLogin()">Weiter zum Login</button>
    </section>
  </section>
  `,
  styles: [`
    .card{max-width:420px;margin:60px auto;padding:24px;border:1px solid #e5e7eb;border-radius:16px}
    label{display:flex;flex-direction:column;gap:6px;margin-bottom:12px}
    input{padding:10px;border:1px solid #d1d5db;border-radius:10px}
    form.completed input{background:#f3f4f6;color:#6b7280}
    button{width:100%;padding:12px;border:none;border-radius:10px;background:#111827;color:#fff;cursor:pointer}
    button.secondary{margin-top:16px;background:#111827}
    .muted{color:#6b7280;margin-top:8px}
    .error{color:#dc2626;margin-top:8px}
    .totp{margin-top:32px;padding-top:16px;border-top:1px solid #e5e7eb;display:flex;flex-direction:column;gap:12px}
    .totp img{max-width:220px;align-self:center;border:1px solid #d1d5db;border-radius:12px;padding:12px;background:#fff}
    .info{color:#2563eb;word-break:break-all}
  `]
})
export class RegisterComponent {
  private auth = inject(AuthService);
  private router = inject(Router);
  private sanitizer = inject(DomSanitizer);
  private cdr = inject(ChangeDetectorRef);

  email = '';
  password = '';
  password2 = '';
  error = '';
  loading = false;
  registrationCompleted = false;
  totpQrCode: SafeResourceUrl | null = null;

  async submit(): Promise<void> {
    if (this.loading) return;
    this.error = '';
    if (this.password !== this.password2) {
      this.error = 'Passwörter stimmen nicht überein.';
      return;
    }
    this.loading = true;
    try {
      const result = await this.auth.register(this.email, this.password);
      if (result.status === 'SUCCESS') {
        this.registrationCompleted = true;
        this.applyTotp(result.totp);
        if (typeof window !== 'undefined' && window.sessionStorage) {
          window.sessionStorage.setItem('pm_prefill_email', this.email);
        }
        return;
      }
      if (result.status === 'EMAIL_EXISTS') {
        this.error = 'Diese E-Mail-Adresse ist bereits vergeben.';
        return;
      }
      this.error = 'Registrierung derzeit nicht möglich.';
    } catch {
      this.error = 'Registrierung fehlgeschlagen.';
    } finally {
      this.loading = false;
      this.cdr.markForCheck();
    }
  }

  goToLogin(): void {
    this.router.navigateByUrl('/login');
  }

  private applyTotp(totp?: TotpSetupPayload): void {
    if (!totp) {
      this.totpQrCode = null;
      this.cdr.markForCheck();
      return;
    }
    if (totp.qrCodeDataUrl) {
      this.totpQrCode = this.sanitizer.bypassSecurityTrustResourceUrl(totp.qrCodeDataUrl);
    } else if (totp.otpauthUrl) {
      const fallback = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(totp.otpauthUrl)}`;
      this.totpQrCode = this.sanitizer.bypassSecurityTrustResourceUrl(fallback);
    } else {
      this.totpQrCode = null;
    }
    this.cdr.markForCheck();
  }
}
