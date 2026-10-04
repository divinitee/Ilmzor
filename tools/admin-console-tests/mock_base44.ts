// In-memory stand-ins for the Base44 SDK and runtime, for the Admin Console
// refusal tests. Only what adminApi uses: auth.me(), asServiceRole.entities
// with filter/create/update/list, equality queries, sort, limit, skip.

let idSeq = 0;

export class MockEntity {
  rows: any[] = [];
  constructor(public name: string) {}

  private match(row: any, q: Record<string, unknown>) {
    return Object.entries(q || {}).every(([k, v]) => {
      if (v && typeof v === 'object' && '$in' in (v as any)) return (v as any).$in.includes(row[k]);
      return row[k] === v;
    });
  }

  async filter(q: Record<string, unknown> = {}, sort?: string, limit = 50, skip = 0) {
    let out = this.rows.filter((r) => this.match(r, q));
    if (sort) {
      const desc = sort.startsWith('-');
      const f = desc ? sort.slice(1) : sort;
      out = [...out].sort((a, b) => String(a[f] ?? '').localeCompare(String(b[f] ?? '')) * (desc ? -1 : 1));
    }
    return structuredClone(out.slice(skip, skip + limit));
  }

  async list(sort?: string, limit = 50) {
    return this.filter({}, sort, limit, 0);
  }

  async get(id: string) {
    const r = this.rows.find((x) => x.id === id);
    if (!r) throw new Error('not found');
    return structuredClone(r);
  }

  async create(data: any) {
    // created_date strictly increasing so sort order is deterministic.
    const row = { ...structuredClone(data), id: `${this.name}_${++idSeq}`, created_date: new Date(1_700_000_000_000 + idSeq).toISOString() };
    this.rows.push(row);
    return structuredClone(row);
  }

  async update(id: string, patch: any) {
    const r = this.rows.find((x) => x.id === id);
    if (!r) throw new Error('not found');
    Object.assign(r, structuredClone(patch));
    return structuredClone(r);
  }
}

export function makeWorld() {
  const names = ['User', 'StudentSubscription', 'ManualPayment', 'AdminSecurity', 'AdminAuditLog'];
  const entities: Record<string, MockEntity> = {};
  for (const n of names) entities[n] = new MockEntity(n);

  const users: Record<string, any> = {
    tee: { id: 'u_tee', email: 'gameboey0191@gmail.com', role: 'admin', full_name: 'Tee', created_date: '2026-08-30T04:07:48Z' },
    ilmzor: { id: 'u_ilmzor', email: 'ilmzor.uz@gmail.com', role: 'admin', full_name: 'ILMZOR', created_date: '2026-06-28T10:37:40Z' },
    student: { id: 'u_student', email: 'student@example.com', role: 'user', full_name: 'Student', created_date: '2026-10-01T00:00:00Z' },
  };
  entities.User.rows.push(...Object.values(users).map((u) => ({ ...u })));

  // Requests carry the acting user in a test header; no header = signed out.
  const createClientFromRequest = (req: Request) => {
    const who = req.headers.get('x-test-user');
    return {
      auth: {
        me: async () => {
          if (!who || !users[who]) throw new Error('401');
          return { ...users[who] };
        },
      },
      asServiceRole: { entities },
    };
  };

  return { entities, users, createClientFromRequest };
}
