// View state (what the user is looking at), kept apart from the life data itself.

const KEY = 'lifeos:ui:v1';

const DEFAULTS = {
  view: 'map',
  selected: null,
  mode: 'map',
  expanded: [],
  execCollapsed: [],
  inspectorOpen: true,
  goalsPath: {},
  projectArea: 'all',
  projectShowClosed: false,
  capTab: 'time',
  capOpen: [],
  review: null,
  legend: false,
  flowRes: 'rc_time',
};

export const ui = { ...DEFAULTS };

export function loadUI() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (raw && typeof raw === 'object') Object.assign(ui, DEFAULTS, raw);
  } catch {
    Object.assign(ui, DEFAULTS);
  }
  ui.linkFrom = null;
}

export function saveUI() {
  try {
    const { linkFrom: _l, ...rest } = ui;
    localStorage.setItem(KEY, JSON.stringify(rest));
  } catch {
    /* storage full or blocked: view state is optional */
  }
}

export function setUI(patch) {
  Object.assign(ui, patch);
  saveUI();
  bus.emit('ui', patch);
}

export function isExpanded(id) {
  return ui.expanded.includes(id);
}

export function setExpanded(id, on) {
  const s = new Set(ui.expanded);
  if (on) s.add(id); else s.delete(id);
  setUI({ expanded: [...s] });
}

// Minimal pub/sub for cross-module signals (selection, focus requests, toasts).
const handlers = new Map();
export const bus = {
  on(evt, fn) {
    if (!handlers.has(evt)) handlers.set(evt, new Set());
    handlers.get(evt).add(fn);
    return () => handlers.get(evt).delete(fn);
  },
  emit(evt, payload) {
    for (const fn of handlers.get(evt) || []) fn(payload);
  },
};
