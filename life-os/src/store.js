// Data layer: owns the system document, its id index, persistence and change events.
// Nothing here knows about the UI. Swap `persist`/`loadRaw` for a database later.

import { COLLECTIONS, TYPES, SCHEMA_VERSION, emptyData, normalize, migrate, defaultResources } from './schema.js';
import { uid, today, addDays, debounce } from './util.js';

const KEY = 'lifeos:data:v1';
const LEGACY_KEY = 'life-os-v3-data';

let data = null;
const index = new Map();
const listeners = new Set();
const saveListeners = new Set();

export const BUFFER = { id: 'buffer', type: 'buffer', title: 'Buffer', status: 'active' };

const REF_FIELDS = ['areaId', 'projectId', 'objectiveId', 'parentId', 'personId', 'resourceId', 'focusAreaId'];
const CLOSED = new Set(['done', 'complete', 'achieved', 'received', 'dropped', 'cancelled', 'archived', 'resolved']);

function defaults(type) {
  switch (type) {
    case 'area': return { status: 'active', color: null, why: '', current: '', desired: '', notes: '', order: data.areas.length };
    case 'goal': return { status: 'active', horizon: '3y', areaId: null, parentId: null, why: '', current: '', desired: '', deadline: '', notes: '' };
    case 'objective': return { status: 'active', horizon: 'quarter', parentId: null, areaId: null, why: '', current: '', desired: '', deadline: '', weekOf: null, notes: '' };
    case 'project': return { status: 'active', areaId: null, objectiveId: null, parentId: null, why: '', current: '', desired: '', deadline: '', priority: 'medium', owner: '', milestones: [], notes: '' };
    case 'task': return { status: 'open', isNext: false, projectId: null, areaId: null, due: '', plannedFor: null, plannedPriority: null, estimate: null, energy: null, notes: '', completedAt: null, order: Date.now() };
    case 'waiting': return { status: 'open', who: '', personId: null, requestedAt: today(), expectedAt: '', followUpAt: addDays(today(), 3), projectId: null, areaId: null, followUpAction: '', notes: '', log: [] };
    case 'responsibility': return { status: 'active', areaId: null, days: [], start: '', duration: 1, hoursPerWeek: null, why: '', notes: '' };
    case 'habit': return { status: 'active', areaId: null, targetPerWeek: 3, log: [], why: '', notes: '' };
    case 'resource': return { status: 'active', kind: 'time', unit: '', capacity: null, notes: '' };
    case 'constraint': return { status: 'active', areaId: null, resourceId: null, severity: 'hard', description: '', notes: '' };
    case 'person': return { status: 'active', role: '', notes: '' };
    case 'relationship': return { kind: 'related', from: null, to: null, note: '' };
    case 'allocation': return { resourceId: 'rc_time', targetId: null, amount: 0, direction: 'out', breakdown: [], note: '' };
    case 'review': return { weekOf: null, answers: {}, stats: {}, outcomeIds: [], capacity: {} };
    default: return {};
  }
}

function rebuildIndex() {
  index.clear();
  index.set('mission', data.mission);
  index.set('buffer', BUFFER);
  for (const c of COLLECTIONS) for (const x of data[c]) index.set(x.id, x);
}

function emit(change) {
  data.meta.updatedAt = new Date().toISOString();
  if (!change.transient) persist();
  for (const fn of listeners) fn(change);
}

const persist = debounce(() => {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
    for (const fn of saveListeners) fn({ ok: true });
  } catch (err) {
    for (const fn of saveListeners) fn({ ok: false, error: err });
  }
}, 250);

export const store = {
  get data() { return data; },

  load() {
    let raw = null;
    try { raw = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch { raw = null; }
    try { data = raw ? migrate(raw) : emptyData(); } catch { data = emptyData(); }
    if (!data.resources.length) data.resources = defaultResources();
    rebuildIndex();
    return data;
  },

  hasLegacy() {
    try { const x = JSON.parse(localStorage.getItem(LEGACY_KEY) || 'null'); return Array.isArray(x) && x.length > 0; } catch { return false; }
  },
  legacyPayload() {
    try { return JSON.parse(localStorage.getItem(LEGACY_KEY) || 'null'); } catch { return null; }
  },

  flush() { persist.flush(); },
  onSave(fn) { saveListeners.add(fn); return () => saveListeners.delete(fn); },
  subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },

  get(id) { return id ? index.get(id) || null : null; },
  list(type) {
    const c = TYPES[type] && TYPES[type].collection;
    return c ? data[c] : [];
  },
  all() { return COLLECTIONS.flatMap((c) => data[c]); },

  create(type, fields = {}, { silent = false } = {}) {
    const def = TYPES[type];
    if (!def || !def.collection) throw new Error('Unknown type ' + type);
    const now = new Date().toISOString();
    const item = { ...defaults(type), ...fields, id: fields.id || uid(def.prefix), type, createdAt: now, updatedAt: now };
    data[def.collection].push(item);
    index.set(item.id, item);
    if (!silent) emit({ kind: 'create', ids: [item.id], type });
    return item;
  },

  // origin: 'bind' marks keystroke-level edits so views can avoid re-rendering the field being typed in.
  update(id, patch, { origin = 'app', transient = false } = {}) {
    const item = index.get(id);
    if (!item) return null;
    if (id === 'mission') {
      Object.assign(data.mission, patch);
      emit({ kind: 'update', ids: [id], origin, transient });
      return data.mission;
    }
    if (item === BUFFER) return item;
    if ('status' in patch && patch.status !== item.status) {
      const closing = CLOSED.has(patch.status) && !CLOSED.has(item.status);
      const reopening = !CLOSED.has(patch.status) && CLOSED.has(item.status);
      if (closing && !('completedAt' in patch)) patch = { ...patch, completedAt: today() };
      if (reopening) patch = { ...patch, completedAt: null };
    }
    Object.assign(item, patch, { updatedAt: new Date().toISOString() });
    emit({ kind: 'update', ids: [id], origin, fields: Object.keys(patch), transient });
    return item;
  },

  updateSettings(patch) {
    Object.assign(data.settings, patch);
    emit({ kind: 'settings', ids: [] });
  },
  updateMeta(patch) {
    Object.assign(data.meta, patch);
    emit({ kind: 'meta', ids: [] });
  },
  setDay(date, patch) {
    data.days[date] = { ...(data.days[date] || {}), ...patch };
    emit({ kind: 'day', ids: [] });
  },

  setOffset(id, off, { transient = false } = {}) {
    if (off) data.layout.offsets[id] = { x: Math.round(off.x), y: Math.round(off.y) };
    else delete data.layout.offsets[id];
    if (!transient) emit({ kind: 'layout', ids: [id] });
  },
  clearOffsets() {
    data.layout.offsets = {};
    emit({ kind: 'layout', ids: [] });
  },

  // Remove items (caller decides the cascade set) and scrub every reference to them.
  removeMany(ids) {
    const gone = new Set(ids.filter((id) => id !== 'mission' && id !== 'buffer'));
    if (!gone.size) return;
    for (const c of COLLECTIONS) data[c] = data[c].filter((x) => !gone.has(x.id));
    data.relationships = data.relationships.filter((r) => !gone.has(r.from) && !gone.has(r.to));
    data.allocations = data.allocations.filter((a) => !gone.has(a.targetId) && !gone.has(a.resourceId));
    for (const c of COLLECTIONS) {
      for (const x of data[c]) {
        for (const f of REF_FIELDS) if (x[f] && gone.has(x[f])) x[f] = null;
        if (Array.isArray(x.outcomeIds)) x.outcomeIds = x.outcomeIds.filter((i) => !gone.has(i));
      }
    }
    if (gone.has(data.mission.focusAreaId)) data.mission.focusAreaId = null;
    for (const id of gone) delete data.layout.offsets[id];
    rebuildIndex();
    emit({ kind: 'remove', ids: [...gone] });
  },

  snapshot() { return JSON.stringify(data); },
  restore(snap) {
    data = normalize(JSON.parse(snap));
    rebuildIndex();
    emit({ kind: 'replace', ids: [] });
  },

  replace(raw) {
    data = migrate(raw);
    rebuildIndex();
    emit({ kind: 'replace', ids: [] });
    persist.flush();
  },

  exportJSON() {
    const out = { schemaVersion: SCHEMA_VERSION, exportedAt: new Date().toISOString(), ...JSON.parse(JSON.stringify(data)) };
    return JSON.stringify(out, null, 2);
  },

  reset() {
    data = emptyData();
    data.resources = defaultResources();
    rebuildIndex();
    emit({ kind: 'replace', ids: [] });
    persist.flush();
  },
};
