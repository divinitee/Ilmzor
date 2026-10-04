// Loads the REAL base44/functions/adminApi/entry.ts with the SDK and runtime
// swapped for mocks via import_map.json, and checks it is wired to the
// handler with the real secret names and fails closed without them.
//
//   deno test --allow-read --import-map=tools/admin-console-tests/import_map.json tools/admin-console-tests/entry_wiring.test.ts

import { assertEquals } from 'jsr:@std/assert@1';
import { store } from 'base44:runtime';

let handler: ((req: Request) => Promise<Response>) | null = null;
(Deno as any).serve = (h: any) => { handler = h; return { shutdown() {}, finished: Promise.resolve() }; };
await import('../../base44/functions/adminApi/entry.ts');

const post = (who: string | null, action: string) => handler!(new Request('http://x', {
  method: 'POST',
  headers: who ? { 'x-test-user': who } : {},
  body: JSON.stringify({ action }),
}));

Deno.test('entry.ts: fails closed with no secrets set', async () => {
  const r = await post('tee', 'status');
  assertEquals(r.status, 503);
  assertEquals((await r.json()).code, 'not_configured');
});

Deno.test('entry.ts: reads ADMIN_SESSION_KEY + ADMIN_CONSOLE_USER_IDS', async () => {
  store.ADMIN_SESSION_KEY = 'entry-test-key-0123456789-abcdefghijklmnop';
  store.ADMIN_CONSOLE_USER_IDS = 'u_tee';
  const ok = await post('tee', 'status');
  assertEquals(ok.status, 200);
  assertEquals((await ok.json()).enrolled, false);
  const no = await post('ilmzor', 'status');
  assertEquals((await no.json()).code, 'not_allowlisted');
  assertEquals((await post(null, 'status')).status, 401);
});
