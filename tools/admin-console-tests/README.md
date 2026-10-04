# Admin Console tests (VT-35)

```bash
# handler + core: every refusal case, TOTP RFC vector, overview maths, RLS schema check
deno test --allow-read tools/admin-console-tests/adminApi.test.ts

# the real functions/adminApi/entry.ts, with npm:@base44/sdk and base44:runtime mocked
deno test --allow-read --import-map=tools/admin-console-tests/import_map.json tools/admin-console-tests/entry_wiring.test.ts
```

The schema test only proves the .jsonc says `never`. The live proof (a signed-in admin browser session reading AdminSecurity gets nothing) is done once on the live site, see VT-35 evidence.

## UI render check (jsdom, mocked adminApi)

```bash
mkdir -p /tmp/rc && (cd /tmp/rc && npm i jsdom@24)   # jsdom is not an app dependency
node tools/admin-console-tests/render/build.mjs
NODE_PATH=/tmp/rc/node_modules node tools/admin-console-tests/render/run.cjs
```
Covers: student refused, not_configured, full enrolment (QR, setup key, wrong code, backup codes, token only after "saved"), overview, lock message, one attempt = one request, Security (low backup codes, admin list, audit log), sign out everywhere.
