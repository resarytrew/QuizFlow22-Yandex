import { describe, expect, it } from 'vitest';
import { getUserInitial } from './HeaderUserMenu';

describe('getUserInitial', () => {
  it('uses an uppercase first email character', () => {
    expect(getUserInitial('quiz@example.com')).toBe('Q');
  });

  it('uses a fallback for a missing email', () => {
    expect(getUserInitial()).toBe('U');
  });
});
