import { runIngestion } from "../lib/ingestion/run";

runIngestion()
  .then((summary) => {
    console.log("Ingestion complete:", summary);
    process.exit(0);
  })
  .catch((error) => {
    console.error("Ingestion failed:", error);
    process.exit(1);
  });
