import { CanActivateFn } from '@angular/router';
import { inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';

export const authGuard: CanActivateFn = () => {

  const platformId = inject(PLATFORM_ID);
  const router = inject(Router);

  // 🔴 ONLY run in browser
  if (isPlatformBrowser(platformId)) {

    const token = localStorage.getItem('token');

    if (!token) {
      router.navigate(['/login']);
      return false;
    }

    return true;
  }

  // SSR fallback → allow (no crash)
  return true;
};