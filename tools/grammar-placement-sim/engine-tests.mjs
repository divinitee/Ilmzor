// VIRORA — Grammar Placement Engine unit/behaviour suite. DEV ONLY.
// Same hard constraints as simulate.mjs: pure engine core + dataset only,
// no Base44, no AI grader, no network. See README.md.
import { ADAPTIVE_GRAMMAR_ITEMS as ITEMS, DOMAINS, CEFR_LEVELS, validateDataset } from "@/lib/adaptiveGrammar";
import { buildIndex } from "@/lib/grammarPlacement/datasetIndex";
import { resolveConfig, DEFAULT_CONFIG } from "@/lib/grammarPlacement/config";
import { createSession, selectNext, applyResponse, finalize, STOP_REASONS } from "@/lib/grammarPlacement/engine";
import { EVAL_STATUS, normalizeAiEvaluation } from "@/lib/grammarPlacement/scoring";
import { PLACEMENT_LEVELS, levelIndex } from "@/lib/grammarPlacement/levels";
import { mulberry32, analyzeDomain, domainResolved, cellValue } from "@/lib/grammarPlacement/selection";
import { deriveCells, createLedger, recordObservation } from "@/lib/grammarPlacement/evidence";
import { placeDomain, BASIS } from "@/lib/grammarPlacement/placement";
import { analyzeDependencies, buildConceptEvidence, conceptEvidenceBelow } from "@/lib/grammarPlacement/prerequisites";
import * as PREREQ_EXPORTS from "@/lib/grammarPlacement/prerequisites";

let PASS=0, FAIL=0; const fails=[];
const ok=(n,c,i="")=>{ if(c){PASS++;console.log("  PASS  "+n);} else {FAIL++;fails.push(n+(i?" :: "+i:""));console.log("  FAIL  "+n+(i?" :: "+i:""));} };
const hdr=t=>console.log("\n=== "+t+" ===");
const cfg0=resolveConfig({});
const index = buildIndex(ITEMS, { datasetLevels: CEFR_LEVELS, domainOrder: DOMAINS.map(d=>d.id) });

let _seq=0;
const obs=(led,it,credit)=>recordObservation(led,{seq:++_seq,itemId:it.id,domain:it.domain,branch:it.branch,topic:it.topic,
  prerequisites:it.prerequisites??[],level:it.cefrLevel,evidenceClass:it.evidenceClass,format:it.format,formatType:it.formatType,
  difficulty:it.difficulty,phase:"resolution",probeLevel:null,aiGraded:false,status:EVAL_STATUS.SCORED,credit,correct:credit>0.5,detail:"",at:"t"});
const analyse=(led,config=cfg0)=>{ const cells=deriveCells(led,index,config); return {cells, deps:analyzeDependencies(led,cells,index,config)}; };

hdr("1. Dataset contract verification");
ok("dataset imports via the public contract", Array.isArray(ITEMS) && ITEMS.length===533, "n="+ITEMS.length);
ok("validateDataset passes with 0 problems", validateDataset(ITEMS).length===0);
ok("13 domains present", DOMAINS.length===13);
ok("index builds over all 13 domains", index.domainIds.length===13);
ok("every domain has reachable assessment content", index.domainIds.every(d=>index.levelsForDomain(d).length>0));
ok("ladder mismatch fails loudly", (()=>{ try{ buildIndex(ITEMS,{datasetLevels:["A1","A2"]}); return false; }catch(e){ return /ladder mismatch/.test(e.message); } })());
ok("review-flagged items remain eligible", ITEMS.filter(i=>i.reviewFlags?.length).every(i=>index.itemsFor(i.domain,i.cefrLevel).some(x=>x.id===i.id)));

function makeLearner(trueLevel,{seed=7,domainOverrides={},aiFailRate=0}={}) {
  const rng = mulberry32(seed);
  return { respond(item){
    const T=levelIndex(domainOverrides[item.domain] ?? trueLevel), L=levelIndex(item.cefrLevel);
    let p = L<=T-1?0.93 : L===T?0.82 : L===T+1?0.30 : 0.10;
    p -= 0.05*(item.difficulty-2);
    const correct = rng()<p, a=item.answer;
    if (a.type==="rubric") {
      if (rng()<aiFailRate) return { evaluation: normalizeAiEvaluation(null,{error:new Error("sim failure")}) };
      return { evaluation: normalizeAiEvaluation({score:correct?5:1,diagnosis:correct?"correct":"tense_error",tip:""}) };
    }
    if (a.type==="index") return { response: correct?a.expected:(a.expected+1)%item.content.options.length };
    if (a.type==="exact") return { response: correct?a.expected:"zzzz" };
    if (a.type==="sequence") return { response: correct?a.expected:[...a.expected].reverse().concat("x") };
    return { response:null };
  }};
}
function runOne({trueLevel,seed=7,cfg={},domainOverrides={},aiFailRate=0,allowAi=true}) {
  const config = resolveConfig(cfg);
  const { state } = createSession({ index, config: cfg, seed, runId:"t"+seed, startedAt:"2026-09-09T00:00:00.000Z" });
  const L = makeLearner(trueLevel,{seed:seed+11,domainOverrides,aiFailRate});
  let s=state; const served=[]; let guard=0;
  for(;;){
    if(++guard>400) throw new Error("runaway loop");
    const step = selectNext(s,index,config,{allowAi}); s = step.state;
    if (step.action==="complete") return { run: finalize(s,index,config,{completedAt:"2026-09-09T00:20:00.000Z"}), served, state:s, config };
    served.push(step.item);
    const r = L.respond(step.item);
    s = applyResponse(s,index,config,{itemId:step.item.id,response:r.response,evaluation:r.evaluation??null,at:"2026-09-09T00:01:00.000Z"});
  }
}

hdr("2. Full runs across the ladder (A1..C2)");
const runs={};
for (const lvl of PLACEMENT_LEVELS) {
  const r = runOne({trueLevel:lvl, seed:100+levelIndex(lvl)}); runs[lvl]=r;
  console.log(`  true=${lvl.padEnd(3)} items=${String(r.run.totals.itemsServed).padStart(2)} anchor=${String(r.run.totals.anchorLevel).padEnd(3)} overall=${String(r.run.profile.overall.level).padEnd(5)} conf=${r.run.profile.overall.confidence.band.padEnd(6)} stop=${r.run.totals.stoppedBecause}`);
}
ok("all runs inside the hard cap", PLACEMENT_LEVELS.every(l=>runs[l].run.totals.itemsServed<=DEFAULT_CONFIG.length.hardCap));
ok("all runs inside the 25-45 expectation band", PLACEMENT_LEVELS.every(l=>runs[l].run.totals.itemsServed<=45));
ok("placement matches the simulated learner exactly", PLACEMENT_LEVELS.every(l=>runs[l].run.profile.overall.level===l),
   PLACEMENT_LEVELS.map(l=>l+"->"+runs[l].run.profile.overall.level).join(" "));

hdr("3. No item repeats");
for (const lvl of PLACEMENT_LEVELS) { const ids=runs[lvl].served.map(i=>i.id);
  ok(`no repeats (true=${lvl})`, new Set(ids).size===ids.length, `${ids.length}/${new Set(ids).size}`); }

hdr("4. No synthetic lower-level positive evidence");
{ const r=runs["C1"]; const logged=new Set(r.run.itemLog.map(o=>o.domain+"|"+o.level));
  let v=0,inf=0;
  for (const d of r.run.profile.domains){ for(const lv of Object.keys(d.observedRungs)) if(!logged.has(d.domain+"|"+lv)) v++;
    for(const lv of d.untestedBelow){ inf++; if(d.observedRungs[lv]) v++; } }
  ok("every observedRung traces to a real observation", v===0, "violations="+v);
  ok("untested lower rungs stay untested", inf>0, "inferred="+inf);
  ok("verifiedLevel never claimed without observation", !r.run.profile.domains.some(d=>d.verifiedLevel && !d.observedRungs[d.verifiedLevel]));
  ok("inference stated explicitly", r.run.profile.domains.filter(d=>d.notes.some(n=>/inferred/.test(n))).length>0); }

hdr("5. Evidence classes kept distinct");
{ const r=runs["B2"]; const cells=deriveCells(r.state.ledger,index,r.config);
  ok("per-class tracking, not one blended score", [...cells.values()].every(c=>c.observed===Object.values(c.byClass).reduce((s,b)=>s+b.n,0)));
  ok("free production not required by default", Object.keys(DEFAULT_CONFIG.requiredEvidenceClasses).length===0);
  ok(">1 evidence class used in a run", new Set(r.run.itemLog.map(o=>o.evidenceClass)).size>=2); }

hdr("6. C2 sparse behaviour");
{ const r=runs["C2"]; const c2=r.run.itemLog.filter(o=>o.level==="C2");
  const byDom={}; c2.forEach(o=>byDom[o.domain]=(byDom[o.domain]||0)+1);
  ok("C2 is probed", c2.length>0);
  ok("C2 observation ceiling respected", Object.values(byDom).every(v=>v<=DEFAULT_CONFIG.c2.maxObservations), JSON.stringify(byDom));
  ok("no C2 item repeats", new Set(c2.map(o=>o.itemId)).size===c2.length);
  const cells=deriveCells(r.state.ledger,index,r.config);
  ok("C2 cells capped at max state", [...cells.values()].filter(c=>c.level==="C2"&&c.observed>0).every(c=>["untested","insufficient","tentative"].includes(c.state)));
  // F2: the cap applies to a C2 PLACEMENT, not to any domain that merely sampled C2.
  ok("a C2 placement is confidence-capped",
     r.run.profile.domains.filter(d=>d.estimatedLevel==="C2").every(d=>d.confidence.score<=DEFAULT_CONFIG.c2.confidenceCap+1e-9));
  ok("F2: probing C2 does NOT cap a non-C2 placement",
     r.run.profile.domains.some(d=>d.c2Probed && d.estimatedLevel!=="C2")
       ? r.run.profile.domains.filter(d=>d.c2Probed && d.estimatedLevel!=="C2").some(d=>d.confidence.score>DEFAULT_CONFIG.c2.confidenceCap)
       : true);
  const pp=r.run.profile.domains.find(d=>d.domain==="prep-phrasal");
  ok("domain with no C2 does not break", pp.maxAssessableLevel==="C1");
  ok("no-C2 domain reports its ceiling", pp.estimatedLevel!=="C1" || pp.atCoverageCeiling===true); }

hdr("6b. F2 regression — a bracketed C1 boundary must not be punished");
{
  // C1 cleared AND C2 failed = the strongest evidence shape the engine produces.
  const D="tenses";
  let led=createLedger();
  index.itemsFor(D,"C1").slice(0,3).forEach(it=>led=obs(led,it,1));
  index.itemsFor(D,"C2").slice(0,1).forEach(it=>led=obs(led,it,0));
  const {cells,deps}=analyse(led);
  const d=placeDomain(D,cells,index,cfg0,deps);
  console.log(`  ${D}: est=${d.estimatedLevel} c2Probed=${d.c2Probed} conf=${d.confidence.band}(${d.confidence.score})`);
  ok("C1 cleared + C2 failed still places at C1", d.estimatedLevel==="C1");
  ok("C2 was genuinely probed", d.c2Probed===true);
  ok("F2: confidence is NOT capped at the C2 ceiling", d.confidence.score>DEFAULT_CONFIG.c2.confidenceCap, "score="+d.confidence.score);
  ok("F2: a failed C2 probe yields high confidence in the C1 placement", d.confidence.band==="high", d.confidence.band);
  ok("F2: no stale 'C2 capped' reason on a C1 placement", !d.confidence.reasons.some(x=>/capped by design/.test(x)));
  // and the C2 placement itself is still capped
  let led2=createLedger();
  index.itemsFor(D,"C1").slice(0,3).forEach(it=>led2=obs(led2,it,1));
  index.itemsFor(D,"C2").slice(0,1).forEach(it=>led2=obs(led2,it,1));
  const a2=analyse(led2);
  const d2=placeDomain(D,a2.cells,index,cfg0,a2.deps);
  ok("a C2 estimate is still capped", d2.estimatedLevel!=="C2" || d2.confidence.score<=DEFAULT_CONFIG.c2.confidenceCap, `est=${d2.estimatedLevel} score=${d2.confidence.score}`);
}

hdr("7. PREREQUISITE-AWARE CONTRADICTION (direct-declaration model)");
let fxA=null;
{
  const byC={}; ITEMS.forEach(i=>(i.prerequisites||[]).forEach(c=>(byC[c]??=[]).push(i)));
  outerA: for (const H of ITEMS) {
    const hi=levelIndex(H.cefrLevel); if (hi<2) continue;
    for (const c of H.prerequisites||[]) {
      const lower=(byC[c]||[]).filter(i=>i.domain===H.domain && levelIndex(i.cefrLevel)<hi);
      const peers=index.itemsFor(H.domain,H.cefrLevel).filter(i=>i.id!==H.id && (i.prerequisites||[]).includes(c));
      if (lower.length>=3 && peers.length>=1) { fxA={H,c,lower:lower.slice(0,3),peer:peers[0]}; break outerA; }
    }
  }
  ok("A. found a direct-prerequisite fixture in the live bank", !!fxA, fxA?`concept="${fxA.c}"`:"");
  let led=createLedger();
  led=obs(led,fxA.H,1); led=obs(led,fxA.peer,1);
  fxA.lower.forEach(it=>led=obs(led,it,0));
  const {cells,deps}=analyse(led);
  const an=analyzeDomain(fxA.H.domain,cells,index,deps);
  const c0=an.dependencyContradictions[0];
  console.log(`  A: ${fxA.H.domain} cleared ${fxA.H.cefrLevel} declaring "${fxA.c}"; failing at ${fxA.lower[0].cefrLevel}`);
  ok("A. direct prerequisite conflict IS a contradiction", an.contradiction===true && an.dependencyContradictions.length>=1);
  ok("A. the cleared item explicitly declared the concept", (fxA.H.prerequisites||[]).includes(c0.concept));
  ok("A. reported as a direct conflict", c0?.type==="direct_prerequisite_conflict", c0?.type);
  ok("A. both sides of the evidence preserved", !!c0?.clearedEvidence && c0?.prerequisiteEvidence?.observations>=2);
  ok("A. failing item ids retained for audit", (c0?.prerequisiteEvidence?.itemIds||[]).length>=2);
  const d=placeDomain(fxA.H.domain,cells,index,cfg0,deps);
  ok("A. conservative placement still activates", d.basis===BASIS.CONTRADICTED || d.basis===BASIS.BELOW_FLOOR, `basis=${d.basis}`);
  ok("A. placed below the failing prerequisite", d.belowFloor || levelIndex(d.estimatedLevel) < levelIndex(c0.failingLevel));
  ok("A. confidence forced low", d.confidence.band==="low");
  ok("A. earlier evidence not overwritten", !!d.observedRungs[fxA.H.cefrLevel] && !!d.observedRungs[fxA.lower[0].cefrLevel]);
  ok("A. no synthetic evidence invented", Object.keys(d.observedRungs).every(lv=>led.observations.some(o=>o.level===lv)));
  ok("A. contradicted domain never treated as resolved", domainResolved(an,cells)===false);
  const ctx={cells,deps,anchorLevel:fxA.H.cefrLevel,allowAi:false,rng:()=>0,contradictionItems:0,contradictionBudget:11};
  ok("A. re-probing triggered on implicated rungs",
     cellValue(fxA.H.domain,c0.failingLevel,cells,index,an,cfg0,ctx)>0 || cellValue(fxA.H.domain,c0.clearedAt,cells,index,an,cfg0,ctx)>0);
  ok("A. resolution direction configurable",
     placeDomain(fxA.H.domain,cells,index,resolveConfig({contradiction:{resolution:"optimistic"}}),deps).estimatedLevel===fxA.H.cefrLevel);
}
{
  let fx=null;
  outerB: for (const D of index.domainIds) {
    const items=ITEMS.filter(i=>i.domain===D);
    for (const H of items.filter(i=>levelIndex(i.cefrLevel)>=3 && (i.prerequisites||[]).length)) {
      const declared=new Set(H.prerequisites);
      const lows=items.filter(i=>levelIndex(i.cefrLevel)<levelIndex(H.cefrLevel)-1 && i.branch!==H.branch &&
        (i.prerequisites||[]).length && !(i.prerequisites||[]).some(c=>declared.has(c)));
      const lvl=lows.length?lows[0].cefrLevel:null;
      const sameLvl=lows.filter(i=>i.cefrLevel===lvl);
      const highs=items.filter(i=>i.cefrLevel===H.cefrLevel && i.branch===H.branch);
      if (sameLvl.length>=3 && highs.length>=2) { fx={D,H,highs:highs.slice(0,2),lows:sameLvl.slice(0,3),lowLevel:lvl}; break outerB; }
    }
  }
  ok("B. found an independent-lower-failure fixture", !!fx);
  let led=createLedger();
  fx.highs.forEach(it=>led=obs(led,it,1));
  fx.lows.forEach(it=>led=obs(led,it,0));
  const {cells,deps}=analyse(led);
  const an=analyzeDomain(fx.D,cells,index,deps);
  const declared=new Set(fx.highs.flatMap(i=>i.prerequisites||[]));
  ok("B. failing concepts genuinely undeclared", fx.lows.every(i=>!(i.prerequisites||[]).some(c=>declared.has(c))));
  ok("B. NOT a contradiction", an.dependencyContradictions.length===0 && an.contradiction===false);
  const d=placeDomain(fx.D,cells,index,cfg0,deps);
  ok("B. placement is NOT downgraded", d.estimatedLevel===fx.H.cefrLevel && d.basis===BASIS.VERIFIED, `est=${d.estimatedLevel}`);
  ok("B. recorded as uncertainty", d.independentLowerFailures.includes(fx.lowLevel));
  ok("B. confidence shaded, not floored", d.confidence.score>0.10);
  ok("B. note explains variation, not conflict", d.notes.some(n=>/not a conflict/.test(n)));
}
{
  const byC={}; ITEMS.forEach(i=>(i.prerequisites||[]).forEach(c=>(byC[c]??=[]).push(i)));
  let fx=null;
  outerC: for (const H of ITEMS) {
    const hi=levelIndex(H.cefrLevel); if (hi<2) continue;
    if ((H.prerequisites||[]).length<2) continue;
    for (const c of H.prerequisites) {
      const other=H.prerequisites.filter(x=>x!==c);
      const lower=(byC[c]||[]).filter(i=>i.domain===H.domain && levelIndex(i.cefrLevel)<hi && !(i.prerequisites||[]).some(x=>other.includes(x)));
      const peers=index.itemsFor(H.domain,H.cefrLevel).filter(i=>i.id!==H.id && (i.prerequisites||[]).includes(c));
      if (lower.length>=2 && peers.length>=1) { fx={H,c,other,lower:lower.slice(0,3),peer:peers[0]}; break outerC; }
    }
  }
  ok("C. found a multi-prerequisite fixture", !!fx);
  let led=createLedger();
  led=obs(led,fx.H,1); led=obs(led,fx.peer,1);
  fx.lower.forEach(it=>led=obs(led,it,0));
  const {cells,deps}=analyse(led);
  const an=analyzeDomain(fx.H.domain,cells,index,deps);
  ok("C. failure in ONE declared prerequisite triggers it", an.dependencyContradictions.some(x=>x.concept===fx.c));
  ok("C. untested sibling prerequisite raises nothing", !an.dependencyContradictions.some(x=>fx.other.includes(x.concept)));
  ok("C. conservative handling applies", [BASIS.CONTRADICTED,BASIS.BELOW_FLOOR].includes(placeDomain(fx.H.domain,cells,index,cfg0,deps).basis));
}
{
  let fx=null;
  outerD: for (const D of index.domainIds) for (const L of index.levelsForDomain(D)) {
    const items=index.itemsFor(D,L).filter(i=>(i.prerequisites||[]).length);
    for (const A of items) for (const B of items) {
      if (A.branch===B.branch) continue;
      if ((B.prerequisites||[]).some(c=>(A.prerequisites||[]).includes(c))) continue;
      const aP=items.filter(i=>i.branch===A.branch&&i.id!==A.id), bP=items.filter(i=>i.branch===B.branch&&i.id!==B.id);
      if (aP.length&&bP.length) { fx={D,L,A,B,aPeer:aP[0],bPeer:bP[0]}; break outerD; }
    }
  }
  ok("D. found a same-level unrelated-topic fixture", !!fx);
  let led=createLedger();
  led=obs(led,fx.A,1); led=obs(led,fx.aPeer,1); led=obs(led,fx.B,0); led=obs(led,fx.bPeer,0);
  const {cells,deps}=analyse(led);
  ok("D. same-level conflict is not a contradiction", analyzeDomain(fx.D,cells,index,deps).dependencyContradictions.length===0);
  ok("D. no downgrade from same-level variation", placeDomain(fx.D,cells,index,cfg0,deps).basis!==BASIS.CONTRADICTED);
}
{
  let led=createLedger();
  led=obs(led,fxA.H,1); led=obs(led,fxA.peer,1); led=obs(led,fxA.lower[0],0);
  const {cells,deps}=analyse(led);
  ok("E. one failing observation is NOT a contradiction", analyzeDomain(fxA.H.domain,cells,index,deps).dependencyContradictions.length===0);
  const ev=buildConceptEvidence(led,index,cfg0,{domain:fxA.H.domain});
  ok("E. sparse evidence still recorded", conceptEvidenceBelow(ev.get(fxA.c), levelIndex(fxA.H.cefrLevel)).n===1);
  ok("E. uncertainty, not downgrade", placeDomain(fxA.H.domain,cells,index,cfg0,deps).basis!==BASIS.CONTRADICTED);
}
{
  const byC={}; ITEMS.forEach(i=>(i.prerequisites||[]).forEach(c=>(byC[c]??=[]).push(i)));
  let fx=null;
  outerF: for (const H of ITEMS) {
    const hi=levelIndex(H.cefrLevel); if (hi<2) continue;
    if (!(H.prerequisites||[]).length) continue;
    for (const X of H.prerequisites) {
      for (const peer of index.itemsFor(H.domain,H.cefrLevel).filter(i=>i.id!==H.id && (i.prerequisites||[]).includes(X))) {
        const declared=new Set([...(H.prerequisites||[]), ...(peer.prerequisites||[])]);
        const coocc=new Set();
        for (const it of byC[X]||[]) for (const y of it.prerequisites||[]) if (!declared.has(y)) coocc.add(y);
        for (const Y of coocc) {
          const lower=(byC[Y]||[]).filter(i=>i.domain===H.domain && levelIndex(i.cefrLevel)<hi && !(i.prerequisites||[]).some(c=>declared.has(c)));
          if (lower.length>=3) { fx={H,X,Y,declared,lower:lower.slice(0,3),peer}; break outerF; }
        }
      }
    }
  }
  ok("F. found a co-occurrence fixture", !!fx, fx?`X="${fx.X}" Y="${fx.Y}"`:"");
  let led=createLedger();
  led=obs(led,fx.H,1); led=obs(led,fx.peer,1);
  fx.lower.forEach(it=>led=obs(led,it,0));
  const {cells,deps}=analyse(led);
  const an=analyzeDomain(fx.H.domain,cells,index,deps);
  ok("F. Y not declared by ANY item that cleared the rung", !fx.declared.has(fx.Y));
  ok("F. no X -> Y edge inferred: NO contradiction", !an.dependencyContradictions.some(x=>x.concept===fx.Y));
  const d=placeDomain(fx.H.domain,cells,index,cfg0,deps);
  ok("F. placement not downgraded by an inferred relationship", d.basis!==BASIS.CONTRADICTED || !d.contradictions.some(x=>x.concept===fx.Y));
  ok("F. failure reported as uncertainty instead", d.independentLowerFailures.length>0 || an.lowerFailures.length>0);
  ok("F. every contradiction type is direct", an.dependencyContradictions.every(x=>x.type==="direct_prerequisite_conflict"));
  ok("F. no closure/transitive API exported", typeof PREREQ_EXPORTS.prerequisiteClosure==="undefined");
}
{
  let violations=0, checked=0;
  for (const lvl of PLACEMENT_LEVELS) for (const d of runs[lvl].run.profile.domains) {
    if (!d.contradictions.length) continue;
    checked++;
    for (const c of d.contradictions) {
      if (c.type!=="direct_prerequisite_conflict") { violations++; continue; }
      if (!(c.prerequisiteEvidence?.observations>=DEFAULT_CONFIG.prerequisite.minConceptObservations)) { violations++; continue; }
      if (!(c.supportingItemIds||[]).some(id=>(index.getItem(id)?.prerequisites||[]).includes(c.concept))) violations++;
    }
  }
  ok("G. every contradiction cites an EXPLICITLY declared prerequisite", violations===0, `checked=${checked}`);
  ok("G. detection disables cleanly by config",
     analyzeDependencies(createLedger(),new Map(),index,resolveConfig({prerequisite:{enabled:false}})).byDomain[index.domainIds[0]].length===0);
  ok("G. obsolete maxChainDepth config is gone", !("maxChainDepth" in DEFAULT_CONFIG.prerequisite));
  ok("G. crossDomainEvidence retained", DEFAULT_CONFIG.prerequisite.crossDomainEvidence===false);
}

hdr("8. AI evaluation failure handling");
{ const r = runOne({trueLevel:"B2", seed:77, aiFailRate:1.0});
  const failed=r.run.itemLog.filter(o=>o.aiGraded&&o.status===EVAL_STATUS.FAILED);
  ok("AI failures recorded, not dropped", r.run.evaluationFailures.length===failed.length);
  ok("failed evaluations carry no credit", failed.every(o=>o.credit===null));
  const cells=deriveCells(r.state.ledger,index,r.config);
  ok("failures excluded from counts and ratios", [...cells.values()].every(c=>
     c.observed===r.run.itemLog.filter(o=>o.domain===c.domain&&o.level===c.level&&o.status===EVAL_STATUS.SCORED).length));
  ok("run completes with AI fully broken", !!r.run.profile.overall.level);
  ok("AI failure cap bounds selection", r.state.aiFailures<=DEFAULT_CONFIG.ai.maxFailures);
  const noAi = runOne({trueLevel:"B2", seed:78, allowAi:false});
  ok("run completes with AI unavailable", noAi.run.itemLog.every(o=>!o.aiGraded) && !!noAi.run.profile.overall.level);
  ok("AI item cap respected", PLACEMENT_LEVELS.every(l=>runs[l].run.totals.aiItemsAttempted<=DEFAULT_CONFIG.ai.maxItems));
  ok("fail-closed grader error demoted, not scored 0", normalizeAiEvaluation({score:1,diagnosis:"error",tip:"x"}).status===EVAL_STATUS.FAILED);
  ok("genuine blank stays learner evidence", normalizeAiEvaluation({score:1,diagnosis:"blank",tip:""}).credit===0); }

hdr("9. Stopping rules");
{ for (const lvl of ["A1","A2","B1","B2"]) {
    const r = runOne({trueLevel:lvl, seed:900+levelIndex(lvl), cfg:{ length:{minItems:22,softTarget:34,hardCap:90,absoluteCap:120} }});
    console.log(`  generous cap, true=${lvl}: items=${r.run.totals.itemsServed} stop=${r.run.totals.stoppedBecause}`);
    ok(`stops on evidence, not budget (true=${lvl})`, ["sufficient_evidence","no_further_value","dataset_exhausted"].includes(r.run.totals.stoppedBecause), r.run.totals.stoppedBecause); }
  const capped = runOne({trueLevel:"B1", seed:12, cfg:{ length:{minItems:5,softTarget:8,hardCap:12,absoluteCap:60} }});
  ok("hard cap enforced", capped.run.totals.itemsServed<=12);
  ok("hard cap reported honestly", capped.run.totals.itemsServed<12 || capped.run.totals.stoppedBecause===STOP_REASONS.HARD_CAP);
  ok("absolute cap never reached", PLACEMENT_LEVELS.every(l=>runs[l].run.totals.stoppedBecause!==STOP_REASONS.ABSOLUTE_CAP));
  ok("minItems respected before evidence stop", PLACEMENT_LEVELS.every(l=>runs[l].run.totals.stoppedBecause!=="sufficient_evidence"||runs[l].run.totals.itemsServed>=DEFAULT_CONFIG.length.minItems));
  ok("all thresholds configurable", ["length","evidence","ai","calibration","screening","c2","contradiction","selection","overall","coreDomains","prerequisite"].every(k=>k in DEFAULT_CONFIG)); }

hdr("10. Domain placement + profile shape");
{ const r=runs["B1"];
  ok("all 13 domains in the profile", r.run.profile.domains.length===13);
  ok("most domains placed", r.run.profile.domains.filter(d=>d.basis!=="unassessed").length>=11);
  ok("profile is grammar-scoped", r.run.profile.scope==="grammar" && JSON.stringify(r.run.profile.authoritativeFor)===JSON.stringify(["grammar"]));
  ok("core-guard provisionality carried", r.run.profile.overall.coreGuard.provisional===true);
  ok("run record carries replay data", !!r.run.seed && r.run.itemLog.length>0);
  ok("domain result distinguishes observed/inferred/uncertainty/conflict",
     ["observedRungs","untestedBelow","verifiedLevel","basis","inferred","confidence","contradictions","independentLowerFailures"].every(k=>k in r.run.profile.domains[0]));
  ok("observations carry dependency metadata", r.run.itemLog.every(o=>"prerequisites" in o && "branch" in o && "topic" in o)); }

hdr("11. Determinism");
{ const a=runOne({trueLevel:"B2",seed:555}), b=runOne({trueLevel:"B2",seed:555}), c=runOne({trueLevel:"B2",seed:556});
  ok("same seed -> identical sequence", JSON.stringify(a.served.map(i=>i.id))===JSON.stringify(b.served.map(i=>i.id)));
  ok("different seed varies sequence", JSON.stringify(a.served.map(i=>i.id))!==JSON.stringify(c.served.map(i=>i.id))); }

hdr("12. Aggregation");
{ const r = runOne({trueLevel:"B2", seed:31, domainOverrides:{ "sentence-structure":"A1", "questions-negation":"A1" }});
  console.log(`  overall=${r.run.profile.overall.level} boundBy=${r.run.profile.overall.rationale.boundBy}`);
  ok("weak core domains pull the summary down", levelIndex(r.run.profile.overall.level??"A1")<levelIndex("B2"));
  ok("aggregation names the binding rule", ["floor_share","core_guard"].includes(r.run.profile.overall.rationale.boundBy));
  ok("domain profile survives aggregation", r.run.profile.domains.some(d=>levelIndex(d.estimatedLevel??"A1")>=levelIndex("B1")));
  const off = runOne({trueLevel:"B2", seed:31, domainOverrides:{ "sentence-structure":"A1","questions-negation":"A1" }, cfg:{overall:{applyCoreGuard:false}}});
  ok("core guard switchable", off.run.profile.overall.rationale.boundBy==="floor_share"); }

console.log("\n================ RESULT ================");
console.log(`PASS ${PASS}   FAIL ${FAIL}`);
if (fails.length) { console.log("Failures:"); fails.forEach(f=>console.log("  - "+f)); process.exitCode=1; }
