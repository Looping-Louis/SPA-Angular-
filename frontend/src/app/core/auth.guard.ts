import { Injectable, inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
class GuardImpl {
  constructor(private auth: AuthService, private router: Router) {}
  can(): boolean {
    if (this.auth.isLoggedIn()) return true;
    this.router.navigateByUrl('/login'); return false;
  }
}
export const AuthGuard: CanActivateFn = () => inject(GuardImpl).can();
