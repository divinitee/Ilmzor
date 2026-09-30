import { useCallback } from "react";
import { useAppLang } from "@/hooks/useAppLang";

// Learner Skill Map strings (Phase 2). Node labels fall back to the taxonomy's
// English label when a translation is missing.
const UI = {
  en: { title: "Your Skill Map", soon: "Coming soon", notExplored: "Not explored yet", accuracy: "Current accuracy", unverified: "{n} rounds completed · not verified yet", explored: "{n} of {total} skills explored", earlier: "earlier activity: {n} rounds", today: "practised today", daysAgo: "practised {n} days ago", conf_low: "low confidence", conf_medium: "medium confidence", conf_high: "high confidence", back: "All areas" },
  uz: { title: "Ko'nikmalar xaritangiz", soon: "Tez orada", notExplored: "Hali o'rganilmagan", accuracy: "Joriy aniqlik", unverified: "{n} raund bajarildi · hali tasdiqlanmagan", explored: "{total} tadan {n} ko'nikma o'rganildi", earlier: "avvalgi faollik: {n} raund", today: "bugun mashq qilingan", daysAgo: "{n} kun oldin mashq qilingan", conf_low: "past ishonch", conf_medium: "o'rtacha ishonch", conf_high: "yuqori ishonch", back: "Barcha sohalar" },
  ru: { title: "Ваша карта навыков", soon: "Скоро", notExplored: "Ещё не изучено", accuracy: "Текущая точность", unverified: "{n} раундов пройдено · ещё не проверено", explored: "Изучено {n} из {total} навыков", earlier: "ранняя активность: {n} раундов", today: "практика сегодня", daysAgo: "практика {n} дн. назад", conf_low: "низкая уверенность", conf_medium: "средняя уверенность", conf_high: "высокая уверенность", back: "Все области" },
};

const NODES = {
  uz: { systems: "Til tizimlari", use: "Tildan foydalanish", vocabulary: "Lug'at", grammar: "Grammatika", orthography: "Imlo", pronunciation: "Talaffuz", comprehension: "Tushunish", production: "Ishlab chiqarish", "vocabulary.form_and_meaning": "Shakl va ma'no", "vocabulary.meaning_in_context": "Kontekstdagi ma'no", "vocabulary.sense_relations": "Ma'no aloqalari", "vocabulary.collocations_chunks": "Kollokatsiyalar", "vocabulary.word_formation": "So'z yasalishi", "vocabulary.register_connotation": "Uslub va ma'no ottenkasi", "orthography.spelling": "Imlo yozuvi", "orthography.punctuation": "Tinish belgilari", "orthography.capitalization": "Bosh harflar", "comprehension.reading": "O'qish", "comprehension.listening": "Tinglash", "production.writing_sentence": "Yozish: gap", "production.writing_text": "Yozish: matn", "production.speaking": "Gapirish", "grammar.tenses": "Zamonlar", "grammar.nouns-articles": "Otlar va artikllar", "grammar.pronouns": "Olmoshlar", "grammar.verb-patterns": "Fe'l qoliplari", "grammar.adj-adv": "Sifat va ravish", "grammar.comparison": "Taqqoslash", "grammar.questions-negation": "Savol va inkor", "grammar.modals": "Modal fe'llar", "grammar.prep-phrasal": "Predloglar va frazali fe'llar", "grammar.sentence-structure": "Gap tuzilishi", "grammar.conditionals-wishes": "Shart gaplar va istaklar", "grammar.passive-causative": "Majhul nisbat", "grammar.reported-speech": "O'zlashtirma gap" },
  ru: { systems: "Системы языка", use: "Использование языка", vocabulary: "Лексика", grammar: "Грамматика", orthography: "Орфография", pronunciation: "Произношение", comprehension: "Понимание", production: "Речь и письмо", "vocabulary.form_and_meaning": "Форма и значение", "vocabulary.meaning_in_context": "Значение в контексте", "vocabulary.sense_relations": "Смысловые связи", "vocabulary.collocations_chunks": "Сочетания и фразы", "vocabulary.word_formation": "Словообразование", "vocabulary.register_connotation": "Регистр и оттенки", "orthography.spelling": "Правописание", "orthography.punctuation": "Пунктуация", "orthography.capitalization": "Заглавные буквы", "comprehension.reading": "Чтение", "comprehension.listening": "Аудирование", "production.writing_sentence": "Письмо: предложение", "production.writing_text": "Письмо: текст", "production.speaking": "Говорение", "grammar.tenses": "Времена", "grammar.nouns-articles": "Существительные и артикли", "grammar.pronouns": "Местоимения", "grammar.verb-patterns": "Глагольные модели", "grammar.adj-adv": "Прилагательные и наречия", "grammar.comparison": "Сравнение", "grammar.questions-negation": "Вопросы и отрицание", "grammar.modals": "Модальные глаголы", "grammar.prep-phrasal": "Предлоги и фразовые глаголы", "grammar.sentence-structure": "Структура предложения", "grammar.conditionals-wishes": "Условные и пожелания", "grammar.passive-causative": "Пассив и каузатив", "grammar.reported-speech": "Косвенная речь" },
};

export const AREA_COLOR = { vocabulary: "#7C6BE8", grammar: "#3E9E92", orthography: "#B08D57", production: "#B678C9", comprehension: "#CE6A86", pronunciation: "#8B8071" };

export function useSkillMapCopy() {
  const { lang } = useAppLang();
  const s = useCallback((key, vars = {}) => {
    const str = (UI[lang] || UI.en)[key] ?? UI.en[key] ?? key;
    return Object.entries(vars).reduce((a, [k, v]) => a.replace(`{${k}}`, v), str);
  }, [lang]);
  const label = useCallback((node) => NODES[lang]?.[node.id] || node.label, [lang]);
  return { s, label };
}