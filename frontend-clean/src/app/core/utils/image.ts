// image.ts
export function normalizeImage(url: string): string {
  if (!url) return '';

  const base = 'http://localhost:8000';
  const path = url.replace(base, '');
  return base + path;
}