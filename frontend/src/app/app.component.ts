import { Component, inject } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
import { AuthService } from './core/auth.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, CommonModule],
  template: `
  <header class="topbar" *ngIf="auth.isLoggedIn()">
    <nav>
      <a routerLink="/vault">Tresor</a>
      <a routerLink="/totp-setup">TOTP</a>
    </nav>
    <div class="spacer"></div>
    <button class="link" (click)="logout()">Logout</button>
  </header>
  <main class="container">
    <router-outlet />
  </main>
  <footer class="legal-footer">
    <a routerLink="/impressum">Impressum</a>
  </footer>
  `,
  styles: [`
    .topbar{display:flex;gap:16px;align-items:center;padding:12px 16px;border-bottom:1px solid #e5e7eb;position:sticky;top:0;background:#fff;z-index:5}
    nav a{margin-right:8px;text-decoration:none;color:#111827}
    .link{background:transparent;border:none;color:#2563eb;cursor:pointer}
    .container{max-width:980px;margin:32px auto;padding:0 16px}
    .spacer{flex:1}
    .legal-footer{max-width:980px;margin:0 auto 24px;padding:0 16px;text-align:right;font-size:14px;color:#6b7280}
    .legal-footer a{color:#6b7280;text-decoration:none}
    .legal-footer a:hover{color:#2563eb;text-decoration:underline}
  `]
})
export class AppComponent {
  auth = inject(AuthService);
  logout(){ this.auth.logout(); }
}
