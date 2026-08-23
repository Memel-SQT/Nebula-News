import { PrismaClient, CategoryKey } from "@prisma/client";
import { SOURCES } from "../lib/sources/config";

const db = new PrismaClient();

async function main() {
  console.log(`Seeding ${Object.keys(CategoryKey).length} categories...`);
  for (const key of Object.values(CategoryKey)) {
    await db.category.upsert({
      where: { key },
      update: {},
      create: { key },
    });
  }

  console.log(`Seeding ${SOURCES.length} sources...`);
  for (const source of SOURCES) {
    await db.source.upsert({
      where: { feedUrl: source.feedUrl },
      update: {
        name: source.name,
        websiteUrl: source.websiteUrl,
        region: source.region,
        language: source.language,
        weight: source.weight,
      },
      create: {
        name: source.name,
        feedUrl: source.feedUrl,
        websiteUrl: source.websiteUrl,
        region: source.region,
        language: source.language,
        weight: source.weight,
      },
    });
  }

  console.log("Seed complete. Run `npm run ingest` to fetch the first batch of articles.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
