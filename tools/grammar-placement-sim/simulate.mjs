// VIRORA — deterministic engine simulation. NO AI, NO NETWORK.
// Imports only the PURE engine core + the dataset. session.js / persistence.js
// (the only modules that reach base44Client, the AI grader or the network) are
// deliberately NOT imported — verified structurally in the bundle audit.
import { ADAPTIVE_GRAMMAR_ITEMS as ITEMS, DOMAINS, CEFR_LEVELS, validateDataset } from "@/lib/adaptiveGrammar";
import { buildIndex } from "@/lib/grammarPlacement/datasetIndex";
import { resolveConfig, DEFAULT_CONFIG } from "@/lib/grammarPlacement/config";
import { createSession, selectNext, applyResponse, finalize } from "@/lib/grammarPlacement/engine";
import { EVAL_STATUS } from "@/lib/grammarPlacement/scoring";
import { PLACEMENT_LEVELS as LV, levelIndex } from "@/lib/grammarPlacement/levels";
import { analyzeDomain } from "@/lib/grammarPlacement/selection";
import { deriveCells } from "@/lib/grammarPlacement/evidence";
import { analyzeDependencies } from "@/lib/grammarPlacement/prerequisites";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT_PATH = process.env.SIM_OUT || path.join(HERE, "results.json");

const index = buildIndex(ITEMS,{datasetLevels:CEFR_LEVELS,domainOrder:DOMAINS.map(d=>d.id)});
const NAME = Object.fromEntries(DOMAINS.map(d=>[d.id,d.name]));

// ---- AI-call tripwires -----------------------------------------------------
let aiCalls=0, netCalls=0, injectedEvals=0, rubricSeen=0;
for (const k of ["fetch","XMLHttpRequest"]) {
  const orig = globalThis[k];
  if (orig) globalThis[k] = (...a)=>{ netCalls++; throw new Error(`NETWORK CALL BLOCKED: ${k}`); };
}

// ---- deterministic response model -----------------------------------------
// Spec: correct 1.0 · partial 0.5 · incorrect 0.0. No randomness anywhere.
const CREDIT = { correct:1.0, partial:0.5, incorrect:0.0 };

function ladderCredit(T, item) {
  const d = levelIndex(item.cefrLevel) - levelIndex(T);
  if (d <= 0) return CREDIT.correct;
  if (d === 1) return CREDIT.partial;
  return CREDIT.incorrect;
}

function respond(item, creditFn) {
  const credit = creditFn(item);
  if (item.answer.type === "rubric") {
    // Production-format item: inject a deterministic evaluation instead of
    // calling the AI grader. This is the ONLY path a rubric item can take here.
    rubricSeen++; injectedEvals++;
    return { evaluation: { status: EVAL_STATUS.SCORED, credit, correct: credit>=0.5, detail:"injected", raw:null } };
  }
  const a = item.answer;
  if (credit >= 1) {
    if (a.type==="index") return { response: a.expected };
    if (a.type==="exact") return { response: a.expected };
    if (a.type==="sequence") return { response: a.expected };
  }
  // Deterministic items have no half-credit: 0.5 rounds to a wrong answer, and
  // the run records it as such. Recorded so the report can be honest about it.
  if (a.type==="index") return { response:(a.expected+1)%item.content.options.length, degraded: credit===0.5 };
  if (a.type==="exact") return { response:"zzzz", degraded: credit===0.5 };
  if (a.type==="sequence") return { response:[...a.expected].reverse().concat("x"), degraded: credit===0.5 };
  return { response:null };
}

function run(profile) {
  const config = resolveConfig(profile.cfg||{});
  const { state } = createSession({ index, config: profile.cfg||{}, seed: profile.seed, runId: profile.id, startedAt:"2026-09-09T00:00:00.000Z" });
  let s=state; const log=[]; let guard=0; let degradedPartials=0;
  for(;;){
    if(++guard>500) throw new Error("runaway");
    const step = selectNext(s,index,config,{allowAi:true});
    s=step.state;
    if (step.action==="complete") break;
    const it=step.item;
    const r=respond(it, profile.credit);
    if (r.degraded) degradedPartials++;
    log.push({seq:log.length+1,id:it.id,domain:it.domain,branch:it.branch,topic:it.topic,level:it.cefrLevel,
              evidenceClass:it.evidenceClass,difficulty:it.difficulty,phase:step.meta?.phase,
              probe:step.meta?.probeLevel??null,rubric:it.answer.type==="rubric"});
    s=applyResponse(s,index,config,{itemId:it.id,response:r.response,evaluation:r.evaluation??null,at:"2026-09-09T00:01:00.000Z"});
  }
  const runRec = finalize(s,index,config,{completedAt:"2026-09-09T00:20:00.000Z"});
  const cells = deriveCells(s.ledger,index,config);
  const deps = analyzeDependencies(s.ledger,cells,index,config);
  return { profile, run:runRec, log, state:s, config, cells, deps, degradedPartials };
}

// ---- audit checks ----------------------------------------------------------
function audit(R) {
  const A={};
  const ids=R.log.map(x=>x.id);
  A.repeats = ids.length - new Set(ids).size;
  A.items = ids.length;
  A.stop = R.run.totals.stoppedBecause;
  A.anchor = R.run.totals.anchorLevel;
  // start sanity: first item must be at the configured calibration start level
  A.firstLevel = R.log[0]?.level; A.firstPhase = R.log[0]?.phase;
  // suspicious jumps: consecutive picks >=3 rungs apart
  A.bigJumps = R.log.slice(1).filter((x,i)=>Math.abs(levelIndex(x.level)-levelIndex(R.log[i].level))>=3).length;
  // selection above a domain's failed ceiling (should never happen)
  A.aboveCeiling = 0;
  for (const d of index.domainIds) {
    const an = analyzeDomain(d,R.cells,index,R.deps);
    if (!an.ceilingFailed) continue;
    A.aboveCeiling += R.log.filter(x=>x.domain===d && levelIndex(x.level)>levelIndex(an.ceilingFailed)).length;
  }
  // C2 handling
  const c2 = R.log.filter(x=>x.level==="C2");
  A.c2Items = c2.length;
  A.c2PerDomainMax = Math.max(0, ...Object.values(c2.reduce((m,x)=>(m[x.domain]=(m[x.domain]||0)+1,m),{})));
  A.c2InNoC2Domain = c2.filter(x=>index.maxAssessableLevel(x.domain)!=="C2").length;
  // sparse-bucket trap: any cell observed beyond its supply
  A.overSupply = [...R.cells.values()].filter(c=>c.observed>index.supply(c.domain,c.level)).length;
  // fallback: level substitutions when a domain lacks the anchor level
  A.substitutions = R.run.levelSubstitutions.length;
  // domains covered
  A.domainsTouched = new Set(R.log.map(x=>x.domain)).size;
  A.branchesTouched = new Set(R.log.map(x=>x.domain+"/"+x.branch)).size;
  A.topicsTouched = new Set(R.log.map(x=>x.domain+"/"+x.branch+"/"+x.topic)).size;
  A.levelsUsed = [...new Set(R.log.map(x=>x.level))].sort((a,b)=>levelIndex(a)-levelIndex(b)).join(",");
  A.rubricItems = R.log.filter(x=>x.rubric).length;
  // contradictions / independent failures
  A.contradictions = R.run.profile.domains.flatMap(d=>d.contradictions.map(c=>({domain:d.domain,concept:c.concept,type:c.type,clearedAt:c.clearedAt,failingLevel:c.failingLevel})));
  A.independent = R.run.profile.domains.filter(d=>d.independentLowerFailures.length).map(d=>({domain:d.domain,levels:d.independentLowerFailures}));
  // upward / downward movement evidence
  const byDom={};
  R.log.forEach(x=>(byDom[x.domain]??=[]).push(levelIndex(x.level)));
  A.movedUp = Object.values(byDom).filter(a=>a.some((v,i)=>i>0&&v>a[i-1])).length;
  A.movedDown = Object.values(byDom).filter(a=>a.some((v,i)=>i>0&&v<a[i-1])).length;
  return A;
}

const domSummary = R => R.run.profile.domains.map(d=>({
  domain:d.domain, level:d.estimatedLevel, basis:d.basis, verified:d.verifiedLevel,
  belowFloor:d.belowFloor, ceiling:d.atCoverageCeiling, conf:d.confidence.band, confScore:d.confidence.score,
  contradictions:d.contradictions.length, independentLowerFailures:d.independentLowerFailures,
  untestedBelow:d.untestedBelow, observed:Object.keys(d.observedRungs),
}));

// ---- profiles --------------------------------------------------------------
const strongBranchFail = (baseT, domain, branch) => (item) =>
  (item.domain===domain && item.branch===branch) ? CREDIT.incorrect : ladderCredit(baseT,item);

// Profile 8: fail every item that exercises concept C at/below A2 in `tenses`,
// succeed on everything else (so B1 tenses clears on items that DECLARE C).
const CONFLICT_CONCEPT = "present-perfect";
const prereqConflict = (item) => {
  if (item.domain==="tenses" && levelIndex(item.cefrLevel)<=1 &&
      (item.prerequisites||[]).includes(CONFLICT_CONCEPT)) return CREDIT.incorrect;
  return ladderCredit("B1", item);
};
// Profile 9: deterministic alternation keyed on a stable hash of the item id.
const hash = s => { let h=0; for(let i=0;i<s.length;i++) h=(h*31+s.charCodeAt(i))|0; return Math.abs(h); };
const inconsistent = (item) => [CREDIT.correct,CREDIT.incorrect,CREDIT.correct,CREDIT.partial][hash(item.id)%4];

const PROFILES = [
  {id:"P1-A1",   label:"A1 learner",            seed:11, credit:i=>ladderCredit("A1",i)},
  {id:"P2-A2",   label:"A2 learner",            seed:22, credit:i=>ladderCredit("A2",i)},
  {id:"P3-B1",   label:"B1 learner",            seed:33, credit:i=>ladderCredit("B1",i)},
  {id:"P4-B2",   label:"B2 learner",            seed:44, credit:i=>ladderCredit("B2",i)},
  {id:"P5-C1",   label:"C1 learner",            seed:55, credit:i=>ladderCredit("C1",i)},
  {id:"P6-MAX",  label:"strongest available",   seed:66, credit:()=>CREDIT.correct},
  {id:"P7-INDEP",label:"independent weakness (tenses/past failing, B2 elsewhere)", seed:77,
                 credit:strongBranchFail("B2","tenses","past")},
  {id:"P8-CONF", label:`genuine prerequisite conflict (${CONFLICT_CONCEPT})`, seed:88,
                 credit:prereqConflict, cfg:{calibration:{startLevel:"A2"}}},
  {id:"P9-MIX",  label:"inconsistent learner",  seed:99, credit:inconsistent},
];

const results=[]; const out={};
for (const p of PROFILES) {
  const R = run(p);
  const A = audit(R);
  results.push({p,R,A});
  out[p.id] = {
    label:p.label, overall:R.run.profile.overall, audit:A, domains:domSummary(R),
    itemLog:R.log, totals:R.run.totals, substitutions:R.run.levelSubstitutions,
  };
  console.log(`\n######## ${p.id} — ${p.label}`);
  console.log(`  overall=${R.run.profile.overall.level ?? "below A1"} conf=${R.run.profile.overall.confidence.band} boundBy=${R.run.profile.overall.rationale.boundBy}`);
  console.log(`  items=${A.items} anchor=${A.anchor} stop=${A.stop} repeats=${A.repeats} levels=[${A.levelsUsed}]`);
  console.log(`  domains=${A.domainsTouched}/13 branches=${A.branchesTouched} topics=${A.topicsTouched} rubricItems=${A.rubricItems} substitutions=${A.substitutions}`);
  console.log(`  bigJumps(>=3 rungs)=${A.bigJumps} aboveFailedCeiling=${A.aboveCeiling} overSupply=${A.overSupply} c2=${A.c2Items}(max/domain ${A.c2PerDomainMax}, in no-C2 domain ${A.c2InNoC2Domain})`);
  console.log(`  movedUp(domains)=${A.movedUp} movedDown(domains)=${A.movedDown} degradedPartialsOnDeterministicItems=${R.degradedPartials}`);
  console.log(`  contradictions=${A.contradictions.length}${A.contradictions.length?" -> "+A.contradictions.map(c=>`${c.domain}:${c.concept}(${c.clearedAt} over ${c.failingLevel})`).join("; "):""}`);
  console.log(`  independentLowerFailures=${A.independent.length}${A.independent.length?" -> "+A.independent.map(x=>x.domain+":"+x.levels.join("/")).join("; "):""}`);
  console.log("  per-domain:");
  for (const d of domSummary(R)) {
    console.log(`    ${d.domain.padEnd(20)} ${String(d.level??"belowFloor").padEnd(10)} ${d.basis.padEnd(12)} conf=${d.conf.padEnd(6)}(${d.confScore}) obs=[${d.observed.join(",")}] untestedBelow=[${d.untestedBelow.join(",")}]${d.contradictions?"  CONTRA="+d.contradictions:""}${d.independentLowerFailures.length?"  INDEP=["+d.independentLowerFailures.join(",")+"]":""}${d.ceiling?"  atCoverageCeiling":""}`);
  }
}

// ---- determinism: re-run every profile and compare -------------------------
console.log("\n######## DETERMINISM (each profile re-run and compared)");
let detOk=true;
for (const {p,R,A} of results) {
  const R2=run(p);
  const same = JSON.stringify(R.log.map(x=>x.id))===JSON.stringify(R2.log.map(x=>x.id))
            && JSON.stringify(domSummary(R))===JSON.stringify(domSummary(R2))
            && R.run.profile.overall.level===R2.run.profile.overall.level;
  if(!same) detOk=false;
  console.log(`  ${p.id.padEnd(10)} identical=${same}`);
}
console.log(`  ALL DETERMINISTIC: ${detOk}`);

console.log("\n######## AI / NETWORK TRIPWIRES");
console.log(`  production AI grader calls: ${aiCalls}`);
console.log(`  network calls attempted:    ${netCalls}`);
console.log(`  rubric (AI-format) items encountered: ${rubricSeen}`);
console.log(`  deterministic evaluations injected:   ${injectedEvals}`);
console.log(`  every rubric item injected locally:   ${rubricSeen===injectedEvals}`);

fs.writeFileSync(OUT_PATH, JSON.stringify(out,null,1));
console.log(`\nfull per-item detail written to ${OUT_PATH}`);
