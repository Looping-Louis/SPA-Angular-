import { Component, ElementRef, ViewChild, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { v4 as uuid } from 'uuid';
import { AuthService } from '../core/auth.service';
import { CryptoService } from '../core/crypto.service';

type VaultEntry = { id: string; title: string; url?: string; username: string; password: string; notes?: string; };
type VaultBlob = string; // iv:cipher base64

@Component({
  standalone: true,
  selector: 'app-vault',
  imports: [CommonModule, FormsModule],
  template: `
  <section class="vault">
    <header class="toolbar">
      <div class="search">
        <span class="icon">🔍</span>
        <input placeholder="Suchen…" [(ngModel)]="query">
      </div>
      <button class="primary" (click)="openNew()">
        <span>＋</span>
        Neuer Eintrag
      </button>
    </header>

    <section class="generator">
      <div class="info">
        <h2>Passwort-Generator</h2>
        <p>Erzeuge starke Passwörter und kopiere sie direkt in deine Einträge.</p>
      </div>
      <div class="controls">
        <label>
          Länge <span>{{ genLen }} Zeichen</span>
          <input type="range" min="8" max="64" [(ngModel)]="genLen">
        </label>
        <div class="row">
          <button type="button" (click)="generated = generate(genLen)">Erzeugen</button>
          <input class="generated" [value]="generated" placeholder="Noch nichts erstellt…" readonly>
          <button type="button" class="outline" (click)="copy(generated)" [disabled]="!generated">Kopieren</button>
        </div>
        <p class="copy-status" *ngIf="copyMessage" [class.error]="copyMessage.includes('fehlgeschlagen')">{{ copyMessage }}</p>
      </div>
    </section>

    <ng-container *ngIf="visibleEntries.length; else emptyState">
      <div class="grid">
        <article class="card" *ngFor="let entry of visibleEntries">
          <header>
            <div>
              <h3>{{ entry.title }}</h3>
              <p class="muted" *ngIf="entry.url">{{ entry.url }}</p>
            </div>
            <button class="icon-btn" (click)="toggleReveal(entry.id)" [attr.aria-label]="show[entry.id] ? 'Passwort verbergen' : 'Passwort anzeigen'">
              {{ show[entry.id] ? '🙈' : '👁️' }}
            </button>
          </header>

          <dl>
            <div>
              <dt>Benutzername</dt>
              <dd>{{ entry.username }}</dd>
            </div>
            <div>
              <dt>Passwort</dt>
              <dd class="password-line">
                <input [type]="show[entry.id] ? 'text' : 'password'" [value]="entry.password" readonly>
                <button class="link" type="button" (click)="copy(entry.password)">Kopieren</button>
              </dd>
            </div>
          </dl>

          <p *ngIf="entry.notes" class="notes">{{ entry.notes }}</p>

          <footer>
            <button type="button" class="outline" (click)="edit(entry)">Bearbeiten</button>
            <button type="button" class="danger" (click)="remove(entry)">Löschen</button>
          </footer>
        </article>
      </div>
    </ng-container>
    <ng-template #emptyState>
      <div class="empty">
        <h3>Kein Eintrag vorhanden</h3>
        <p>Lege deinen ersten Eintrag an oder importiere deine Passwörter.</p>
        <button class="primary" (click)="openNew()">Jetzt starten</button>
      </div>
    </ng-template>

    <dialog #entryDialog>
      <form method="dialog" (submit)="save()">
        <h2>{{ current?.id ? 'Eintrag bearbeiten' : 'Neuer Eintrag' }}</h2>
        <label>
          Titel
          <input [(ngModel)]="current!.title" name="title" required>
        </label>
        <label>
          Website / URL
          <input [(ngModel)]="current!.url" name="url">
        </label>
        <label>
          Benutzername
          <input [(ngModel)]="current!.username" name="username" required>
        </label>
        <label>
          Passwort
          <div class="row">
            <input [(ngModel)]="current!.password" name="password" required>
            <button type="button" (click)="current!.password = generate(16)">Neu</button>
          </div>
        </label>
        <label>
          Notizen
          <textarea [(ngModel)]="current!.notes" name="notes" rows="3"></textarea>
        </label>
        <menu>
          <button type="button" class="outline" (click)="closeDialog()">Abbrechen</button>
          <button type="submit" class="primary">Speichern</button>
        </menu>
      </form>
    </dialog>
  </section>
  `,
  styles: [`
    .vault{display:flex;flex-direction:column;gap:24px}
    .toolbar{display:flex;gap:16px;align-items:center;flex-wrap:wrap}
    .search{flex:1;display:flex;align-items:center;gap:8px;padding:10px 14px;border:1px solid #d1d5db;border-radius:999px;background:#fff}
    .search input{flex:1;border:none;outline:none;font-size:15px}
    .icon{font-size:18px}
    .primary{background:#111827;color:#fff;border:none;border-radius:999px;padding:10px 18px;display:flex;align-items:center;gap:8px;font-weight:600;cursor:pointer}
    .primary span{font-size:18px;line-height:1}
    .outline{background:transparent;border:1px solid #d1d5db;color:#111827;border-radius:999px;padding:8px 16px;cursor:pointer}
    button:disabled{opacity:.4;cursor:not-allowed}

    .generator{display:flex;flex-wrap:wrap;gap:24px;padding:24px;border:1px solid #e5e7eb;border-radius:20px;background:#f9fafb}
    .generator .info{flex:1 1 220px}
    .generator .info h2{margin:0 0 6px;font-size:20px}
    .generator .info p{margin:0;color:#6b7280}
    .generator .controls{flex:1 1 320px;display:flex;flex-direction:column;gap:12px}
    .generator label{display:flex;justify-content:space-between;align-items:center;font-weight:600}
    .generator label span{color:#6b7280;font-weight:500}
    .generator input[type="range"]{width:100%}
    .generator .row{display:flex;gap:12px;flex-wrap:wrap}
    .generator .generated{flex:1;min-width:200px;padding:10px 12px;border:1px solid #d1d5db;border-radius:999px;background:#fff;font-family:monospace}
    .copy-status{margin:0;color:#16a34a;font-size:13px;font-weight:500}
    .copy-status.error{color:#dc2626}

    .grid{display:grid;gap:18px;grid-template-columns:repeat(auto-fill,minmax(280px,1fr))}
    .card{border:1px solid #e5e7eb;border-radius:20px;padding:18px 20px;background:#fff;box-shadow:0 8px 20px rgba(15,23,42,0.06);display:flex;flex-direction:column;gap:12px}
    .card header{display:flex;justify-content:space-between;align-items:flex-start;gap:12px}
    .card h3{margin:0;font-size:18px}
    .muted{color:#6b7280;font-size:13px;margin-top:4px;word-break:break-word}
    dl{margin:0;display:grid;gap:12px}
    dt{font-size:12px;text-transform:uppercase;color:#9ca3af;letter-spacing:.05em}
    dd{margin:4px 0 0;font-size:15px}
    .password-line{display:flex;align-items:center;gap:8px}
    .password-line input{flex:1;border:1px solid #d1d5db;border-radius:8px;padding:8px 10px;font-family:monospace;background:#f3f4f6}
    .icon-btn{border:none;background:#eef2ff;border-radius:10px;padding:6px 10px;cursor:pointer}
    .link{background:transparent;border:none;color:#2563eb;font-weight:500;cursor:pointer}
    .notes{padding:12px;border-radius:12px;background:#f3f4f6;color:#374151;white-space:pre-wrap}
    footer{display:flex;gap:12px;margin-top:auto}
    .danger{background:#dc2626;color:#fff;border:none;border-radius:999px;padding:8px 16px;cursor:pointer}

    .empty{padding:48px;border:1px dashed #d1d5db;border-radius:24px;text-align:center;background:#f9fafb}
    .empty h3{margin:0 0 8px;font-size:20px}
    .empty p{margin:0 0 16px;color:#6b7280}

    dialog{border:none;border-radius:20px;padding:0;box-shadow:0 18px 45px rgba(15,23,42,0.18)}
    dialog::backdrop{background:rgba(17,24,39,0.35)}
    dialog form{padding:24px 28px 20px;display:flex;flex-direction:column;gap:16px;min-width:360px}
    dialog label{display:flex;flex-direction:column;gap:6px;font-weight:600;color:#111827}
    dialog input, dialog textarea{width:100%;padding:10px 12px;border:1px solid #d1d5db;border-radius:12px;font-size:15px}
    dialog textarea{resize:vertical}
    menu{display:flex;justify-content:flex-end;gap:12px;margin:0;padding-top:8px}
    menu button{font-weight:600}
    .row button{border-radius:12px;background:#111827;color:#fff;padding:8px 12px;border:none}
  `]
})
export class VaultComponent {
  private auth = inject(AuthService);
  private crypto = inject(CryptoService);
  @ViewChild('entryDialog') private entryDialog?: ElementRef<HTMLDialogElement>;

  private STORAGE_KEY = 'pm_vault_blob';
  entries: VaultEntry[] = [];
  show: Record<string, boolean> = {};
  current: VaultEntry | null = null;
  query = '';
  generated = '';
  genLen = 16;
  copyMessage = '';
  private copyTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(){ this.load(); }

  async load(){
    const key = await this.auth.getSessionKey();
    if (!key) return;
    const blob = localStorage.getItem(this.STORAGE_KEY);
    if (!blob) { this.entries = []; return; }
    try {
      this.entries = await this.crypto.decryptJson<VaultEntry[]>(key, blob);
    } catch {
      // Key passt nicht -> als Schutz nichts laden
      this.entries = [];
    }
  }

  async persist(){
    const key = await this.auth.getSessionKey(); if (!key) return;
    const blob = await this.crypto.encryptJson(key, this.entries);
    localStorage.setItem(this.STORAGE_KEY, blob);
  }

  get visibleEntries(): VaultEntry[] {
    const q = this.query.toLowerCase().trim();
    return !q ? this.entries : this.entries.filter(entry =>
      [entry.title, entry.url ?? '', entry.username, entry.notes ?? '']
        .some(value => value.toLowerCase().includes(q))
    );
  }

  openNew(){
    this.current = { id: '', title:'', url:'', username:'', password:this.generate(16), notes:'' };
    this.openDialog();
  }
  edit(entry: VaultEntry){
    this.current = { ...entry };
    this.openDialog();
  }
  private openDialog(){
    this.entryDialog?.nativeElement.showModal();
  }
  closeDialog(){
    this.entryDialog?.nativeElement.close();
    this.current = null;
  }

  async save(){
    if (!this.current) return;
    if (!this.current.id) this.current.id = uuid();
    const idx = this.entries.findIndex(x => x.id === this.current!.id);
    if (idx >= 0) this.entries[idx] = this.current!;
    else this.entries.unshift(this.current!);
    this.current = null;
    this.closeDialog();
    await this.persist();
  }
  async remove(entry: VaultEntry){
    this.entries = this.entries.filter(x => x.id !== entry.id);
    await this.persist();
  }

  toggleReveal(id: string){
    this.show[id] = !this.show[id];
  }

  generate(len=16){
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()-_=+[]{};:,.?';
    let out=''; const arr = new Uint32Array(len);
    const cryptoObj = globalThis.crypto;
    if (cryptoObj?.getRandomValues) {
      cryptoObj.getRandomValues(arr);
    } else {
      for (let i = 0; i < len; i++) arr[i] = Math.floor(Math.random() * chars.length);
    }
    for (let i=0;i<len;i++) out += chars[arr[i] % chars.length];
    return out;
  }
  async copy(text:string){
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      this.setCopyMessage('Kopiert!');
    } catch {
      this.setCopyMessage('Kopieren fehlgeschlagen.');
    }
  }

  private setCopyMessage(message: string){
    this.copyMessage = message;
    if (this.copyTimer) clearTimeout(this.copyTimer);
    this.copyTimer = setTimeout(() => this.copyMessage = '', 2500);
  }
}
