import { ChangeDetectorRef, Component, OnDestroy, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { AuthService } from '../core/auth.service';

@Component({
  standalone: true,
  selector: 'app-totp-setup',
  imports: [CommonModule, FormsModule],
  template: `
  <section class="card">
    <h1>TOTP einrichten</h1>
    <p>Scanne den QR-Code mit deiner Authenticator-App (z. B. Google Authenticator).
       Danach gib den 6-stelligen Code ein und speichere.</p>

    <div class="qrwrap" *ngIf="otpauthUrl">
      <img *ngIf="qrDataUrl" [src]="qrDataUrl" alt="TOTP QR Code">
      <p class="muted">Secret: <code>{{ secret }}</code></p>
    </div>

    <div class="row">
      <button type="button" (click)="create()">Secret erzeugen</button>
      <button type="button" class="danger" (click)="disable()">Deaktivieren</button>
    </div>

    <form (ngSubmit)="verify()" *ngIf="secret">
      <label>Code aus App
        <input type="text" maxlength="6" pattern="\\d{6}" [(ngModel)]="code" name="code" required>
      </label>
      <button>Bestätigen</button>
      <p class="ok" *ngIf="ok">✅ Aktiviert</p>
      <p class="error" *ngIf="error">{{error}}</p>
    </form>
  </section>
  `,
  styles: [`
    .card{max-width:520px;margin:40px auto;padding:24px;border:1px solid #e5e7eb;border-radius:16px}
    .qrwrap{display:flex;flex-direction:column;align-items:center;gap:12px;margin:16px 0}
    .qrwrap img{width:220px;height:220px;object-fit:contain;border-radius:12px;box-shadow:0 10px 30px rgba(15,23,42,0.15)}
    .qrwrap code{background:#f3f4f6;padding:4px 8px;border-radius:8px;font-family:monospace}
    .row{display:flex;gap:8px;margin:8px 0 16px}
    label{display:flex;flex-direction:column;gap:6px;margin-bottom:12px}
    input{padding:10px;border:1px solid #d1d5db;border-radius:10px}
    button{padding:10px 12px;border:none;border-radius:10px;background:#111827;color:#fff;cursor:pointer}
    .danger{background:#dc2626}
    .muted{color:#6b7280;font-size:12px;word-break:break-all}
    .ok{color:#16a34a}
    .error{color:#dc2626}
  `]
})
export class TotpSetupComponent implements OnInit, OnDestroy {
  private auth = inject(AuthService);
  private cdr = inject(ChangeDetectorRef);
  secret = '';
  otpauthUrl = '';
  qrDataUrl = '';
  code = '';
  ok = false;
  error = '';
  private destroyed = false;

  ngOnInit(): void {
    const existing = this.auth.getTotpSecret();
    if (existing) {
      this.secret = existing;
      this.ok = true;
      this.setupDisplay(existing);
      this.detectChanges();
    }
  }

  async create(){
    try {
      const secret = this.auth.generateTotpSecret();
      this.secret = secret;
      this.ok = false;
      this.error = '';
      this.code = '';
      this.setupDisplay(secret);
    } catch (err) {
      console.error('TOTP secret creation failed', err);
      this.error = 'Secret konnte nicht erzeugt werden.';
    } finally {
      this.detectChanges();
    }
  }

  private setupDisplay(secret: string){
    const email = this.auth.getUserEmail() ?? 'user';
    const label = encodeURIComponent(`PasswortManager:${email}`);
    const issuer = encodeURIComponent('PasswortManager');
    this.otpauthUrl = `otpauth://totp/${label}?secret=${secret}&issuer=${issuer}`;
    this.qrDataUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(this.otpauthUrl)}`;
    this.detectChanges();
  }

  async verify(){
    this.ok = false; this.error = '';
    const normalized = this.code.replace(/\D/g, '');
    this.code = normalized;
    const valid = await this.auth.verifyTotp(normalized, this.secret);
    if (!valid) {
      this.error = 'Code ungültig.';
      this.detectChanges();
      return;
    }
    this.auth.setTotpSecret(this.secret);
    this.ok = true;
    this.detectChanges();
  }

  disable(){
    this.auth.setTotpSecret(null);
    this.secret=''; this.otpauthUrl=''; this.qrDataUrl=''; this.code=''; this.ok=false; this.error='';
    this.detectChanges();
  }

  ngOnDestroy(): void {
    this.destroyed = true;
  }

  private detectChanges(): void {
    if (this.destroyed) return;
    this.cdr.detectChanges();
  }
}
