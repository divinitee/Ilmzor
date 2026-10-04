// Stands in for base44:runtime inside entry.ts (see import_map.json).
export const store: Record<string, string> = {};
export const secrets = { get: (name: string) => store[name] };
