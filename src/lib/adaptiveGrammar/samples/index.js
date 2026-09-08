// Aggregates the per-domain sample sets into one flat array.
// REPRESENTATIVE SAMPLES ONLY — awaiting approval before the full bank.
import tenses from "@/lib/adaptiveGrammar/samples/tenses";
import nounsArticles from "@/lib/adaptiveGrammar/samples/nounsArticles";
import pronouns from "@/lib/adaptiveGrammar/samples/pronouns";
import verbPatterns from "@/lib/adaptiveGrammar/samples/verbPatterns";
import adjAdv from "@/lib/adaptiveGrammar/samples/adjAdv";
import comparison from "@/lib/adaptiveGrammar/samples/comparison";
import questionsNegation from "@/lib/adaptiveGrammar/samples/questionsNegation";
import modals from "@/lib/adaptiveGrammar/samples/modals";
import prepPhrasal from "@/lib/adaptiveGrammar/samples/prepPhrasal";
import sentenceStructure from "@/lib/adaptiveGrammar/samples/sentenceStructure";
import conditionalsWishes from "@/lib/adaptiveGrammar/samples/conditionalsWishes";
import passiveCausative from "@/lib/adaptiveGrammar/samples/passiveCausative";
import reportedSpeech from "@/lib/adaptiveGrammar/samples/reportedSpeech";

export const SAMPLE_ITEMS = [
  ...tenses, ...nounsArticles, ...pronouns, ...verbPatterns, ...adjAdv, ...comparison,
  ...questionsNegation, ...modals, ...prepPhrasal, ...sentenceStructure,
  ...conditionalsWishes, ...passiveCausative, ...reportedSpeech,
];