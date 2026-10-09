# Coach UI click-through harness (VT-40 Stage 3)
Renders the REAL `src/pages/Coach.jsx`, `PracticeRunner`, `CoachWordCheck` and `CoachTodayCard`
with the server MOCKED by `serverApi.mock.js` (same response shapes as coachEngine.getToday;
submissions take 600 ms so a non-awaited submit is caught by ordering). This is NOT a
real-backend test. Needs Chromium + Playwright (the Base44 sandbox has none):
  npx vite --config tools/coach/ui-harness/vite.config.js            # serves on :5199
  node tools/coach/ui-harness/click-through.mjs <screenshot-dir>     # main flow, 15 checks
  node tools/coach/ui-harness/corrections.mjs <screenshot-dir>       # 2026-10-09 corrections, 25 checks
URL params read by the mock: scenario=normal|unavailable|partial, minutes=<n>, whoami=fail|slow.
Route /practice?mode=plain|coach renders PracticeRunner alone (regression check D).
