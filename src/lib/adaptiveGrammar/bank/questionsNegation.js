import { domainBuilder, leg } from "@/lib/adaptiveGrammar/build";
const d = domainBuilder("questions-negation");
const A1 = leg("A1_MCQ"), A2 = leg("A2_MCQ"), B1 = leg("B1_MCQ"), B1O = leg("B1_OPEN_GRAMMAR");

export default [
  // ---------------- A1 ----------------
  d.mcq({ b: "yes-no", t: "do-question", L: "A1", diff: 1, focus: "Do for a present simple yes/no question", pre: ["auxiliary-do"],
    prompt: "______ you like coffee?", options: ["Are", "Does", "Do", "Is"], key: 2, why: "you + main verb → Do.", legacy: A1("______ you like coffee?") }),
  d.mcq({ b: "yes-no", t: "be-question", L: "A1", diff: 1, focus: "Is for a question with be", pre: ["be-auxiliary", "subject-auxiliary-inversion"],
    prompt: "______ she from Canada?", options: ["Does", "Is", "Do", "Are"], key: 1, why: "No main verb → be inverted.", legacy: A1("______ she from Canada?") }),
  d.mcq({ b: "yes-no", t: "does-question", L: "A1", diff: 2, focus: "Does with a third-person subject", pre: ["auxiliary-do", "third-person-s"],
    prompt: "______ he have a car?", options: ["Do", "Is", "Does", "Has"], key: 2, why: "Third person + main verb 'have' → Does.", legacy: A1("______ he have a car?") }),
  d.mcq({ b: "yes-no", t: "progressive-question", L: "A1", diff: 2, focus: "Are for a present continuous question", pre: ["be-auxiliary", "present-continuous"],
    prompt: "______ you watching TV?", options: ["Do", "Are", "Does", "Is"], key: 1, why: "-ing → be as auxiliary.", legacy: A1("______ you watching TV?") }),
  d.mcq({ b: "wh-questions", t: "what", L: "A1", diff: 1, focus: "What for a thing/name", pre: ["wh-words"],
    prompt: "______ is your name?", options: ["What", "Where", "Who", "When"], key: 0, why: "Asking a name → What.", legacy: A1("______ is your name?") }),
  d.mcq({ b: "wh-questions", t: "where", L: "A1", diff: 1, focus: "Where for place", pre: ["wh-words"],
    prompt: "______ do you live?", options: ["Who", "Where", "What", "How"], key: 1, why: "Place → Where.", legacy: A1("______ do you live?") }),
  d.mcq({ b: "wh-questions", t: "when", L: "A1", diff: 1, focus: "When for time", pre: ["wh-words"],
    prompt: "______ is your birthday?", options: ["Where", "Who", "When", "What"], key: 2, why: "Time → When.", legacy: A1("______ is your birthday?") }),
  d.mcq({ b: "wh-questions", t: "who", L: "A1", diff: 1, focus: "Who for a person", pre: ["wh-words"],
    prompt: "______ is that man?", options: ["Who", "Where", "When", "How"], key: 0, why: "Person → Who.", legacy: A1("______ is that man?") }),
  d.mcq({ b: "negation", t: "dont-negative", L: "A1", diff: 1, focus: "don't with I in the present simple negative", pre: ["auxiliary-do"],
    prompt: "I ______ like cold weather.", options: ["doesn't", "don't", "am not", "not"], key: 1, why: "I + main verb → don't.", legacy: A1("I ______ like cold weather.") }),
  d.order({ b: "wh-questions", t: "wh-do-order", L: "A1", diff: 2, focus: "Wh-word + auxiliary + subject + verb order", pre: ["wh-words", "auxiliary-do"],
    tokens: ["do", "where", "work", "you"], key: ["where", "do", "you", "work"], why: "Wh + do + subject + base verb." }),

  // ---------------- A2 ----------------
  d.mcq({ b: "wh-questions", t: "why", L: "A2", diff: 1, focus: "Why for reason", pre: ["wh-words"],
    prompt: "______ did you buy that jacket?", options: ["Why", "What", "Which", "Who"], key: 0, why: "Reason → Why.", legacy: A2("______ did you buy that jacket?") }),
  d.mcq({ b: "yes-no", t: "past-question", L: "A2", diff: 1, focus: "Did for a past simple question", pre: ["auxiliary-do", "past-simple"],
    prompt: "______ you see Tom at the party?", options: ["Did", "Have", "Were", "Do"], key: 0, why: "Past + main verb → Did.", legacy: A2("______ you see Tom at the party?") }),
  d.mcq({ b: "yes-no", t: "perfect-question", L: "A2", diff: 2, focus: "have as auxiliary in a present perfect question", pre: ["present-perfect", "subject-auxiliary-inversion"],
    prompt: "How long ______ you lived here?", options: ["do", "are", "have", "did"], key: 2, why: "Present perfect → have + subject + pp.", legacy: A2("How long ______ you lived here?") }),
  d.gap({ b: "wh-questions", t: "how-questions", L: "A2", diff: 2, focus: "How + adjective/adverb question phrases", pre: ["wh-words"],
    instr: "Complete each gap with ONE word.", source: "How ______ does the ticket cost? And how ______ is the journey — two hours?", key: ["much", "long"], why: "Price → how much; duration → how long." }),
  d.correct({ b: "wh-questions", t: "no-double-auxiliary", L: "A2", diff: 2, focus: "The main verb stays in the base form after did", pre: ["auxiliary-do", "past-simple"],
    source: "Where did you went last weekend?", key: "Where did you go last weekend?", why: "did + base form." }),
  d.mcq({ b: "subject-questions", t: "who-subject", L: "A2", diff: 3, focus: "Subject questions with who take no auxiliary do", pre: ["subject-questions", "auxiliary-do"],
    prompt: "______ this window? It was fine yesterday.", options: ["Who broke", "Who did break", "Who did broke", "Whom broke"], key: 0, why: "Who = subject → no 'did'." }),

  // ---------------- B1 ----------------
  d.mcq({ b: "indirect-questions", t: "reported-wh-order", L: "B1", diff: 2, focus: "Statement word order in an indirect question", pre: ["indirect-question-order", "reported-question-order"],
    prompt: "She asked me where ______.", options: ["did I live", "I lived", "do I live", "lived I"], key: 1, why: "No inversion after 'asked me where'.", legacy: B1("She asked me where ______."), overlaps: ["reported-speech"] }),
  d.mcq({ b: "indirect-questions", t: "if-whether", L: "B1", diff: 2, focus: "if/whether for an indirect yes/no question", pre: ["indirect-question-order"],
    prompt: "Could you tell me ______ the museum is open on Mondays?", options: ["that", "whether", "what", "is"], key: 1, why: "Indirect yes/no question → whether/if." }),
  d.order({ b: "indirect-questions", t: "polite-question-order", L: "B1", diff: 2, focus: "Indirect question keeps subject before verb", pre: ["indirect-question-order"],
    tokens: ["the", "know", "starts", "do", "you", "when", "film"], key: ["do", "you", "know", "when", "the", "film", "starts"], why: "Indirect clause is not inverted." }),
  d.mcq({ b: "negation", t: "negative-question-form", L: "B1", diff: 2, focus: "Contracted negative question form", pre: ["negative-questions", "auxiliary-do"],
    prompt: "______ you tell her about the change of plan?", options: ["Didn't", "Did not you", "Not did", "Do not"], key: 0, why: "Contracted negative question → Didn't you." }),
  d.mcq({ b: "tag-questions", t: "positive-statement-tag", L: "B1", diff: 2, focus: "Negative tag after a positive statement, matching the auxiliary", pre: ["tag-questions"],
    prompt: "You've finished the report, ______?", options: ["haven't you", "didn't you", "have you", "isn't it"], key: 0, why: "Positive statement with 'have' → haven't you." }),
  d.gap({ b: "tag-questions", t: "negative-statement-tag", L: "B1", diff: 2, focus: "Positive tag after a negative statement", pre: ["tag-questions"],
    instr: "Complete the gap with the correct question tag (two words).", source: "She doesn't eat meat, ______?", key: "does she", why: "Negative statement → positive tag." }),
  d.guided({ b: "indirect-questions", t: "polite-question-order", L: "B1", diff: 2, focus: "Productive indirect question with statement word order", pre: ["indirect-question-order"],
    prompt: "Write one indirect question beginning with 'Do you know...' or 'Could you tell me...'", required: "an indirect question with correct statement word order (no inversion) after 'Do you know...' or 'Could you tell me...'",
    legacy: B1O("Write one indirect question beginning with 'Do you know...' or 'Could you tell me...'") }),

  // ---------------- B2 ----------------
  d.mcq({ b: "negation", t: "negative-subject", L: "B2", diff: 2, focus: "A negative subject makes the verb positive (no double negative)", pre: ["negative-subjects", "no-not-none"],
    prompt: "______ of the candidates was suitable for the position.", options: ["None", "Not none", "Any", "Neither of them not"], key: 0, why: "Negative subject + positive verb." }),
  d.mcq({ b: "tag-questions", t: "imperative-tag", L: "B2", diff: 3, focus: "Tag after an imperative and after 'Let's'", pre: ["tag-questions", "imperatives"],
    prompt: "Let's leave a bit earlier, ______?", options: ["shall we", "will you", "don't we", "do we"], key: 0, why: "Let's → shall we.", overlaps: ["sentence-structure"] }),
  d.mcq({ b: "question-prepositions", t: "preposition-stranding", L: "B2", diff: 2, focus: "Preposition placement in a wh-question (informal stranding)", pre: ["question-prepositions", "preposition-stranding"],
    prompt: "______ did you get this information from?", options: ["Who", "Whom did", "From who", "Whose"], key: 0, why: "Stranded 'from' at the end with 'Who' at the front.", overlaps: ["prep-phrasal"] }),
  d.mcq({ b: "short-responses", t: "so-neither", L: "B2", diff: 2, focus: "Neither + inversion to agree with a negative statement", pre: ["so-neither-responses", "subject-auxiliary-inversion"],
    prompt: "'I haven't seen that film.'  '______.'", options: ["Neither have I", "Neither I have", "So have I", "Neither do I"], key: 0, why: "Negative agreement → Neither + auxiliary + subject." }),
  d.gap({ b: "tag-questions", t: "irregular-tag", L: "B2", diff: 3, focus: "Irregular tag for 'I am' → aren't I", pre: ["tag-questions"],
    instr: "Complete the gap with the correct question tag (two words).", source: "I'm next in the queue, ______?", key: "aren't I", why: "'am I not' contracts irregularly to 'aren't I'." }),
  d.correct({ b: "negation", t: "no-double-negative", L: "B2", diff: 1, focus: "Standard English does not use two negatives for one negation", pre: ["no-not-none"],
    source: "We didn't see nobody at the entrance.", key: "We didn't see anybody at the entrance.", alt: ["We saw nobody at the entrance."], why: "One negative marker only." }),

  // ---------------- C1 ----------------
  d.mcq({ b: "question-prepositions", t: "formal-whom", L: "C1", diff: 2, focus: "Formal preposition + whom fronting", pre: ["question-prepositions"],
    prompt: "______ should the completed form be addressed?", options: ["To whom", "Who to", "Whom", "To who"], key: 0, why: "Formal register → preposition + whom fronted." }),
  d.mcq({ b: "negation", t: "scope-of-negation", L: "C1", diff: 3, focus: "Transferred negation: 'I don't think he will' vs 'I think he won't'", pre: ["no-not-none"],
    prompt: "Which is the most natural way to express doubt that he will agree?", options: ["I don't think he will agree.", "I think he doesn't will agree.", "I think not he will agree.", "I don't think he won't agree."], key: 0, why: "English raises the negative to the main clause." }),
  d.mcq({ b: "indirect-questions", t: "embedded-question-nesting", L: "C1", diff: 3, focus: "Word order in a wh-question containing an embedded clause", pre: ["indirect-question-order", "wh-words"],
    prompt: "______ the committee decided to postpone the vote?", options: ["Why do you think", "Why you think", "Do you think why", "Why do you think that"], key: 0, why: "Fronted wh + main-clause inversion, statement order in the embedded clause." }),
  d.gap({ b: "short-responses", t: "so-neither", L: "C1", diff: 2, focus: "Producing an inverted agreement response", pre: ["so-neither-responses", "subject-auxiliary-inversion"],
    instr: "Complete the response with THREE words so it agrees with the statement.", source: "'I'd rather not discuss it now.'  '______.'", key: "Neither would I", why: "Negative agreement with 'would' → Neither would I." }),

  // ---------------- C2 ----------------
  d.mcq({ b: "negation", t: "negative-polarity-any", L: "C2", diff: 3, focus: "Licensing of negative-polarity items by a non-negative but downward-entailing trigger", pre: ["no-not-none", "some-any"],
    prompt: "She left the meeting without telling ______ where she was going.", options: ["anyone", "no one", "someone not", "not anyone"], key: 0, why: "'without' creates a negative context that licenses 'anyone' but blocks a second negative.",
    flags: ["c2-check: negative-polarity licensing by 'without' is structural (context licenses the item), not lexical. C2 provisional — could arguably be B2 for 'anyone' alone; the demand here is rejecting 'no one'."] }),
];