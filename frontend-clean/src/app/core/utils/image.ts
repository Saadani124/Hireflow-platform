import { environment } from '../../../environments/environment';

export function normalizeImage(url: string): string {
  if (!url) return '';

  const base = environment.apiUrl;
  const path = url.replace(base, '');
  return base + path;
}