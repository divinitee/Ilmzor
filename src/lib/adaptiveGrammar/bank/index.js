// Aggregates the per-domain bank files into one flat array.
import tenses from "@/lib/adaptiveGrammar/bank/tenses";
import nounsArticles from "@/lib/adaptiveGrammar/bank/nounsArticles";
import pronouns from "@/lib/adaptiveGrammar/bank/pronouns";
import verbPatterns from "@/lib/adaptiveGrammar/bank/verbPatterns";
import adjAdv from "@/lib/adaptiveGrammar/bank/adjAdv";
import comparison from "@/lib/adaptiveGrammar/bank/comparison";
import questionsNegation from "@/lib/adaptiveGrammar/bank/questionsNegation";
import modals from "@/lib/adaptiveGrammar/bank/modals";
import prepPhrasal from "@/lib/adaptiveGrammar/bank/prepPhrasal";
import sentenceStructure from "@/lib/adaptiveGrammar/bank/sentenceStructure";
import conditionalsWishes from "@/lib/adaptiveGrammar/bank/conditionalsWishes";
import passiveCausative from "@/lib/adaptiveGrammar/bank/passiveCausative";
import reportedSpeech from "@/lib/adaptiveGrammar/bank/reportedSpeech";

export const BANK_ITEMS = [
  ...tenses, ...nounsArticles, ...pronouns, ...verbPatterns, ...adjAdv, ...comparison,
  ...questionsNegation, ...modals, ...prepPhrasal, ...sentenceStructure,
  ...conditionalsWishes, ...passiveCausative, ...reportedSpeech,
];