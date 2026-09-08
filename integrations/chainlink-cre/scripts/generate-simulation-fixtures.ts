import { createSimulationFixtureFiles } from "./simulation-fixtures.js";

const outputRoot =
  process.env.ROVAULTA_CRE_FIXTURE_DIR?.trim() || new URL("..", import.meta.url).pathname;
await createSimulationFixtureFiles(outputRoot);
console.log("Generated public CRE payloads with a fresh ignored local simulation secret.");
