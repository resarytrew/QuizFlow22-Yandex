import { createHash, randomUUID } from 'crypto';

export function sha256(data: string): string {
  return createHash('sha256').update(data).digest('hex');
}

export function generateId(): string {
  return randomUUID();
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9а-яё]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 100);
}
