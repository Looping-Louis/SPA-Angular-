import { Routes } from '@angular/router';
import { LoginComponent } from './auth/login.component';
import { RegisterComponent } from './auth/register.component';
import { VaultComponent } from './vault/vault.component';
import { TotpSetupComponent } from './security/totp-setup.component';
import { AuthGuard } from './core/auth.guard';
import { ImpressumComponent } from './legal/impressum.component';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'impressum', component: ImpressumComponent },
  { path: 'totp-setup', component: TotpSetupComponent, canActivate: [AuthGuard] },
  { path: 'vault', component: VaultComponent, canActivate: [AuthGuard] },
  { path: '', pathMatch: 'full', redirectTo: 'vault' },
  { path: '**', redirectTo: 'vault' }
];
