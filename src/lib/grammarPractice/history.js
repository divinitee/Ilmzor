// Repeat-distance history, per browser.
//
// Deliberately localStorage and not an entity. This is not progress data — it
// only records which surface variants a student has already been shown, so the
// composer can serve fresh ones first. Losing it costs nothing but an earlier
// repeat. Mastery, scores and completion are a different matter entirely and
// must live server-side; the app has been bitten before by treating per-browser
// storage as account state, and this is not that.
const KEY = "vm_grammar_practice_seen_v1";
const MAX_PER_TOPIC = 600; // keep the store bounded; oldest entries fall off

const read = () => {
  try { return JSON.parse(localStorage.getItem(KEY) || "{}"); } catch { return {}; }
};

export function historyFor(topicKey) {
  return read()[topicKey] || {};
}

export function saveHistory(topicKey, history) {
  try {
    const all = read();
    const entries = Object.entries(history);
    all[topicKey] = entries.length <= MAX_PER_TOPIC
      ? history
      : Object.fromEntries(entries.sort((a, b) => b[1] - a[1]).slice(0, MAX_PER_TOPIC));
    localStorage.setItem(KEY, JSON.stringify(all));
  } catch { /* private mode, quota, blocked storage — a repeat sooner is the only cost */ }
}

export function clearHistory(topicKey) {
  try {
    const all = read();
    delete all[topicKey];
    localStorage.setItem(KEY, JSON.stringify(all));
  } catch { /* ignore */ }
}
