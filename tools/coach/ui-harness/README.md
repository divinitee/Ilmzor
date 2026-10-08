# Coach UI click-through harness (VT-40 Stage 3)
Renders the REAL `src/pages/Coach.jsx` (and PracticeRunner, CoachWordCheck, CoachTodayCard)
with the server mocked by `serverApi.mock.js` (same response shapes as coachEngine.getToday;
submissions take 600 ms so a non-awaited submit is caught by ordering).
Needs a machine with Chromium + Playwright (the Base44 sandbox has none):
  npx vite --config tools/coach/ui-harness/vite.config.js      # serves on :5199
  node tools/coach/ui-harness/click-through.mjs <screenshot-dir> # 15 checks
Checks: onboarding, plan, word + grammar + word session, 3 submissions tagged with the
session_key, no getToday while a submission is in flight, server-driven Keep going,
continuation with grammar LAST (race), startContinuation once, map, uz/ru, no console errors.
