# Admin Console tests (VT-35)

```bash
# handler + core: every refusal case, TOTP RFC vector, overview maths, RLS schema check
deno test --allow-read tools/admin-console-tests/adminApi.test.ts

# the real functions/adminApi/entry.ts, with npm:@base44/sdk and base44:runtime mocked
deno test --allow-read --import-map=tools/admin-console-tests/import_map.json tools/admin-console-tests/entry_wiring.test.ts
```

The schema test only proves the .jsonc says `never`. The live proof (a signed-in admin browser session reading AdminSecurity gets nothing) is done once on the live site, see VT-35 evidence.
