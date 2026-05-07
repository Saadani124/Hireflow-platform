import { CanActivateFn } from '@angular/router';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth';

export const verificationGuard: CanActivateFn = () => {
  const router = inject(Router);
  const auth = inject(AuthService);
  const user = auth.getUser();

  if (!user) {
    router.navigate(['/login']);
    return false;
  }

  if (user.role === 'admin' || user.is_verified == 1 || user.is_verified === true) {
    return true;
  }

  router.navigate(['/pending-verification']);
  return false;
};
