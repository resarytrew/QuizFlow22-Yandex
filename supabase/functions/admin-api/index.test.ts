import {
  assertEquals,
} from 'https://deno.land/std@0.224.0/assert/mod.ts';
import {
  dashboardDayRange,
  formatQuizDisplayCode,
  isSixDigitAccountCode,
  parseAdminListParams,
} from './index.ts';

Deno.test('dashboardDayRange returns stable UTC calendar boundaries', () => {
  assertEquals(
    dashboardDayRange(2, new Date('2026-06-10T21:45:00.000Z')),
    {
      date: '2026-06-08',
      start: '2026-06-08T00:00:00.000Z',
      end: '2026-06-09T00:00:00.000Z',
    },
  );
});

Deno.test('parseAdminListParams normalizes pagination and query', () => {
  const params = parseAdminListParams(
    new URL('https://example.test/admin-api?action=users&page=2&limit=500&q= 123456 '),
  );

  assertEquals(params, {
    page: 2,
    limit: 50,
    offset: 50,
    query: '123456',
  });
});

Deno.test('parseAdminListParams falls back for invalid pagination', () => {
  const params = parseAdminListParams(
    new URL('https://example.test/admin-api?action=users&page=-9&limit=nope'),
  );

  assertEquals(params.page, 1);
  assertEquals(params.limit, 20);
  assertEquals(params.offset, 0);
});

Deno.test('isSixDigitAccountCode accepts only six digits', () => {
  assertEquals(isSixDigitAccountCode('123456'), true);
  assertEquals(isSixDigitAccountCode('12345'), false);
  assertEquals(isSixDigitAccountCode('1234567'), false);
  assertEquals(isSixDigitAccountCode('abc456'), false);
});

Deno.test('formatQuizDisplayCode pads by visibility scope', () => {
  assertEquals(formatQuizDisplayCode('private', 7), '07');
  assertEquals(formatQuizDisplayCode('unlisted', 7), '007');
  assertEquals(formatQuizDisplayCode('public', 7), '0007');
  assertEquals(formatQuizDisplayCode('public', null), null);
});
