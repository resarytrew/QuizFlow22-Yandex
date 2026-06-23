import {
  assertEquals,
  assertFalse,
} from 'https://deno.land/std@0.177.0/testing/asserts.ts';
import {
  getClientIp,
  getJwtAuthenticatorLevel,
  isClientIpAllowed,
  mergePermissions,
} from './admin.ts';

function makeJwt(payload: Record<string, unknown>): string {
  const encode = (value: Record<string, unknown>) =>
    btoa(JSON.stringify(value))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  return `${encode({ alg: 'none' })}.${encode(payload)}.signature`;
}

Deno.test('getJwtAuthenticatorLevel reads aal2 from a bearer token', () => {
  const token = makeJwt({ aal: 'aal2', sub: 'user-1' });
  assertEquals(getJwtAuthenticatorLevel(`Bearer ${token}`), 'aal2');
});

Deno.test('getJwtAuthenticatorLevel rejects malformed and unsupported claims', () => {
  assertEquals(getJwtAuthenticatorLevel('Bearer broken'), null);
  const token = makeJwt({ aal: 'aal3' });
  assertEquals(getJwtAuthenticatorLevel(`Bearer ${token}`), null);
});

Deno.test('isClientIpAllowed allows unrestricted staff', () => {
  assertEquals(isClientIpAllowed(null, []), true);
  assertEquals(isClientIpAllowed('203.0.113.10', null), true);
});

Deno.test('isClientIpAllowed normalizes IPv4-mapped and host-mask addresses', () => {
  assertEquals(
    isClientIpAllowed('::ffff:203.0.113.10', ['203.0.113.10/32']),
    true,
  );
  assertFalse(isClientIpAllowed('203.0.113.11', ['203.0.113.10']));
  assertFalse(isClientIpAllowed(null, ['203.0.113.10']));
});

Deno.test('getClientIp prefers the first forwarded address', () => {
  const req = new Request('https://example.test', {
    headers: {
      'x-forwarded-for': '203.0.113.4, 10.0.0.2',
      'x-real-ip': '198.51.100.8',
    },
  });
  assertEquals(getClientIp(req), '203.0.113.4');
});

Deno.test('mergePermissions applies explicit grants and denials', () => {
  assertEquals(
    mergePermissions(
      ['admin.access', 'users.read'],
      [
        { permission: 'users.read', granted: false },
        { permission: 'audit.read', granted: true },
      ],
    ),
    ['admin.access', 'audit.read'],
  );
});
