import { createReleaseServiceFromEnvironment } from "./release/index.js";
import { buildServer } from "./server";

const app = buildServer({ releaseService: createReleaseServiceFromEnvironment() });
const port = Number(process.env.PORT ?? 4000);

await app.listen({ host: "0.0.0.0", port });
