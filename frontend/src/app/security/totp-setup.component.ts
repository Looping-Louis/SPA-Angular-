import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

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
      Bitte wende dich an den Support, falls du ein neues Gerät koppeln musst.
    </p>
  </section>
  `,
  styles: [`
    .card{max-width:520px;margin:40px auto;padding:24px;border:1px solid #e5e7eb;border-radius:16px;background:#fff}
    h1{margin-top:0;margin-bottom:16px}
    p{margin:0 0 12px;line-height:1.5;color:#374151}
  `]
})
export class TotpSetupComponent {}
