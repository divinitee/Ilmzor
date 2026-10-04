import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { secrets } from 'base44:runtime';
import { createAdminApiHandler } from '../../shared/adminApiHandler.ts';

// adminApi: the Admin Console's only door (VT-35, 2026-10-04).
//
// Every privileged console operation goes through here: role admin + user id
// on ADMIN_CONSOLE_USER_IDS + a console token issued after a TOTP code.
// The logic lives in base44/shared/adminApiHandler.ts so the refusal tests in
// tools/admin-console-tests can drive it with mocks.
//
// Secrets (fail closed if either is missing):
//   ADMIN_SESSION_KEY       ≥ 32 random characters. Signs console tokens and
//                           encrypts the TOTP seed at rest. Rotating it signs
//                           everyone out AND forces re-enrolment.
//   ADMIN_CONSOLE_USER_IDS  comma-separated User ids allowed into the console.

Deno.serve(createAdminApiHandler({
  createClientFromRequest,
  getSecret: (name) => secrets.get(name),
}));
