// Skill Intelligence — Tree, activity map, response modes, transfer graph.
// DEV ONLY. Plain Node, no bundler, no Base44, no network:
//   node tools/skill-intelligence/registry-tests.mjs   (exits non-zero on failure)
import { readFileSync } from "node:fs";
import {
  TAXONOMY_VERSION, STATE, STATES, NODES, NODE_KINDS, LEAF_IDS, LIVE_LEAF_IDS, AREA_IDS, GRAMMAR_BRANCHES, GRAMMAR_DOMAIN_IDS,
  MODES, GRAMMAR_STAGE_MODE, STAGE_LETTER_MODE, EVIDENCE_CLASS_MODE, WORD_STATE_MODE, QUALITIES, ALIASES,
  nodeById, resolveNode, childrenOf, isLeaf, isLive, areaOf, leavesUnder, ancestorsOf, grammarLeafId, revealLevel,
} from "../../base44/shared/skillTaxonomy.js";
import {
  ACTIVITY_MAP_VERSION, ACTIVITIES, XP_ONLY_GAMES, EVIDENCE_GAMES, LEGACY_SKILL_NODE, PRACTICE_GAME,
  resolveActivity, legacyRewardArea, activitiesForLeaf, leavesAwaitingServerGrading, parsePracticeItemId, enrichmentFor,
} from "../../base44/shared/skillActivityMap.js";
import {
  SUPPORT_EDGES, RELATIONSHIPS, validateEdge, validateGraph, allEdges, deriveCoMeasurementEdges,
  recommendationEligibleEdges, learnerVisibleEdges, supportSuggestionsFor,
} from "../../base44/shared/skillTransferGraph.js";
import { GAME_SKILL_MAP as SERVER_GAME_SKILL_MAP, SKILL_KEYS, XP_ONLY_GAMES as SERVER_XP_ONLY } from "../../base44/shared/progressCore.js";
import { PRACTICE_KEYS, QUIZ_KEYS } from "../../base44/shared/grammarKeys.js";
import { DOMAINS as LOCKED_DOMAINS } from "../../src/lib/adaptiveGrammar/domains.js";
import { STAGES } from "../../src/lib/grammarPractice/schema.js";
import { GAME_SKILL_MAP as CLIENT_GAME_SKILL_MAP } from "../../src/lib/gameSkills.js";

let pass = 0, fail = 0;
const ok = (n, c, x = "") => { c ? pass++ : fail++; console.log(`  ${c ? "PASS" : "FAIL"}  ${n}${!c && x ? " -> " + x : ""}`); };
const hdr = (t) => console.log(`\n=== ${t} ===`);
const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const src = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), "utf8");
const { LIVE, COMING_SOON } = STATE;

/* ------------------------------------------------------------------ */
hdr("1. Stable taxonomy ids + versioning");
const ids = NODES.map((n) => n.id);
// Pinned snapshot: changing ANY id breaks this on purpose. Renames go through ALIASES + a version bump.
const PINNED_IDS = [
  "english", "systems", "use",
  "vocabulary", "grammar", "orthography", "pronunciation", "comprehension", "production",
  "vocabulary.form_and_meaning", "vocabulary.meaning_in_context", "vocabulary.sense_relations", "vocabulary.collocations_chunks", "vocabulary.word_formation", "vocabulary.register_connotation",
  ...LOCKED_DOMAINS.map((d) => `grammar.${d.id}`),
  "orthography.spelling", "orthography.punctuation", "orthography.capitalization",
  "comprehension.reading", "comprehension.listening",
  "production.writing_sentence", "production.writing_text", "production.speaking",
];
ok("taxonomy_version is explicit (1)", TAXONOMY_VERSION === 1);
ok("activity_map_version is explicit (1)", ACTIVITY_MAP_VERSION === 1);
ok("node ids match the pinned v1 snapshot exactly", eq(ids, PINNED_IDS), ids.filter((i) => !PINNED_IDS.includes(i)).join(","));
ok("ids are unique", new Set(ids).size === ids.length);
ok("ids are identifiers, not display strings", ids.every((i) => /^[a-z][a-z0-9_.-]*$/.test(i)));
ok("registry is frozen", Object.isFrozen(NODES) && Object.isFrozen(NODES[0]));
ok("aliases empty in v1; resolveNode passes ids through", Object.keys(ALIASES).length === 0 && resolveNode("grammar.tenses")?.id === "grammar.tenses" && resolveNode("nope") === null);
ok("enrichment stamps both versions", eq([enrichmentFor({ game: "spelling", bank: "typing" }).taxonomy_version, enrichmentFor({ game: "spelling" }).activity_map_version], [1, 1]));

/* ------------------------------------------------------------------ */
hdr("2. Hierarchy + states (LIVE / COMING_SOON only)");
ok("states are exactly LIVE and COMING_SOON (no PREMIUM)", eq(STATES, ["LIVE", "COMING_SOON"]) && NODES.every((n) => STATES.includes(n.state)));
ok("kinds are known", NODES.every((n) => NODE_KINDS.includes(n.kind)));
ok("exactly one root", NODES.filter((n) => n.kind === "root").length === 1);
ok("every parent exists", NODES.every((n) => n.kind === "root" || nodeById(n.parent)));
ok("leaves have no children", LEAF_IDS.every((l) => childrenOf(l).length === 0));
ok("every leaf sits under an area", LEAF_IDS.every((l) => areaOf(l)));
ok("chains terminate at root", NODES.every((n) => n.kind === "root" || ancestorsOf(n.id).at(-1) === "english"));
ok("Systems / Use at the top", eq(childrenOf("english").map((n) => n.id), ["systems", "use"]));
ok("Systems = Vocabulary, Grammar, Orthography, Pronunciation", eq(childrenOf("systems").map((n) => n.id), ["vocabulary", "grammar", "orthography", "pronunciation"]));
ok("Use = Comprehension, Production", eq(childrenOf("use").map((n) => n.id), ["comprehension", "production"]));
ok("progressive reveal: top level shows groups + areas only", eq(revealLevel().map((g) => [g.id, g.children.map((a) => a.id)]), [["systems", ["vocabulary", "grammar", "orthography", "pronunciation"]], ["use", ["comprehension", "production"]]]));
ok("progressive reveal: opening an area shows its leaves with state", eq(revealLevel("orthography").map((l) => [l.id, l.state]), [["orthography.spelling", LIVE], ["orthography.punctuation", COMING_SOON], ["orthography.capitalization", COMING_SOON]]));
ok("Vocabulary live leaves exactly as specified", eq(leavesUnder("vocabulary").filter(isLive), ["vocabulary.form_and_meaning", "vocabulary.meaning_in_context", "vocabulary.sense_relations", "vocabulary.collocations_chunks", "vocabulary.word_formation"]));
ok("Register & Connotation is COMING_SOON", nodeById("vocabulary.register_connotation").state === COMING_SOON);
ok("Orthography: spelling LIVE, punctuation + capitalization COMING_SOON", isLive("orthography.spelling") && !isLive("orthography.punctuation") && !isLive("orthography.capitalization"));
ok("Comprehension: reading + listening COMING_SOON", eq(leavesUnder("comprehension").map((l) => [l, nodeById(l).state]), [["comprehension.reading", COMING_SOON], ["comprehension.listening", COMING_SOON]]));
ok("Production: writing_sentence LIVE; writing_text + speaking COMING_SOON", isLive("production.writing_sentence") && !isLive("production.writing_text") && !isLive("production.speaking"));
ok("Pronunciation is COMING_SOON", nodeById("pronunciation").state === COMING_SOON && nodeById("comprehension").state === COMING_SOON);
ok("no invented live capabilities (20 live leaves = 5 vocab + 13 grammar + spelling + writing_sentence)", LIVE_LEAF_IDS.length === 5 + 13 + 1 + 1, LIVE_LEAF_IDS.join(","));
ok("qualities are never nodes", QUALITIES.every((q) => !ids.some((i) => i === q || i.endsWith(`.${q}`))));
ok("creativity is not a node", !ids.some((i) => /creativ/.test(i)));

/* ------------------------------------------------------------------ */
hdr("3. Grammar = the LOCKED 13 domains (no invented branches)");
ok("13 grammar leaves, ids/order/labels match domains.js", eq(GRAMMAR_DOMAIN_IDS, LOCKED_DOMAINS.map((d) => d.id)) && LOCKED_DOMAINS.every((d) => nodeById(grammarLeafId(d.id))?.label === d.name) && leavesUnder("grammar").length === 13);
ok("all 13 grammar leaves are LIVE", leavesUnder("grammar").every(isLive));
ok("branch facets equal domains.js exactly (83), no invented branches", LOCKED_DOMAINS.every((d) => eq(GRAMMAR_BRANCHES[d.id], d.branches)) && Object.values(GRAMMAR_BRANCHES).flat().length === 83);
ok("branches are facets, not nodes", !NODES.some((n) => n.parent && n.parent.startsWith("grammar.")));
ok("word formation is vocabulary, not grammar", areaOf("vocabulary.word_formation") === "vocabulary");

/* ------------------------------------------------------------------ */
hdr("4. Canonical response modes");
ok("modes are exactly recognise / construct / produce", eq(MODES, ["recognise", "construct", "produce"]));
ok("every activity uses a canonical mode", ACTIVITIES.every((a) => MODES.includes(a.mode)));
ok("every practice stage maps to a canonical mode", eq(Object.keys(GRAMMAR_STAGE_MODE), STAGES));
ok("stage letters agree with stage names", Object.entries(STAGE_LETTER_MODE).every(([l, m]) => GRAMMAR_STAGE_MODE[STAGES.find((s) => s[0] === l)] === m));
const evClasses = JSON.parse(src("src/lib/adaptiveGrammar/schema.js").match(/EVIDENCE_CLASSES = (\[[^\]]*\])/)[1]);
ok("placement evidence classes crosswalk", eq(Object.keys(EVIDENCE_CLASS_MODE), evClasses));
const wordModes = [...src("src/lib/vocab/learnerState.js").match(/MODE = \{([^}]*)\}/)[1].matchAll(/"(\w+)"/g)].map((m) => m[1]);
ok("LearnerWordState modes crosswalk", eq(Object.keys(WORD_STATE_MODE).sort(), wordModes.sort()));
ok("all crosswalk targets are canonical", [GRAMMAR_STAGE_MODE, STAGE_LETTER_MODE, EVIDENCE_CLASS_MODE, WORD_STATE_MODE].every((m) => Object.values(m).every((v) => MODES.includes(v))));
ok("spelling = construct, definition/sentence = produce, selection games = recognise",
  resolveActivity({ game: "spelling", bank: "typing" }).mode === "construct" && resolveActivity({ game: "definition" }).mode === "produce"
  && resolveActivity({ game: "sentence" }).mode === "produce" && resolveActivity({ game: "odd_one_out" }).mode === "recognise");
ok("enrichment mode comes from the map, never the client", enrichmentFor({ game: "spelling", bank: "typing", mode: "produce" }).mode === "construct");

/* ------------------------------------------------------------------ */
hdr("5. Activity map: ONE primary leaf per evidence item");
ok("every row owns exactly one leaf (a string, not a list/weights)", ACTIVITIES.every((a) => typeof a.leaf === "string" && isLeaf(a.leaf)));
ok("no weights anywhere in the map", ACTIVITIES.every((a) => !Object.keys(a).some((k) => /weight|share|split|pct/i.test(k))));
ok("activity keys unique", new Set(ACTIVITIES.map((a) => a.key)).size === ACTIVITIES.length);
ok("every non-retired activity feeds a LIVE leaf", ACTIVITIES.filter((a) => !a.retired).every((a) => isLive(a.leaf)));
ok("Definition -> Vocabulary › Form & Meaning", resolveActivity({ game: "definition" }).leaf === "vocabulary.form_and_meaning");
ok("Spelling (every bank, and no bank) -> Orthography › Spelling", ["missing_letters", "letter_order", "typing", undefined].every((b) => resolveActivity({ game: "spelling", bank: b }).leaf === "orthography.spelling"));
ok("Spelling is owned ONLY by Orthography", ACTIVITIES.filter((a) => a.leaf === "orthography.spelling").every((a) => a.game === "spelling") && ACTIVITIES.filter((a) => a.game === "spelling").every((a) => a.leaf === "orthography.spelling"));
ok("Sentence -> Production › Writing: Sentence", resolveActivity({ game: "sentence" }).leaf === "production.writing_sentence");
ok("usage banks split across leaves", resolveActivity({ game: "usage", bank: "collocation_match" }).leaf === "vocabulary.collocations_chunks" && resolveActivity({ game: "usage", bank: "best_word" }).leaf === "vocabulary.meaning_in_context");
ok("historic usage row without bank stays at AREA (never guessed)", eq([resolveActivity({ game: "usage" }).resolution, resolveActivity({ game: "usage" }).leaf, resolveActivity({ game: "usage" }).area], ["area", null, "vocabulary"]));
ok("unknown usage bank stays at area", resolveActivity({ game: "usage", bank: "mystery" }).resolution === "area");
ok("wordforms without bank -> Word Formation", resolveActivity({ game: "wordforms" }).leaf === "vocabulary.word_formation");
ok("crossword is never evidence", resolveActivity({ game: "crossword" }).evidence === false);
ok("unknown game -> null", resolveActivity({ game: "nope" }) === null);
ok("every server-accepted game is mapped", Object.keys(SERVER_GAME_SKILL_MAP).every((g) => EVIDENCE_GAMES.includes(g)));
ok("map has no game the server rejects", EVIDENCE_GAMES.every((g) => g in SERVER_GAME_SKILL_MAP));
ok("every client game is evidence or XP-only", Object.keys(CLIENT_GAME_SKILL_MAP).every((g) => EVIDENCE_GAMES.includes(g) || XP_ONLY_GAMES.includes(g)));
ok("XP-only list matches progressCore", eq(XP_ONLY_GAMES, SERVER_XP_ONLY));
const hub = [...src("src/lib/skillTreeData.js").matchAll(/game: "(\w+)"(?:, bank: "(\w+)")?/g)].map((m) => ({ game: m[1], bank: m[2] })).filter((h) => !XP_ONLY_GAMES.includes(h.game));
ok(`every Skill Hub challenge (${hub.length}) resolves to one LIVE leaf`, hub.length > 20 && hub.every((h) => { const r = resolveActivity(h); return r?.resolution === "leaf" && isLive(r.leaf); }));

const practice = Object.entries(PRACTICE_KEYS).flatMap(([t, keys]) => Object.keys(keys).map((k) => {
  const [d, b, topic] = t.split(".");
  return { k, d, b, r: resolveActivity({ game: PRACTICE_GAME, item_id: `gpr.${d}.${b}.${topic}.${k[0]}.${k.slice(1)}` }) };
}));
ok(`every server practice key (${practice.length}) -> its domain leaf, stage mode, branch facet`, practice.every((p) => p.r.leaf === grammarLeafId(p.d) && p.r.mode === STAGE_LETTER_MODE[p.k[0]] && p.r.facets.grammar_branch === p.b));
ok("malformed practice id stays at Grammar area", resolveActivity({ game: PRACTICE_GAME, item_id: "gpr.bad" }).resolution === "area" && parsePracticeItemId("x") === null);
ok("every retired quiz bank resolves", Object.keys(QUIZ_KEYS).every((b) => resolveActivity({ game: "grammar", item_id: `${b}:0` }).resolution === "leaf"));
ok("retired quiz map covers exactly the server quiz banks", eq(ACTIVITIES.filter((a) => a.game === "grammar").map((a) => a.bank).sort(), Object.keys(QUIZ_KEYS).sort()));
ok("retired punctuation bank -> Orthography › Punctuation (COMING_SOON)", resolveActivity({ game: "grammar", item_id: "punctuation:1" }).leaf === "orthography.punctuation");
ok("unknown quiz bank is unresolved, not guessed", resolveActivity({ game: "grammar", item_id: "mystery:1" }).resolution === "unknown");
ok("resolution is deterministic", eq(resolveActivity({ game: "usage", bank: "fill_blank" }), resolveActivity({ game: "usage", bank: "fill_blank" })));

/* ------------------------------------------------------------------ */
hdr("6. Co-measurement (declared, never a weight)");
ok("co-measurement is declared as {dimension, leaf|null, basis}", ACTIVITIES.every((a) => a.coMeasured.every((c) => typeof c.dimension === "string" && (c.leaf === null || isLeaf(c.leaf)) && typeof c.basis === "string")));
ok("co-measured dimensions are dimensions the grader really scores", ACTIVITIES.every((a) => a.coMeasured.every((c) => a.dimensions.includes(c.dimension))));
ok("sentence declares its general-grammar sub-score, unattributed (no grammar leaf)", eq(resolveActivity({ game: "sentence" }).coMeasured.map((c) => [c.dimension, c.leaf]), [["grammar", null]]));
ok("co-measurement never points at the primary leaf", ACTIVITIES.every((a) => a.coMeasured.every((c) => c.leaf !== a.leaf)));
const fixtureMap = [{ key: "fx", game: "fx", bank: null, leaf: "vocabulary.collocations_chunks", mode: "recognise", verification: "server_graded", dimensions: ["correct", "form"], coMeasured: [{ dimension: "form", leaf: "vocabulary.form_and_meaning", basis: "fixture" }], retired: false }];
const fx = resolveActivity({ game: "fx" }, fixtureMap);
ok("fixture: primary leaf stays ONE leaf when co-measurement exists", fx.leaf === "vocabulary.collocations_chunks" && fx.coMeasured.length === 1);
ok("fixture: leaf-attributed co-measurement becomes a co_measurement graph edge", eq(deriveCoMeasurementEdges(fixtureMap).map((e) => [e.relationship, e.source_leaf, e.target_leaf]), [["co_measurement", "vocabulary.collocations_chunks", "vocabulary.form_and_meaning"]]));
ok("real map yields no co_measurement edges in v1 (only unattributed declarations)", deriveCoMeasurementEdges().length === 0);

/* ------------------------------------------------------------------ */
hdr("7. Coming Soon + coverage");
ok("every LIVE leaf has at least one live activity", LIVE_LEAF_IDS.every((l) => activitiesForLeaf(l).length > 0));
ok("COMING_SOON leaves have no live activity", LEAF_IDS.filter((l) => !isLive(l)).every((l) => ACTIVITIES.filter((a) => a.leaf === l && !a.retired).length === 0));
ok("leaves still awaiting server grading (client-attested only)", eq(leavesAwaitingServerGrading(), ["vocabulary.meaning_in_context", "vocabulary.sense_relations", "vocabulary.collocations_chunks", "vocabulary.word_formation"]), leavesAwaitingServerGrading().join(","));
ok("spelling is no longer client-attested", ACTIVITIES.filter((a) => a.game === "spelling").every((a) => a.verification === "server_graded"));

/* ------------------------------------------------------------------ */
hdr("8. Legacy migration mapping");
ok("all 5 legacy skills map", eq(Object.keys(LEGACY_SKILL_NODE).sort(), [...SKILL_KEYS].sort()) && Object.values(LEGACY_SKILL_NODE).every((n) => nodeById(n)));
ok("legacy 'comprehension' = Definition -> Form & Meaning, NOT the Comprehension area", LEGACY_SKILL_NODE.comprehension === "vocabulary.form_and_meaning" && LEGACY_SKILL_NODE.comprehension !== "comprehension");
ok("legacy 'creativity' -> Writing: Sentence (not a node of its own)", LEGACY_SKILL_NODE.creativity === "production.writing_sentence");
ok("legacy reward tier resolves to AREAS only", Object.keys(SERVER_GAME_SKILL_MAP).every((g) => AREA_IDS.includes(legacyRewardArea(g))));
ok("legacy spelling -> Orthography area", legacyRewardArea("spelling") === "orthography" && legacyRewardArea("definition") === "vocabulary" && legacyRewardArea("sentence") === "production");

/* ------------------------------------------------------------------ */
hdr("9. Transfer graph");
const edge = (o = {}) => ({ id: "e1", source_leaf: "vocabulary.collocations_chunks", target_leaf: "production.writing_sentence", relationship: "supports", strength: "moderate",
  mechanism: "Known chunks lower the load of composing a sentence.", basis: "pedagogical_judgement", conditions: null,
  quality_notes: [{ quality: "precision", note: "May also support precision in written production." }], status: "draft", version: 1, authored_by: "human", ...o });
const reviewed = edge({ id: "e2", status: "reviewed", reviewed_by: "pedagogy", reviewed_at: "2026-09-30" });
ok("relationships distinguish supports vs co_measurement", eq(RELATIONSHIPS, ["supports", "co_measurement"]));
ok("a well-formed draft validates", validateEdge(edge()).length === 0, validateEdge(edge()).join("; "));
ok("QUALITIES cannot be endpoints", QUALITIES.every((q) => validateEdge(edge({ target_leaf: q })).some((x) => /quality/.test(x)) && validateEdge(edge({ source_leaf: q })).some((x) => /quality/.test(x))));
ok("areas cannot be endpoints (leaves only)", validateEdge(edge({ target_leaf: "production" })).some((x) => /area/.test(x)));
ok("prerequisite is reserved", validateEdge(edge({ relationship: "prerequisite" })).some((x) => /reserved/.test(x)));
ok("numeric weights rejected", validateEdge(edge({ weight: 0.08 })).length > 0 && validateEdge(edge({ gainPct: 8 })).length > 0 && validateEdge(edge({ strength: 0.7 })).length > 0);
ok("strength is ordinal strong|moderate|weak", ["strong", "moderate", "weak"].every((s) => validateEdge(edge({ strength: s })).length === 0));
ok("qualities appear only as notes", validateEdge(edge({ quality_notes: [{ quality: "speed", note: "x" }] })).length > 0);
ok("self-loop rejected", validateEdge(edge({ target_leaf: "vocabulary.collocations_chunks" })).some((x) => /self-loop/.test(x)));
ok("reviewed needs reviewer + date; AI cannot review", validateEdge(edge({ status: "reviewed" })).length === 2 && validateEdge({ ...reviewed, authored_by: "ai" }).some((x) => /AI/.test(x)));
ok("DRAFT edges are not recommendation-eligible", recommendationEligibleEdges([edge()]).length === 0);
ok("DRAFT edges are not learner-visible", learnerVisibleEdges([edge()]).length === 0);
ok("REVIEWED supports edge is eligible", eq(recommendationEligibleEdges([edge(), reviewed]).map((e) => e.id), ["e2"]));
ok("co_measurement edges never feed recommendations", recommendationEligibleEdges(deriveCoMeasurementEdges(fixtureMap)).length === 0);
ok("suggestions are qualitative words, never numbers", eq(supportSuggestionsFor("vocabulary.collocations_chunks", [reviewed]), [{ target_leaf: "production.writing_sentence", strength: "moderate", wording: "may also support", notes: ["May also support precision in written production."] }]));
ok("duplicate edge rejected", validateGraph([reviewed, { ...reviewed, id: "e3" }]).some((x) => /duplicate edge/.test(x)));
ok("shipped graph valid; zero authored support edges in v1", validateGraph(allEdges()).length === 0 && SUPPORT_EDGES.length === 0);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
