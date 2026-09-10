// Grammar practice content — public contract.
//
// Banks are code-split per topic and fetched on demand: the whole taxonomy is
// far too large to ship in one bundle, so a student downloads only the topic
// they open. Everything here is pure and framework-free.
export { STAGES, FORMAT_BY_STAGE, validateItem, validateBank, variantCount } from "@/lib/grammarPractice/schema";

const BANKS = import.meta.glob("./bank/*.js");

export const topicKey = (domain, branch, topic) => `${domain}.${branch}.${topic}`;

/** Topics that have practice content authored, as "domain.branch.topic" keys. */
export const availableTopics = () =>
  Object.keys(BANKS).map((p) => p.replace("./bank/", "").replace(/\.js$/, "")).sort();

/** Loads one topic's items. Returns [] when nothing is authored for it yet. */
export async function loadTopic(domain, branch, topic) {
  const loader = BANKS[`./bank/${topicKey(domain, branch, topic)}.js`];
  if (!loader) return [];
  const mod = await loader();
  return mod.default ?? [];
}
