const WORDS = [
  { id: "v1", english: "apple", uzbek: "olma", russian: "яблоко", cefr: "A2" },
  { id: "v2", english: "bread", uzbek: "non", russian: "хлеб", cefr: "A2" },
  { id: "v3", english: "river", uzbek: "daryo", russian: "река", cefr: "A2" },
  { id: "v4", english: "house", uzbek: "uy", russian: "дом", cefr: "A2" },
  { id: "v5", english: "book", uzbek: "kitob", russian: "книга", cefr: "A2" },
  { id: "v6", english: "water", uzbek: "suv", russian: "вода", cefr: "A2" },
];
const match = (w, q) => Object.entries(q || {}).every(([k, v]) => (v && v.$in ? v.$in.includes(w[k]) : w[k] === v));
export const base44 = { entities: { VocabularyWord: { filter: async (q, _s, limit = 50) => WORDS.filter((w) => match(w, q)).slice(0, limit), list: async () => WORDS } } };
