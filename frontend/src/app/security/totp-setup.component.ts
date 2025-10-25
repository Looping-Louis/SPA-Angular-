import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { AuthService, TotpSetupPayload } from '../core/auth.service';

@Component({
  standalone: true,
  selector: 'app-totp-setup',
  imports: [CommonModule],
  template: `
  <section class="card">
    <h1>Two-Factor Authentication</h1>
    <p>
      Dein Account verwendet eine Zwei-Faktor-Authentifizierung. Gib den
      sechsstelligen Code aus deiner Authenticator-App beim Login ein.
    </p>
    <p>
      Die Registrierung und Pflege der TOTP-Secret erfolgt über den Backend-Dienst.
      Wenn du ein weiteres Gerät koppeln möchtest, kannst du unten einen neuen QR-Code abrufen.
    </p>

    <button type="button" (click)="requestTotp()" [disabled]="loading">
      {{ loading ? 'Lade QR-Code…' : (fetched ? 'QR-Code neu anzeigen' : 'QR-Code anzeigen') }}
    </button>
    <p class="error" *ngIf="error">{{ error }}</p>

    <section class="totp" *ngIf="hasTotp">
      <img *ngIf="totpQrCode" [src]="totpQrCode" alt="TOTP QR Code">
      <p class="info" *ngIf="totpLink">
        <a [href]="totpLink" target="_blank" rel="noopener">{{ totpLink }}</a>
      </p>
      <p class="info" *ngIf="totpSecret">
        Geheimcode: <strong>{{ totpSecret }}</strong>
      </p>
    </section>
  </section>
  `,
  styles: [`
    .card{max-width:520px;margin:40px auto;padding:24px;border:1px solid #e5e7eb;border-radius:16px;background:#fff}
    h1{margin-top:0;margin-bottom:16px}
    p{margin:0 0 12px;line-height:1.5;color:#374151}
    button{margin-top:12px;padding:10px 18px;border:none;border-radius:12px;background:#111827;color:#fff;font-weight:600;cursor:pointer}
    button[disabled]{opacity:.5;cursor:not-allowed}
    .error{margin-top:12px;color:#dc2626}
    .totp{margin-top:24px;padding-top:16px;border-top:1px solid #e5e7eb;display:flex;flex-direction:column;gap:12px;align-items:center}
    .totp img{max-width:220px;border:1px solid #d1d5db;border-radius:12px;padding:12px;background:#fff}
    .info{color:#2563eb;word-break:break-all}
  `]
})
export class TotpSetupComponent {
  private auth = inject(AuthService);
  private sanitizer = inject(DomSanitizer);
  private cdr = inject(ChangeDetectorRef);

  loading = false;
  fetched = false;
  error = '';
  totpQrCode: SafeResourceUrl | null = null;
  totpLink: string | null = null;
  totpSecret: string | null = null;

  get hasTotp(): boolean {
    return Boolean(this.totpQrCode || this.totpLink || this.totpSecret);
  }

  async requestTotp(): Promise<void> {
    if (this.loading) return;
    this.loading = true;
    this.error = '';
    try {
      const payload = await this.auth.requestTotpSetup();
      if (!payload) {
        this.clearTotp();
        this.error = 'Der Server stellt aktuell keinen QR-Code bereit. Bitte versuche es später erneut oder kontaktiere den Support.';
        return;
      }
      this.applyTotp(payload);
    } catch {
      this.error = 'QR-Code konnte nicht geladen werden.';
      this.clearTotp();
    } finally {
      this.loading = false;
      this.fetched = true;
      this.cdr.markForCheck();
    }
  }

  private applyTotp(totp: TotpSetupPayload): void {
    this.clearTotp();
    if (totp.qrCodeDataUrl) {
      this.totpQrCode = this.sanitizer.bypassSecurityTrustResourceUrl(totp.qrCodeDataUrl);
    } else if (totp.otpauthUrl) {
      const fallback = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(totp.otpauthUrl)}`;
      this.totpQrCode = this.sanitizer.bypassSecurityTrustResourceUrl(fallback);
    } else {
      this.totpQrCode = null;
    }
    this.totpLink = totp.otpauthUrl ?? null;
    this.totpSecret = totp.secret ?? null;
  }

  private clearTotp(): void {
    this.totpQrCode = null;
    this.totpLink = null;
    this.totpSecret = null;
  }
}
