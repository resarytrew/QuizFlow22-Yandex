import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('integrated visual design mode routing', () => {
  it('does not add a standalone design route', () => {
    const routeNames = readdirSync(join(process.cwd(), 'src/router/routes'));

    expect(routeNames.some((name) => /designStudio|design-mode|designRoute/i.test(name))).toBe(false);
    expect(routeNames).toContain('editorShell.tsx');
  });
});
