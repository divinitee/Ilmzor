// Entity definitions, vocabularies and schema migrations.
// This file is the single source of truth for "what kinds of things exist".

export const SCHEMA_VERSION = 1;

export const COLLECTIONS = [
  'areas', 'goals', 'objectives', 'projects', 'tasks', 'responsibilities', 'habits',
  'waiting', 'resources', 'constraints', 'people', 'relationships', 'allocations', 'reviews',
];

// Families keep the core UX principle visible: never mix direction, projects,
// actions, responsibilities and resources.
export const FAMILIES = {
  direction: 'Direction',
  system: 'System',
  project: 'Project',
  action: 'Action',
  resource: 'Resource',
  people: 'People',
  link: 'Relationship',
};

export const TYPES = {
  mission: { label: 'Mission', family: 'direction', collection: null, prefix: 'mission', glyph: '✦' },
  area: { label: 'Domain', family: 'system', collection: 'areas', prefix: 'ar', glyph: '◯' },
  goal: { label: 'Goal', family: 'direction', collection: 'goals', prefix: 'gl', glyph: '◎' },
  objective: { label: 'Objective', family: 'direction', collection: 'objectives', prefix: 'ob', glyph: '◉' },
  project: { label: 'Project', family: 'project', collection: 'projects', prefix: 'pr', glyph: '▣' },
  task: { label: 'Action', family: 'action', collection: 'tasks', prefix: 'tk', glyph: '→' },
  waiting: { label: 'Waiting', family: 'action', collection: 'waiting', prefix: 'wt', glyph: '⧗' },
  responsibility: { label: 'Responsibility', family: 'system', collection: 'responsibilities', prefix: 'rs', glyph: '↻' },
  habit: { label: 'Habit', family: 'system', collection: 'habits', prefix: 'hb', glyph: '◌' },
  resource: { label: 'Resource', family: 'resource', collection: 'resources', prefix: 'rc', glyph: '⬡' },
  constraint: { label: 'Constraint', family: 'resource', collection: 'constraints', prefix: 'cn', glyph: '△' },
  person: { label: 'Person', family: 'people', collection: 'people', prefix: 'pp', glyph: '◐' },
  relationship: { label: 'Relationship', family: 'link', collection: 'relationships', prefix: 'rl', glyph: '⟶' },
  allocation: { label: 'Allocation', family: 'resource', collection: 'allocations', prefix: 'al', glyph: '▤' },
  review: { label: 'Review', family: 'direction', collection: 'reviews', prefix: 'rv', glyph: '☰' },
};

export const TYPE_BY_COLLECTION = Object.fromEntries(
  Object.entries(TYPES).filter(([, t]) => t.collection).map(([k, t]) => [t.collection, k]),
);

// Goals hold long horizons; objectives hold the cascading, time-boxed ones.
export const HORIZONS = [
  { id: 'life', label: 'Long-term', short: 'LT', kind: 'goal' },
  { id: '3y', label: '3-Year', short: '3Y', kind: 'goal' },
  { id: 'year', label: 'Annual', short: 'YR', kind: 'objective' },
  { id: 'quarter', label: 'Quarterly', short: 'QTR', kind: 'objective' },
  { id: 'month', label: 'Monthly', short: 'MO', kind: 'objective' },
  { id: 'week', label: 'Weekly', short: 'WK', kind: 'objective' },
];
export const HORIZON = Object.fromEntries(HORIZONS.map((h, i) => [h.id, { ...h, rank: i }]));

export const STATUSES = {
  area: [['active', 'Active'], ['maintaining', 'Maintaining'], ['paused', 'Paused']],
  goal: [['active', 'Active'], ['achieved', 'Achieved'], ['paused', 'Paused'], ['dropped', 'Dropped']],
  objective: [['active', 'Active'], ['achieved', 'Achieved'], ['paused', 'Paused'], ['dropped', 'Dropped']],
  project: [['not_started', 'Not started'], ['active', 'Active'], ['blocked', 'Blocked'], ['waiting', 'Waiting'], ['complete', 'Complete'], ['archived', 'Archived']],
  task: [['open', 'Open'], ['done', 'Done'], ['dropped', 'Dropped']],
  waiting: [['open', 'Waiting'], ['received', 'Received'], ['cancelled', 'Cancelled']],
  responsibility: [['active', 'Active'], ['paused', 'Paused']],
  habit: [['active', 'Active'], ['paused', 'Paused']],
  constraint: [['active', 'Active'], ['resolved', 'Resolved']],
  resource: [['active', 'Active']],
  person: [['active', 'Active']],
};

export const PRIORITIES = [['high', 'High'], ['medium', 'Medium'], ['low', 'Low']];
export const ENERGY = [['low', 'Low energy'], ['medium', 'Medium energy'], ['high', 'Deep focus']];

// Relationship types. Every relationship is directed upstream → downstream:
// "from" affects "to". `competes` is the one symmetric type.
export const REL_TYPES = {
  enables: { label: 'Enables', category: 'Enabling', family: 'enable', verb: 'enables', inverse: 'enabled by', template: (a, b) => `${a} makes ${b} possible.` },
  supports: { label: 'Supports', category: 'Support', family: 'enable', verb: 'supports', inverse: 'supported by', template: (a, b) => `${a} strengthens ${b}.` },
  builds: { label: 'Builds', category: 'Capital', family: 'enable', verb: 'builds', inverse: 'built by', template: (a, b) => `Work in ${a} builds ${b}.` },
  funds: { label: 'Funds', category: 'Money flow', family: 'flow', verb: 'funds', inverse: 'funded by', template: (a, b) => `${a} provides the money ${b} runs on.` },
  produces: { label: 'Produces', category: 'Output', family: 'flow', verb: 'produces', inverse: 'produced by', template: (a, b) => `${a} produces ${b}.` },
  requires: { label: 'Resource dependency', category: 'Resource dependency', family: 'resource', verb: 'is required by', inverse: 'requires', template: (a, b) => `${b} requires dedicated ${a.toLowerCase()}.` },
  blocks: { label: 'Blocks', category: 'Dependency', family: 'dependency', verb: 'blocks', inverse: 'blocked by', template: (a, b) => `${b} cannot move until ${a} is done.` },
  constrains: { label: 'Constrains', category: 'Constraint', family: 'constraint', verb: 'constrains', inverse: 'constrained by', template: (a, b) => `${a} limits what ${b} can do.` },
  competes: { label: 'Competes with', category: 'Conflict', family: 'conflict', verb: 'competes with', inverse: 'competes with', symmetric: true, template: (a, b) => `${a} and ${b} draw on the same limited capacity.` },
  related: { label: 'Related', category: 'Related', family: 'related', verb: 'relates to', inverse: 'relates to', symmetric: true, template: (a, b) => `${a} and ${b} are connected.` },
};

// Muted area palette: used sparingly (rings, dots), never as big fills.
export const AREA_COLORS = ['#8fe3c4', '#8fb4f0', '#e6c27a', '#b3a2f2', '#7fcfdc', '#eea0b8', '#a9cf85', '#d9a585'];

export const RESOURCE_KINDS = {
  time: { label: 'Time', unit: 'h/week', glyph: '◷' },
  money: { label: 'Money', unit: '/month', glyph: '¤' },
  energy: { label: 'Energy', unit: '%', glyph: '϶' },
  attention: { label: 'Attention', unit: '%', glyph: '◈' },
};

export const DEFAULT_DOMAINS = ['University', 'Finance Career', 'Teaching', 'VIRORA', 'Personal Finance', 'Skills', 'Personal Life', 'Health'];

export function emptyData() {
  const now = new Date().toISOString();
  return {
    schemaVersion: SCHEMA_VERSION,
    meta: { app: 'LIFE OS', createdAt: now, updatedAt: now, onboardedAt: null, lastReviewAt: null },
    mission: { id: 'mission', type: 'mission', title: 'Life', statement: '', vision: '', focus: '', focusAreaId: null },
    settings: { weeklyHours: 70, dailyHours: 10, currency: '', showCompleted: false },
    areas: [], goals: [], objectives: [], projects: [], tasks: [], responsibilities: [], habits: [],
    waiting: [], resources: [], constraints: [], people: [], relationships: [], allocations: [], reviews: [],
    days: {},
    layout: { offsets: {} },
  };
}

export function defaultResources() {
  return Object.entries(RESOURCE_KINDS).map(([kind, r]) => ({
    id: 'rc_' + kind, type: 'resource', kind, title: r.label, unit: r.unit, status: 'active',
    capacity: kind === 'energy' || kind === 'attention' ? 100 : null, notes: '',
  }));
}

// Upgrade any older payload to the current schema. Add a step per version bump.
const MIGRATIONS = {
  // 0 → 1: the V3 prototype stored a flat array of nodes.
  0: (legacy) => fromV3(Array.isArray(legacy) ? legacy : []),
};

export function migrate(raw) {
  let data = raw;
  let v = Array.isArray(raw) ? 0 : Number(raw && raw.schemaVersion);
  if (!Number.isFinite(v)) throw new Error('Not a LIFE OS export (missing schemaVersion).');
  if (v > SCHEMA_VERSION) throw new Error(`This file uses schema v${v}; this app understands up to v${SCHEMA_VERSION}.`);
  while (v < SCHEMA_VERSION) {
    const step = MIGRATIONS[v];
    if (!step) throw new Error(`No migration from schema v${v}.`);
    data = step(data);
    v = data.schemaVersion;
  }
  return normalize(data);
}

// Fill defaults, drop dangling references. Safe to run on any v1 payload.
export function normalize(input) {
  const base = emptyData();
  const data = { ...base, ...input };
  data.meta = { ...base.meta, ...(input.meta || {}) };
  data.mission = { ...base.mission, ...(input.mission || {}), id: 'mission', type: 'mission' };
  data.settings = { ...base.settings, ...(input.settings || {}) };
  data.days = input.days && typeof input.days === 'object' ? input.days : {};
  data.layout = { offsets: {}, ...(input.layout || {}) };
  for (const c of COLLECTIONS) {
    const type = TYPE_BY_COLLECTION[c];
    data[c] = (Array.isArray(input[c]) ? input[c] : [])
      .filter((x) => x && typeof x === 'object' && x.id)
      .map((x) => ({ ...x, type }));
  }
  const kinds = new Set(data.resources.map((r) => r.kind));
  for (const r of defaultResources()) if (!kinds.has(r.kind)) data.resources.push(r);
  const ids = new Set(['mission', 'buffer']);
  for (const c of COLLECTIONS) for (const x of data[c]) ids.add(x.id);
  data.relationships = data.relationships.filter((r) => ids.has(r.from) && ids.has(r.to) && r.from !== r.to && REL_TYPES[r.kind]);
  data.allocations = data.allocations.filter((a) => ids.has(a.resourceId) && ids.has(a.targetId));
  data.schemaVersion = SCHEMA_VERSION;
  return data;
}

function fromV3(nodes) {
  const data = emptyData();
  data.resources = defaultResources();
  const idMap = {};
  let colorIdx = 0;
  for (const n of nodes) {
    if (!n || !n.id) continue;
    if (n.type === 'domain') {
      const id = 'ar_' + n.id;
      idMap[n.id] = id;
      data.areas.push({ id, type: 'area', title: n.name, color: AREA_COLORS[colorIdx++ % AREA_COLORS.length], status: 'active', why: n.summary || '', current: n.current || '', desired: n.desired || '', notes: '', order: data.areas.length });
    } else if (n.type === 'resource') {
      idMap[n.id] = 'rc_time';
    }
  }
  const areaOf = (pid) => (pid && idMap[pid] && idMap[pid].startsWith('ar_') ? idMap[pid] : null);
  for (const n of nodes) {
    if (!n || !n.id || n.type === 'domain' || n.type === 'resource') continue;
    if (n.type === 'project') {
      const id = 'pr_' + n.id;
      idMap[n.id] = id;
      data.projects.push({ id, type: 'project', title: n.name, status: 'active', areaId: areaOf(n.parent), current: n.current || '', desired: n.desired || '', why: n.summary || '', notes: '', milestones: [] });
      if (n.next) data.tasks.push({ id: 'tk_' + n.id, type: 'task', title: n.next, status: 'open', isNext: true, projectId: id, notes: '' });
    } else if (n.type === 'goal') {
      const id = 'gl_' + n.id;
      idMap[n.id] = id;
      data.goals.push({ id, type: 'goal', title: n.name, horizon: '3y', status: 'active', areaId: areaOf(n.parent), current: n.current || '', desired: n.desired || '', why: n.summary || '', notes: '' });
    } else if (n.type === 'task') {
      const id = 'tk_' + n.id;
      idMap[n.id] = id;
      data.tasks.push({ id, type: 'task', title: n.name, status: 'open', isNext: false, areaId: areaOf(n.parent), notes: n.current || '' });
    }
  }
  for (const n of nodes) {
    if (n && n.type === 'domain' && n.next) {
      data.tasks.push({ id: 'tk_next_' + n.id, type: 'task', title: n.next, status: 'open', isNext: false, areaId: idMap[n.id], notes: 'Imported from V3 domain next action' });
    }
  }
  const seen = new Set();
  for (const n of nodes) {
    for (const l of (n && n.links) || []) {
      const a = idMap[n.id], b = idMap[l];
      if (!a || !b || a === b) continue;
      const key = [a, b].sort().join('|');
      if (seen.has(key)) continue;
      seen.add(key);
      const isRes = a === 'rc_time' || b === 'rc_time';
      const from = b === 'rc_time' ? b : a;
      const to = b === 'rc_time' ? a : b;
      data.relationships.push({ id: 'rl_' + key.replace(/[^a-z0-9]/gi, ''), type: 'relationship', kind: isRes ? 'requires' : 'related', from, to, note: '' });
    }
  }
  data.mission.statement = '';
  data.meta.onboardedAt = new Date().toISOString();
  data.schemaVersion = 1;
  return data;
}
