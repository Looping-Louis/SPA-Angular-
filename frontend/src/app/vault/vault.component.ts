import { CommonModule } from '@angular/common';
import { Component, ElementRef, OnInit, ViewChild, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { VaultItem, VaultPayload, VaultService } from '../core/vault.service';

type VaultDraft = Partial<VaultItem> & { id?: number };

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

    <p class="error-banner" *ngIf="listError">{{ listError }}</p>

    <ng-container *ngIf="!loadingList; else loadingState">
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
              <button type="button" class="danger" (click)="remove(entry)" [disabled]="deletingId === entry.id">
                {{ deletingId === entry.id ? '...' : 'Löschen' }}
              </button>
            </footer>
          </article>
        </div>
      </ng-container>
    </ng-container>

    <ng-template #emptyState>
      <div class="empty">
        <h3>Kein Eintrag vorhanden</h3>
        <p>Lege deinen ersten Eintrag an oder importiere deine Passwörter.</p>
        <button class="primary" (click)="openNew()">Jetzt starten</button>
      </div>
    </ng-template>

    <ng-template #loadingState>
      <div class="empty">
        <h3>Lade Tresor…</h3>
      </div>
    </ng-template>

    <dialog #entryDialog>
      <ng-container *ngIf="current as model">
        <form method="dialog" (submit)="save(); $event.preventDefault();" novalidate>
          <h2>{{ model.id ? 'Eintrag bearbeiten' : 'Neuer Eintrag' }}</h2>
          <label>
            Titel
            <input [(ngModel)]="model.title" name="title" required>
          </label>
          <label>
            Website / URL
            <input [(ngModel)]="model.url" name="url">
          </label>
          <label>
            Benutzername
            <input [(ngModel)]="model.username" name="username" required>
          </label>
          <label>
            Passwort
            <div class="row">
              <input [(ngModel)]="model.password" name="password" required>
              <button type="button" (click)="model.password = generate(16)">Neu</button>
            </div>
          </label>
          <label>
            Notizen
            <textarea [(ngModel)]="model.notes" name="notes" rows="3"></textarea>
          </label>
          <p class="error-banner small" *ngIf="formError">{{ formError }}</p>
          <menu>
            <button type="button" class="outline" (click)="closeDialog()">Abbrechen</button>
            <button type="submit" class="primary" [disabled]="saving">{{ saving ? 'Speichert…' : 'Speichern' }}</button>
          </menu>
        </form>
      </ng-container>
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

    .error-banner{padding:12px 16px;border-radius:12px;background:#fee2e2;color:#b91c1c}
    .error-banner.small{margin:0;background:#fef2f2}

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
export class VaultComponent implements OnInit {
  private vault = inject(VaultService);
  @ViewChild('entryDialog') private entryDialog?: ElementRef<HTMLDialogElement>;

  entries: VaultItem[] = [];
  current: VaultDraft | null = null;
  query = '';
  show: Record<number, boolean> = {};
  listError = '';
  formError = '';
  loadingList = false;
  saving = false;
  deletingId: number | null = null;

  async ngOnInit(): Promise<void> {
    await this.loadEntries();
  }

  get visibleEntries(): VaultItem[] {
    const q = this.query.toLowerCase().trim();
    return !q ? this.entries : this.entries.filter(entry =>
      [entry.title, entry.url ?? '', entry.username, entry.notes ?? '']
        .some(value => value.toLowerCase().includes(q))
    );
  }

  async loadEntries(): Promise<void> {
    this.loadingList = true;
    this.listError = '';
    try {
      this.entries = await this.vault.list();
    } catch {
      this.listError = 'Einträge konnten nicht geladen werden.';
      this.entries = [];
    } finally {
      this.loadingList = false;
    }
  }

  openNew(): void {
    this.current = { title: '', url: '', username: '', password: this.generate(16), notes: '' };
    this.formError = '';
    this.openDialog();
  }

  edit(entry: VaultItem): void {
    this.current = { ...entry };
    this.formError = '';
    this.openDialog();
  }

  private openDialog(): void {
    this.entryDialog?.nativeElement.showModal();
  }

  closeDialog(): void {
    this.entryDialog?.nativeElement.close();
    this.current = null;
    this.formError = '';
  }

  async save(): Promise<void> {
    if (!this.current) return;
    const payload: VaultPayload = {
      title: (this.current.title ?? '').trim(),
      username: (this.current.username ?? '').trim(),
      password: this.current.password ?? '',
      url: this.normalizeOptional(this.current.url),
      notes: this.normalizeOptional(this.current.notes)
    };

    if (!payload.title || !payload.username || !payload.password) {
      this.formError = 'Titel, Benutzername und Passwort sind erforderlich.';
      return;
    }

    this.saving = true;
    try {
      if (this.current.id != null) {
        const updated = await this.vault.update(this.current.id, payload);
        this.entries = this.entries.map(entry => entry.id === updated.id ? updated : entry);
      } else {
        const created = await this.vault.create(payload);
        this.entries = [created, ...this.entries];
      }
      this.closeDialog();
    } catch {
      this.formError = 'Speichern fehlgeschlagen.';
    } finally {
      this.saving = false;
    }
  }

  async remove(entry: VaultItem): Promise<void> {
    if (this.deletingId === entry.id) return;
    this.deletingId = entry.id;
    this.listError = '';
    try {
      await this.vault.delete(entry.id);
      this.entries = this.entries.filter(item => item.id !== entry.id);
    } catch {
      this.listError = 'Eintrag konnte nicht gelöscht werden.';
    } finally {
      this.deletingId = null;
    }
  }

  toggleReveal(id: number): void {
    this.show[id] = !this.show[id];
  }

  generate(len = 16): string {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()-_=+[]{};:,.?';
    let out = '';
    const arr = new Uint32Array(len);
    const cryptoObj = globalThis.crypto;
    if (cryptoObj?.getRandomValues) {
      cryptoObj.getRandomValues(arr);
      for (let i = 0; i < len; i++) out += chars[arr[i] % chars.length];
    } else {
      for (let i = 0; i < len; i++) out += chars[Math.floor(Math.random() * chars.length)];
    }
    return out;
  }

  async copy(text: string): Promise<void> {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Clipboard API might be unavailable; ignore silently.
    }
  }

  private normalizeOptional(value: string | undefined): string | undefined {
    const trimmed = (value ?? '').trim();
    return trimmed ? trimmed : undefined;
  }
}
