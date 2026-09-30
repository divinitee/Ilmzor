import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';

// Server-side AI gateway. Every InvokeLLM call the app makes on behalf of a
// learner goes through here so the plan's daily quota is enforced with the
// service role, not in the browser. Prompts are built here from narrow,
// task-specific inputs — there is no generic "run this prompt" action.

const PLAN_LIMITS = [
  { id: 'free', name: 'free plan', limit: 3 },
  { id: 'learner', name: 'learner plan', limit: 25 },
  { id: 'vip', name: 'vip plan', limit: 300, displayUnlimited: true },
];
const resolvePlan = (v) => {
  if (!v) return PLAN_LIMITS[0];
  const s = String(v).toLowerCase();
  return PLAN_LIMITS.find((p) => p.id === s || p.name === s || s.includes(p.id)) || PLAN_LIMITS[0];
};
const today = () => new Date().toISOString().slice(0, 10);
const str = (v, max = 1000) => String(v ?? '').slice(0, max);
const clamp = (v) => Math.max(0, Math.min(100, Math.round(Number(v) || 0)));

async function getStatus(sr, user, scope) {
  if (user.role === 'admin') return { allowed: true, limit: null, used: 0, remaining: null, unlimited: true };
  let planName = null;
  if (scope === 'teacher' && user.teacher_status === 'approved') {
    planName = 'vip';
  } else {
    let subs = await sr.entities.StudentSubscription.filter({ phone: user.email });
    if (subs.length === 0) subs = await sr.entities.StudentSubscription.filter({ created_by_id: user.id });
    planName = subs?.[0]?.plan || null;
  }
  const plan = resolvePlan(planName);
  const logs = await sr.entities.AiUsageLog.filter({ user_email: user.email, date: today() });
  const used = logs?.[0]?.count || 0;
  return { allowed: used < plan.limit, limit: plan.limit, used, remaining: Math.max(0, plan.limit - used), unlimited: !!plan.displayUnlimited, _log: logs?.[0] || null };
}

async function consume(sr, user, status) {
  if (user.role === 'admin') return status;
  if (status._log) {
    await sr.entities.AiUsageLog.update(status._log.id, { count: (status._log.count || 0) + 1 });
  } else {
    await sr.entities.AiUsageLog.create({ user_email: user.email, user_id: user.id, user_name: user.full_name || '', date: today(), count: 1 });
  }
  const used = status.used + 1;
  const remaining = Math.max(0, status.limit - used);
  return { ...status, used, remaining, allowed: remaining > 0 };
}

const publicStatus = (s) => { const { _log, ...rest } = s; return rest; };

function buildTask(action, p) {
  if (action === 'gradeSentence') {
    const cfg = { label: str(p.label, 40), target: str(p.target, 200), minWords: Number(p.minWords) || 3 };
    const d = p.difficulty;
    const theme = str(p.theme, 80);
    const themeWords = (Array.isArray(p.themeWords) ? p.themeWords : []).slice(0, 20).map((w) => str(w, 40));
    return {
      prompt: [
        `You are a strict, calibrated English-language examiner for ${cfg.label.toUpperCase()} learners.`,
        `Theme words the student may use: ${themeWords.join(', ')}.`,
        `Level target: the student must write ${cfg.target}. Minimum ${cfg.minWords} words.`,
        `The student submitted: "${str(p.sentence, 600)}".`,
        ``,
        `Grade STRICTLY and calibrated to this level:`,
        d === 'proficient'
          ? `PROFICIENT: require a complex/compound-complex sentence with a subordinate clause (because/although/while/when/if/that/which). A simple sentence must score low on grammar and creativity even if correct.`
          : d === 'advanced'
            ? `ADVANCED: require a compound or complex sentence with a linking word. A correct but merely simple sentence caps grammar at ~55 and creativity at ~40.`
            : d === 'intermediate'
              ? `INTERMEDIATE: require a complete sentence of 5+ words. Shorter or fragmentary sentences score lower.`
              : `BEGINNER: accept a simple correct sentence (3+ words). Be encouraging but still require a real verb.`,
        ``,
        `Word-lists / synonyms with no verb, repeated words, or off-theme gibberish must score 0-15 on grammar and creativity.`,
        ``,
        `Grammar rubric (be strict): 90-100 flawless; 70-89 minor errors; 40-69 several mistakes; 15-39 fragment; 0-14 not a sentence.`,
        `Relevance: how many words genuinely fit the theme "${theme}".`,
        `Creativity: originality and variety. Word lists / trivial statements score 0-15.`,
        ``,
        `Each score is a whole number 0-100. Then give ONE short, specific, encouraging tip in English (max 15 words). Reply in JSON only.`,
      ].join('\n'),
      schema: { type: 'object', properties: { grammar: { type: 'number' }, relevance: { type: 'number' }, creativity: { type: 'number' }, tip: { type: 'string' } } },
      shape: (r) => ({ grammar: clamp(r.grammar), relevance: clamp(r.relevance), creativity: clamp(r.creativity), tip: r.tip || 'Keep practising!' }),
    };
  }
  if (action === 'checkTranslation') {
    const w = p.word || {};
    const shown = p.nativeKey === 'russian'
      ? `Russian word "${str(w.russian, 100)}" (Uzbek: "${str(w.uzbek, 100)}")`
      : `Uzbek word "${str(w.uzbek, 100)}" (Russian: "${str(w.russian, 100)}")`;
    return {
      prompt: `The correct English translation of the ${shown} is "${str(w.english, 100)}". A student wrote: "${str(p.answer, 200)}". Is this translation correct? Consider minor typos (1-2 chars) as correct. Reply with JSON: { "correct": true } or { "correct": false }. Do NOT give partial credit.`,
      schema: { type: 'object', properties: { correct: { type: 'boolean' } } },
      shape: (r) => ({ correct: !!r.correct }),
    };
  }
  if (action === 'gradeDefinition') {
    const w = p.word || {};
    const english = str(w.english, 100);
    return {
      prompt: [
        `You are a strict but fair English vocabulary examiner for ${str(p.level, 5) || 'B1'}-level learners.`,
        `Target word (English): "${english}" — Uzbek: "${str(w.uzbek, 100)}".`,
        `Reference definition: "${str(w.definition, 400)}".`,
        `The student rewrote the definition in their own words:`,
        `"${str(p.answer, 800)}".`,
        ``,
        `Evaluate the student's text ONLY on meaning, not wording. A paraphrase that uses completely different words but keeps the correct meaning is EXCELLENT (accuracy 90-100). A definition that is factually wrong scores 0-20 on accuracy.`,
        ``,
        `Score these criteria each 0-100 (whole numbers):`,
        `- accuracy: does it convey the CORRECT meaning of "${english}"? (synonyms/paraphrase = high; wrong meaning = low)`,
        `- completeness: does it capture the key idea, not just a vague synonym?`,
        `- own_words: did the student paraphrase rather than copy the reference almost word-for-word? (near-copy = 0-30)`,
        ``,
        `Then reward XP (integer 1-5) from the AVERAGE of the three scores:`,
        `>=85 → 5, 70-84 → 4, 55-69 → 3, 35-54 → 2, <35 → 1.`,
        `Minimum ${Number(p.minWords) || 3} words expected; much shorter answers subtract ~10 from each score.`,
        `Also give ONE concrete, specific tip (max 15 words) pointing out exactly what to improve — not generic praise.`,
        `Reply as JSON only.`,
      ].join('\n'),
      schema: { type: 'object', properties: { accuracy: { type: 'number' }, completeness: { type: 'number' }, own_words: { type: 'number' }, xp: { type: 'number' }, tip: { type: 'string' } } },
      shape: (r) => ({ accuracy: clamp(r.accuracy), completeness: clamp(r.completeness), own_words: clamp(r.own_words), xp: Math.max(1, Math.min(5, Math.round(Number(r.xp) || 0))), tip: r.tip || '' }),
    };
  }
  if (action === 'gradeVocabArticulation') {
    const w = p.word || {};
    return {
      prompt: [
        `You are a strict but fair English vocabulary examiner.`,
        `Target word: "${str(w.english, 100)}".`,
        `Dictionary definition: "${str(w.definition, 400)}".`,
        `The student's own-words explanation: "${str(p.answer, 800)}".`,
        ``,
        `Evaluate ONLY on meaning, not wording. A paraphrase using completely different`,
        `words that keeps the correct meaning is EXCELLENT (accuracy 90-100). A definition`,
        `that is factually wrong, off-topic, or gibberish scores 0-20 on accuracy.`,
        ``,
        `CRITICAL CHECK FIRST: this is a test of the student's ability to explain the word`,
        `IN ENGLISH. If the answer is not written in English — including a transliteration,`,
        `loanword, or direct translation of the target word itself into another language or`,
        `script (e.g. writing the Russian/Uzbek cognate of "compensate" instead of explaining`,
        `it in English) — this FAILS the exercise regardless of whether the underlying concept`,
        `is correct. Score accuracy 0-10, completeness 0-10, own_words 0, and use diagnosis`,
        `"not_in_english" for this case, skipping all other checks below.`,
        ``,
        `Score 0-100 each:`,
        `- accuracy: how close is the meaning to the dictionary definition above?`,
        `- completeness: does it capture the key idea, not just a vague gesture at it?`,
        `- own_words: did the student paraphrase rather than near-copy the definition word-for-word? (near-copy = 0-30)`,
        ``,
        `Also classify the answer with ONE diagnosis tag, exactly one of:`,
        `"correct" (good answer), "vague" (too imprecise to confirm understanding),`,
        `"wrong_meaning" (confidently states an incorrect meaning),`,
        `"near_copy" (just restates the definition with minor word swaps),`,
        `"not_in_english" (answer is not a genuine English-language explanation — see check above),`,
        `"off_topic" (doesn't address the word's meaning at all / gibberish).`,
        ``,
        `Give ONE concrete, specific tip (max 15 words) — not generic praise.`,
        `Reply as JSON only.`,
      ].join('\n'),
      schema: { type: 'object', properties: { accuracy: { type: 'number' }, completeness: { type: 'number' }, own_words: { type: 'number' }, diagnosis: { type: 'string' }, tip: { type: 'string' } } },
      shape: (r) => ({ accuracy: clamp(r.accuracy), completeness: clamp(r.completeness), own_words: clamp(r.own_words), diagnosis: r.diagnosis || 'correct', tip: r.tip || '' }),
    };
  }
  if (action === 'gradeGrammarConstruction') {
    const t = p.task || {};
    return {
      prompt: [
        `You are a strict English grammar examiner grading ONE sentence.`,
        `Task instruction given to the student: "${str(t.instruction, 500)}"`,
        `Required grammatical element: "${str(t.requiredElement, 200)}"`,
        `Grammar topic being tested: "${str(t.topic, 200)}"`,
        `The student's sentence: "${str(p.answer, 800)}"`,
        ``,
        `CRITICAL CHECK FIRST: if the sentence is not written in English (e.g. written in`,
        `another language, or is just a translated/transliterated version of an English`,
        `sentence), this FAILS the exercise. Score structureUsed 0, correctness 0,`,
        `naturalness 0, and use diagnosis "not_in_english", skipping all checks below.`,
        ``,
        `Score 0-100 each, based on actual grammatical rules, not style preference:`,
        `- structureUsed: did the sentence genuinely use the required element correctly`,
        `  (e.g. a real subordinating conjunction like "because/although/when", NOT a`,
        `  coordinating conjunction like "and/but/so" used instead)? 0 if not used at all.`,
        `- correctness: is the sentence grammatically well-formed (no fragment, no run-on`,
        `  or comma splice, correct verb forms, subject-verb agreement, punctuation)?`,
        `- naturalness: does it read like a sentence a fluent speaker would actually write,`,
        `  not a mechanical attempt to satisfy the rule?`,
        ``,
        `Also classify with ONE diagnosis tag, exactly one of:`,
        `"not_in_english" (see check above), "correct", "wrong_form" (used the wrong word form, e.g. an adjective instead of a`,
        `past participle, or a double comparative), "missing_element" (a required word was`,
        `left out, e.g. a missing article), "wrong_word_choice" (the wrong specific word for`,
        `the job, e.g. wrong preposition, wrong conjunction type, wrong quantifier),`,
        `"tense_error", "sentence_fragment", "run_on_or_comma_splice", "off_topic_or_blank".`,
        ``,
        `Give ONE concrete, specific tip (max 15 words) naming the exact issue — not generic praise.`,
        `Reply as JSON only.`,
      ].join('\n'),
      schema: { type: 'object', properties: { structureUsed: { type: 'number' }, correctness: { type: 'number' }, naturalness: { type: 'number' }, diagnosis: { type: 'string' }, tip: { type: 'string' } } },
      shape: (r) => ({ structureUsed: clamp(r.structureUsed), correctness: clamp(r.correctness), naturalness: clamp(r.naturalness), diagnosis: r.diagnosis || 'correct', tip: r.tip || '' }),
    };
  }
  if (action === 'analyticsReport') {
    const s = p.stats || {};
    const n = (v) => Number(v) || 0;
    const skills = (Array.isArray(p.skills) ? p.skills : []).slice(0, 12).map((k) => `${str(k.emoji, 8)} ${n(k.value)}`).join(', ');
    return {
      prompt: `You are an expert language-learning coach reviewing a student's progress data. Write a concise, motivating analytics report (3 short paragraphs). Use plain text, no markdown.
Data:
- Total quizzes completed: ${n(s.totalQuizzes)}
- Total words learned (correct answers): ${n(s.totalCorrect)}
- Average accuracy: ${n(s.accuracy)}%
- Current streak: ${n(s.streak)} days
- Current XP: ${n(s.xp)}
- Skill mastery (0-100): ${skills}

Highlight strengths, weakest skill to focus on, and 2 concrete next steps.`,
      schema: null,
      shape: (r) => ({ text: typeof r === 'string' ? r : JSON.stringify(r) }),
    };
  }
  return null;
}

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const sr = base44.asServiceRole;
    const body = await req.json().catch(() => ({}));
    const { action } = body;
    const scope = body.scope === 'teacher' ? 'teacher' : 'student';

    const status = await getStatus(sr, user, scope);
    if (action === 'status') return Response.json({ status: publicStatus(status) });

    if (action === 'consumeChatTurn') {
      if (!status.allowed) return Response.json({ blocked: true, status: publicStatus(status) });
      return Response.json({ status: publicStatus(await consume(sr, user, status)) });
    }

    const task = buildTask(action, body);
    if (!task) return Response.json({ error: 'Unknown action' }, { status: 400 });
    if (!status.allowed) return Response.json({ blocked: true, status: publicStatus(status) });

    const raw = await sr.integrations.Core.InvokeLLM(
      task.schema ? { prompt: task.prompt, response_json_schema: task.schema } : { prompt: task.prompt }
    );
    const next = await consume(sr, user, status);
    const result = task.shape(raw || {});
    // VT-6: the server's own grade is the progress evidence for AI-graded
    // games; progressApi reads these rows and never a browser-reported score.
    const round_id = str(body.round_id, 80);
    if (round_id && (action === 'gradeSentence' || action === 'gradeDefinition')) {
      const parts = action === 'gradeSentence' ? [result.grammar, result.relevance, result.creativity] : [result.accuracy, result.completeness, result.own_words];
      await sr.entities.AiGradedItem.create({
        user_email: user.email, round_id,
        task: action === 'gradeSentence' ? 'sentence' : 'definition',
        item_key: action === 'gradeSentence' ? 'sentence' : str(body.word?.english, 100).toLowerCase().replace(/\s+/g, ' ').trim(),
        word_id: str(body.word_id, 40) || undefined,
        score: Math.round(parts.reduce((a, b) => a + b, 0) / 3),
        // Skill Intelligence: keep the rubric's sub-scores, not just the average.
        sub_scores: action === 'gradeSentence'
          ? { grammar: (result as any).grammar, relevance: (result as any).relevance, creativity: (result as any).creativity }
          : { accuracy: (result as any).accuracy, completeness: (result as any).completeness, own_words: (result as any).own_words },
        rubric: action === 'gradeSentence' ? 'sentence.v1' : 'definition.v1',
      });
    }
    return Response.json({ result, status: publicStatus(next) });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}