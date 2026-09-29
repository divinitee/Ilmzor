// Small, dependency-free helpers shared by every layer.

export function uid(prefix = 'id') {
  return prefix + '_' + Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-3);
}

export function esc(s) {
  if (s === null || s === undefined) return '';
  return String(s).replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
}

export function clamp(v, a, b) {
  return Math.max(a, Math.min(b, v));
}

export function debounce(fn, ms) {
  let t = null;
  const d = (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
  d.flush = (...args) => {
    clearTimeout(t);
    fn(...args);
  };
  return d;
}

export function round1(n) {
  return Math.round((Number(n) || 0) * 10) / 10;
}

export function fmtHours(n) {
  const v = round1(n);
  return (Number.isInteger(v) ? v : v.toFixed(1)) + 'h';
}

export function fmtMoney(n, currency = '') {
  const v = Math.round(Number(n) || 0);
  return (currency ? currency + ' ' : '') + v.toLocaleString('en-US');
}

// ---------- dates (local, ISO yyyy-mm-dd) ----------

export function isoDate(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function today() {
  return isoDate(new Date());
}

export function parseDate(s) {
  if (!s) return null;
  const [y, m, d] = String(s).slice(0, 10).split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

export function addDays(s, n) {
  const d = parseDate(s) || new Date();
  d.setDate(d.getDate() + n);
  return isoDate(d);
}

export function daysBetween(a, b) {
  const da = parseDate(a), db = parseDate(b);
  if (!da || !db) return 0;
  return Math.round((db - da) / 86400000);
}

// Monday of the week containing date s.
export function weekStart(s = today()) {
  const d = parseDate(s);
  const dow = (d.getDay() + 6) % 7; // Mon=0
  d.setDate(d.getDate() - dow);
  return isoDate(d);
}

export function weekEnd(s = today()) {
  return addDays(weekStart(s), 6);
}

// 1=Mon ... 7=Sun
export function isoDow(s = today()) {
  const d = parseDate(s);
  return ((d.getDay() + 6) % 7) + 1;
}

export function weekNumber(s = today()) {
  const d = parseDate(s);
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  return Math.ceil(((t - yearStart) / 86400000 + 1) / 7);
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
export const DOW_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export function fmtDate(s, { weekday = false } = {}) {
  const d = parseDate(s);
  if (!d) return '';
  const base = `${d.getDate()} ${MONTHS[d.getMonth()]}`;
  return weekday ? `${DAYS[d.getDay()]}, ${base}` : base;
}

export function fmtLongDate(s) {
  const d = parseDate(s);
  if (!d) return '';
  return `${DAYS[d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

// Human relative label: "today", "tomorrow", "in 3d", "2d overdue".
export function relDay(s, ref = today()) {
  if (!s) return '';
  const n = daysBetween(ref, s);
  if (n === 0) return 'today';
  if (n === 1) return 'tomorrow';
  if (n === -1) return 'yesterday';
  if (n < 0) return `${-n}d ago`;
  if (n < 14) return `in ${n}d`;
  return fmtDate(s);
}

// ---------- text ----------

export function truncate(s, n) {
  s = String(s || '');
  return s.length > n ? s.slice(0, n - 1).trimEnd() + '…' : s;
}

// Split a label into at most `maxLines` lines of roughly `width` chars.
export function wrap(text, width, maxLines = 2) {
  const words = String(text || '').split(/\s+/).filter(Boolean);
  const lines = [];
  let line = '';
  for (const w of words) {
    if (!line) line = w;
    else if ((line + ' ' + w).length <= width) line += ' ' + w;
    else {
      lines.push(line);
      line = w;
    }
  }
  if (line) lines.push(line);
  if (lines.length > maxLines) {
    const kept = lines.slice(0, maxLines);
    kept[maxLines - 1] = truncate(kept[maxLines - 1] + ' ' + lines.slice(maxLines).join(' '), width);
    return kept;
  }
  return lines.map((l) => truncate(l, width + 2));
}

export function plural(n, word, pluralWord) {
  return `${n} ${n === 1 ? word : pluralWord || word + 's'}`;
}

export function download(filename, text, type = 'application/json') {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function pickFile(accept = '.json,application/json') {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept;
    input.onchange = async () => {
      const f = input.files && input.files[0];
      resolve(f ? await f.text() : null);
    };
    input.click();
  });
}

export function isTypingTarget(el) {
  if (!el) return false;
  const tag = el.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable;
}
