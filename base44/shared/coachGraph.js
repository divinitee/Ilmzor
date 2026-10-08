// VIRORA Coach Engine — goal graph as DATA (VT-40, A9). PURE.
// Goals and prerequisites are data, never algorithms: adding "IELTS Speaking"
// later means adding an entry here, not new engine code.
//
// STATUS (Oct 8): the goal list is a PLACEHOLDER until Tee's goal design pass
// (P4). Until then every live item counts as on-path for the default goal.
// The prerequisite edges cover only grammar topics that have playable content;
// they are a proposal for Tee (the teacher) to confirm.

export const GRAPH_VERSION = "coach-graph@1";

// Grammar topics with playable practice content (must match grammarKeys.js
// PRACTICE_KEYS; tests check this).
export const LIVE_GRAMMAR_TOPICS = [
  "tenses.present.simple-routine",
  "tenses.present.third-person-s",
  "tenses.present.simple-negative",
  "tenses.present.continuous-now",
  "tenses.present.continuous-negative",
];

// Directed edges: [prerequisite, dependent]. "Learn A before B."
export const PREREQUISITES = [
  ["grammar:tenses.present.simple-routine", "grammar:tenses.present.third-person-s"],
  ["grammar:tenses.present.third-person-s", "grammar:tenses.present.simple-negative"],
  ["grammar:tenses.present.continuous-now", "grammar:tenses.present.continuous-negative"],
];

/*
 * Goal shape (GPT re-audit #11):
 *   id, objective, target_skills, target_prefixes (item key prefixes on path),
 *   item_weights (prefix -> 0..1 goal relevance), prerequisites (extra edges),
 *   progression (what "goal complete for now" means).
 */
export const GOALS = {
  everyday: {
    id: "everyday", placeholder: true,
    objective: "Everyday English: words and grammar for daily life",
    target_skills: ["vocabulary", "grammar"],
    target_prefixes: ["word:", "grammar:tenses."],
    item_weights: { "word:": 0.6, "grammar:tenses.": 0.7 },
    prerequisites: [],
    progression: { complete_when: "all_on_path_solid_or_no_content" },
  },
  vocabulary: {
    id: "vocabulary", placeholder: true,
    objective: "Build my vocabulary",
    target_skills: ["vocabulary"],
    target_prefixes: ["word:"],
    item_weights: { "word:": 0.8 },
    prerequisites: [],
    progression: { complete_when: "all_on_path_solid_or_no_content" },
  },
  grammar_basics: {
    id: "grammar_basics", placeholder: true,
    objective: "Fix my grammar basics",
    target_skills: ["grammar"],
    target_prefixes: ["grammar:tenses."],
    item_weights: { "grammar:tenses.": 0.8 },
    prerequisites: [],
    progression: { complete_when: "all_on_path_solid_or_no_content" },
  },
};
export const DEFAULT_GOAL = "everyday";

export const goalOf = (id) => GOALS[id] || GOALS[DEFAULT_GOAL];
export const onPath = (goal, itemKey) => goal.target_prefixes.some((p) => String(itemKey).startsWith(p)) && !String(itemKey).startsWith("grammar:hub.");
export function goalRelevance(goal, itemKey) {
  let best = 0, len = -1;
  for (const [p, w] of Object.entries(goal.item_weights)) if (String(itemKey).startsWith(p) && p.length > len) { best = w; len = p.length; }
  return best;
}

/** All prerequisite edges for a goal (global + goal-specific). */
export const edgesFor = (goal) => [...PREREQUISITES, ...(goal?.prerequisites || [])];
export const prerequisitesOf = (goal, itemKey) => edgesFor(goal).filter(([, b]) => b === itemKey).map(([a]) => a);
/** How many items an item (transitively) unlocks — feeds prerequisite importance. */
export function unlockCount(goal, itemKey) {
  const edges = edgesFor(goal);
  const seen = new Set();
  const stack = [itemKey];
  while (stack.length) {
    const k = stack.pop();
    for (const [a, b] of edges) if (a === k && !seen.has(b)) { seen.add(b); stack.push(b); }
  }
  return seen.size;
}
