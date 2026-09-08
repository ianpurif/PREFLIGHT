import { fileURLToPath } from "node:url";
import { createSimulationFixtureFiles } from "./simulation-fixtures.js";

const outputRoot =
  process.env.ROVAULTA_CRE_FIXTURE_DIR?.trim() || fileURLToPath(new URL("..", import.meta.url));
await createSimulationFixtureFiles(outputRoot);
console.log("Generated public CRE payloads with a fresh ignored local simulation secret.");
