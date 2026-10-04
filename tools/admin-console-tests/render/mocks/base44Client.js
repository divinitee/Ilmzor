export const calls = [];
export const scenario = { handlers: {} };
export const base44 = {
  functions: {
    invoke: async (name, body) => {
      calls.push({ name, body });
      const h = scenario.handlers[body.action];
      if (!h) return { data: { ok: false, code: 'unknown_action' } };
      const r = await h(body);
      if (r && r.__error) { const e = new Error(r.code); e.response = { status: r.status, data: { ok: false, code: r.code, ...r.extra } }; throw e; }
      return { data: { ok: true, ...r } };
    },
  },
  auth: { logout() {}, me: async () => scenario.user },
  entities: new Proxy({}, { get() { throw new Error('console must not touch entities directly'); } }),
};
