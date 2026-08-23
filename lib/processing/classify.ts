import type { CategoryKey } from "@/types";

// Keyword-based topic classifier. Deliberately simple and dependency-free so
// ingestion works with zero API keys; keywords cover both FR and EN since a
// single source can occasionally mix terms (e.g. proper nouns, loanwords).
const KEYWORDS: Record<CategoryKey, string[]> = {
  POLITICS: [
    "election", "élection", "president", "président", "government", "gouvernement",
    "senate", "sénat", "parliament", "parlement", "minister", "ministre",
    "policy", "politique", "vote", "scrutin", "law", "loi", "congress", "congrès",
  ],
  ECONOMY: [
    "economy", "économie", "market", "marché", "inflation", "gdp", "pib",
    "trade", "commerce", "stocks", "bourse", "bank", "banque", "recession",
    "récession", "jobs", "emploi", "tariff", "tarif", "budget",
  ],
  TECH: [
    "technology", "technologie", "ai", "intelligence artificielle", "startup",
    "software", "logiciel", "app", "application", "chip", "puce", "cyber",
    "robot", "internet", "smartphone", "microsoft", "google", "apple", "meta",
  ],
  SCIENCE: [
    "science", "research", "recherche", "study", "étude", "space", "espace",
    "nasa", "physics", "physique", "biology", "biologie", "discovery",
    "découverte", "telescope", "télescope",
  ],
  CULTURE: [
    "culture", "film", "movie", "cinéma", "music", "musique", "art", "book",
    "livre", "festival", "museum", "musée", "exhibition", "exposition",
  ],
  ENVIRONMENT: [
    "climate", "climat", "environment", "environnement", "carbon", "carbone",
    "biodiversity", "biodiversité", "pollution", "renewable", "renouvelable",
    "wildfire", "incendie", "drought", "sécheresse", "cop28", "cop29",
  ],
  SPORTS: [
    "sport", "football", "soccer", "olympics", "jeux olympiques", "tennis",
    "match", "tournament", "tournoi", "championship", "championnat", "coupe",
  ],
  HEALTH: [
    "health", "santé", "hospital", "hôpital", "vaccine", "vaccin", "disease",
    "maladie", "who", "oms", "pandemic", "pandémie", "virus", "medicine",
    "médecine",
  ],
  WORLD: [],
};

const CATEGORY_PRIORITY: CategoryKey[] = [
  "POLITICS", "ECONOMY", "TECH", "SCIENCE", "ENVIRONMENT", "HEALTH", "SPORTS", "CULTURE",
];

/** Returns 1-3 categories matched from title+content; always includes WORLD as a fallback tag. */
export function classifyArticle(title: string, content: string): CategoryKey[] {
  const haystack = `${title} ${content}`.toLowerCase();
  const matched = CATEGORY_PRIORITY.filter((category) =>
    KEYWORDS[category].some((kw) => haystack.includes(kw.toLowerCase()))
  );

  if (matched.length === 0) return ["WORLD"];
  return matched.slice(0, 3);
}
