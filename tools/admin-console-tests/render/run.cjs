const { JSDOM } = require('jsdom');
const fs = require('fs');
const bundle = fs.readFileSync('tools/admin-console-tests/render/bundle.js', 'utf8');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let failures = 0;
const check = (cond, msg) => { console.log((cond ? 'PASS ' : 'FAIL ') + msg); if (!cond) failures++; };

function boot(setup, hash = '') {
  const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', { url: 'https://virora.space/console' + hash, runScripts: 'outside-only', pretendToBeVisual: true });
  const w = dom.window;
  w.matchMedia = w.matchMedia || (() => ({ matches: false, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} }));
  w.eval(bundle);
  setup(w.__scenario);
  w.__mount(w.document.getElementById('root'));
  return w;
}
const text = (w) => w.document.body.textContent;
function type(w, input, value) {
  const setter = Object.getOwnPropertyDescriptor(w.HTMLInputElement.prototype, 'value').set;
  setter.call(input, value);
  input.dispatchEvent(new w.Event('input', { bubbles: true }));
}
const button = (w, label) => [...w.document.querySelectorAll('button')].find((b) => b.textContent.trim().includes(label));
const click = (w, el) => el.dispatchEvent(new w.MouseEvent('click', { bubbles: true }));

const overview = { as_of: '2026-10-04T08:00:00Z', month: '2026-10', counters: { signups_7d: 9, trials_ending_48h: 3, pending_qr_payments: 1, pending_teacher_applications: 0, paying_students: 12, lapsed_not_refreshed: 2, revenue_month_qr_uzs: 35999, revenue_month_card_usd: null },
  needs_you: [{ kind: 'qr_payment', id: 'p1', title: 'Aziza paid for learner (monthly)', sub: "35,999 so'm · code VR-123456", since: '2026-10-04T07:00:00Z', link: '/admin-qr-payments' }] };

(async () => {
  // 1. student
  let w = boot((s) => { s.user = { id: 'u1', role: 'user', email: 's@x' }; });
  await sleep(300);
  check(text(w).includes('Admins only'), 'student sees "Admins only", no gate');
  check(w.__calls.length === 0, 'student: no adminApi call made');

  // 2. not configured
  w = boot((s) => { s.user = { id: 'u_tee', role: 'admin', email: 'tee@x' }; s.handlers.status = () => ({ __error: 1, status: 503, code: 'not_configured' }); });
  await sleep(300);
  check(text(w).includes("isn't configured on the server"), 'not_configured shown');

  // 3. full enrolment flow
  w = boot((s) => {
    s.user = { id: 'u_tee', role: 'admin', email: 'tee@x' };
    s.handlers.status = () => ({ enrolled: false, locked_until: null, email: 'tee@x' });
    s.handlers.enrollStart = () => ({ otpauth_uri: 'otpauth://totp/VIRORA%20Console:tee%40x?secret=JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP&issuer=VIRORA%20Console', secret: 'JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP', account: 'tee@x', confirm_within_minutes: 15 });
    s.handlers.enrollConfirm = (b) => (b.code === '123456' ? { token: 'tok.sig', expires_at: 'x', backup_codes: ['AAAA-BBBB', 'CCCC-DDDD', 'EEEE-FFFF', 'GGGG-HHHH', 'JJJJ-KKKK', 'MMMM-NNNN', 'PPPP-QQQQ', 'RRRR-SSSS'] } : { __error: 1, status: 422, code: 'wrong_code', extra: { attempts_left: 4 } });
    s.handlers.overview = (b) => (b.token === 'tok.sig' ? overview : { __error: 1, status: 403, code: 'token_missing' });
  });
  await sleep(300);
  check(text(w).includes('Set up two-factor sign-in'), 'not enrolled → setup screen');
  click(w, button(w, 'Start setup')); await sleep(300);
  const rects = w.document.querySelectorAll('svg rect').length;
  check(rects > 100, `QR rendered (${rects} modules)`);
  check(!text(w).includes('JBSW Y3DP'), 'setup key hidden until asked');
  click(w, button(w, "Can't scan")); await sleep(20);
  check(text(w).includes('JBSW Y3DP'), 'setup key shown on request');
  type(w, w.document.querySelector('input'), '000000'); await sleep(300);
  check(text(w).includes("That code didn't work") && text(w).includes('4 tries left'), 'wrong code → error with tries left');
  type(w, w.document.querySelector('input'), '123456'); await sleep(300);
  check(text(w).includes('Save your backup codes') && text(w).includes('AAAA-BBBB'), 'backup codes shown once');
  check(!text(w).includes('JBSW'), 'secret gone after confirm');
  check(w.sessionStorage.getItem('virora_console_token') === null, 'token not stored until codes acknowledged');
  check(button(w, 'Open the console').disabled, 'continue disabled until "saved" ticked');
  const cb = w.document.querySelector('input[type=checkbox]'); click(w, cb); await sleep(20);
  click(w, button(w, 'Open the console')); await sleep(500);
  check(w.sessionStorage.getItem('virora_console_token') === 'tok.sig', 'token in sessionStorage');
  check(text(w).includes('Paying students') && text(w).includes('12') && text(w).includes("35,999 so'm"), 'overview counters render');
  check(text(w).includes('Aziza paid for learner'), 'needs-you list renders');
  check(text(w).includes("aren't recorded one by one yet"), 'card revenue honest, not 0');
  check(!JSON.stringify(w.__calls.filter((c) => c.body.action === 'enrollConfirm')).includes('JBSW'), 'secret never sent back to server');
  check(!w.localStorage.length, 'nothing in localStorage');

  // 4. enrolled → sign-in screen, lock message
  w = boot((s) => {
    s.user = { id: 'u_tee', role: 'admin', email: 'tee@x' };
    s.handlers.status = () => ({ enrolled: true, locked_until: null, email: 'tee@x' });
    s.handlers.verify = () => ({ __error: 1, status: 429, code: 'locked', extra: { locked_until: '2026-10-04T08:15:00Z' } });
  });
  await sleep(300);
  check(text(w).includes('Enter the code from your authenticator app'), 'enrolled → code screen');
  type(w, w.document.querySelector('input'), '111111'); await sleep(300);
  check(text(w).includes('locked for 15 minutes'), 'locked message shown');
  check(w.__calls.filter((c) => c.body.action === 'verify').length === 1, 'a code attempt is sent exactly once (no retry)');
  click(w, button(w, 'Use a backup code')); await sleep(20);
  check(w.document.querySelector('input').placeholder === 'XXXX-XXXX', 'backup code mode');

  // 5. existing token + Security tab; revoked token mid-session → back to gate
  w = boot((s) => {
    s.user = { id: 'u_tee', role: 'admin', email: 'tee@x' };
    s.handlers.ping = () => ({ valid: true });
    s.handlers.status = () => ({ enrolled: true, email: 'tee@x' });
    s.handlers.security = () => ({ enrolled_at: '2026-10-04T08:00:00Z', last_login_at: '2026-10-04T08:00:00Z', backup_codes_left: 2,
      admins: [{ id: 'u_tee', email: 'tee@x', name: 'Tee', console_access: true, is_you: true }, { id: 'u_i', email: 'ilmzor.uz@gmail.com', name: 'ILMZOR', console_access: false }] });
    s.handlers.auditList = () => ({ rows: [{ id: 'a1', ts: '2026-10-04T08:00:00Z', actor_email: 'ilmzor.uz@gmail.com', action: 'status', outcome: 'refused', reason: 'not_allowlisted', details: '' }], has_more: false });
    s.handlers.signOutAll = () => ({ signed_out: true });
  }, '#security');
  w.sessionStorage.setItem('virora_console_token', 'tok.sig');
  await sleep(800);
  check(text(w).includes('Two-factor sign-in is on') && text(w).includes('2 backup codes left. Make new ones.'), 'security panel + low backup warning');
  check(text(w).includes('No console access') && text(w).includes('still have the admin role'), 'admin list flags ilmzor');
  check(text(w).includes('not_allowlisted'), 'audit log row renders');
  click(w, button(w, 'Sign out everywhere')); await sleep(20);
  click(w, [...w.document.querySelectorAll('button')].filter((b) => b.textContent.includes('Sign out everywhere')).pop()); await sleep(800);
  check(w.sessionStorage.getItem('virora_console_token') === null, 'sign out everywhere clears token');
  check(text(w).includes('signed out of the console everywhere'), 'back at gate with notice');

  console.log(failures ? `\n${failures} FAILED` : '\nALL RENDER CHECKS PASSED');
  process.exit(failures ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
