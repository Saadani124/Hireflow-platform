import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';

export const roleGuard: CanActivateFn = (route) => {

  const router = inject(Router);

  const user = JSON.parse(localStorage.getItem('user') || 'null');

  if (!user) {
    return router.parseUrl('/login');
  }

  const expectedRole = route.data?.['role'];

  if (expectedRole && user.role !== expectedRole) {
    return router.parseUrl('/home');
  }

  return true;
};