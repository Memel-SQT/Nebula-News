import type { Language, Region } from "@prisma/client";

export type SourceConfig = {
  name: string;
  feedUrl: string;
  websiteUrl: string;
  region: Region;
  language: Language;
  /** Editorial weight used by the importance scorer; wire services and
   *  flagship outlets sit higher. Keep this list append-only and easy to
   *  extend — adding a source is just adding an entry here, then re-running
   *  `npm run seed`. */
  weight: number;
};

export const SOURCES: SourceConfig[] = [
  // --- France / French-speaking Europe -------------------------------
  {
    name: "Agence France-Presse (AFP)",
    feedUrl: "https://www.france24.com/fr/rss",
    websiteUrl: "https://www.france24.com",
    region: "FRANCE",
    language: "FR",
    weight: 1.3,
  },
  {
    name: "Le Monde — International",
    feedUrl: "https://www.lemonde.fr/international/rss_full.xml",
    websiteUrl: "https://www.lemonde.fr",
    region: "FRANCE",
    language: "FR",
    weight: 1.2,
  },
  {
    name: "Radio France Internationale (RFI)",
    feedUrl: "https://www.rfi.fr/fr/rss",
    websiteUrl: "https://www.rfi.fr",
    region: "FRANCE",
    language: "FR",
    weight: 1.1,
  },
  {
    name: "Le Figaro — International",
    feedUrl: "https://www.lefigaro.fr/rss/figaro_international.xml",
    websiteUrl: "https://www.lefigaro.fr",
    region: "FRANCE",
    language: "FR",
    weight: 1.0,
  },
  {
    name: "RTS Info (Suisse)",
    feedUrl: "https://www.rts.ch/info/monde/rss.xml",
    websiteUrl: "https://www.rts.ch",
    region: "FRANCE",
    language: "FR",
    weight: 0.9,
  },

  // --- North America ---------------------------------------------------
  {
    name: "Reuters — World News",
    feedUrl: "https://feeds.reuters.com/Reuters/worldNews",
    websiteUrl: "https://www.reuters.com",
    region: "NORTH_AMERICA",
    language: "EN",
    weight: 1.4,
  },
  {
    name: "Associated Press — Top News",
    feedUrl: "https://rsshub.app/apnews/topics/ap-top-news",
    websiteUrl: "https://apnews.com",
    region: "NORTH_AMERICA",
    language: "EN",
    weight: 1.3,
  },
  {
    name: "NPR — World",
    feedUrl: "https://feeds.npr.org/1004/rss.xml",
    websiteUrl: "https://www.npr.org",
    region: "NORTH_AMERICA",
    language: "EN",
    weight: 1.1,
  },
  {
    name: "CBC News — World",
    feedUrl: "https://www.cbc.ca/webfeed/rss/rss-world",
    websiteUrl: "https://www.cbc.ca",
    region: "NORTH_AMERICA",
    language: "EN",
    weight: 1.0,
  },

  // --- UK / Anglo-Saxon --------------------------------------------------
  {
    name: "BBC News — World",
    feedUrl: "http://feeds.bbci.co.uk/news/world/rss.xml",
    websiteUrl: "https://www.bbc.com/news",
    region: "ANGLOSAXON",
    language: "EN",
    weight: 1.4,
  },
  {
    name: "The Guardian — World",
    feedUrl: "https://www.theguardian.com/world/rss",
    websiteUrl: "https://www.theguardian.com",
    region: "ANGLOSAXON",
    language: "EN",
    weight: 1.2,
  },
  {
    name: "The Independent — World",
    feedUrl: "https://www.independent.co.uk/news/world/rss",
    websiteUrl: "https://www.independent.co.uk",
    region: "ANGLOSAXON",
    language: "EN",
    weight: 0.9,
  },

  // --- Global / thematic ---------------------------------------------
  {
    name: "Al Jazeera English",
    feedUrl: "https://www.aljazeera.com/xml/rss/all.xml",
    websiteUrl: "https://www.aljazeera.com",
    region: "GLOBAL",
    language: "EN",
    weight: 1.1,
  },
  {
    name: "Courrier International",
    feedUrl: "https://www.courrierinternational.com/feed/all/rss.xml",
    websiteUrl: "https://www.courrierinternational.com",
    region: "GLOBAL",
    language: "FR",
    weight: 1.0,
  },
];
