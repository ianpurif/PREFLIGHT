import { Runner } from "@chainlink/cre-sdk";
import { z } from "zod";
import { initWorkflow } from "./workflow.js";

const configSchema = z
  .object({
    authorizedEvmAddress: z.string().regex(/^0x[0-9a-fA-F]{40}$/),
    resultDeliveryUrl: z.string().url().startsWith("https://").optional(),
    resultDeliverySecretId: z
      .string()
      .regex(/^[A-Z0-9_-]{1,128}$/)
      .optional(),
  })
  .strict();

export async function main(): Promise<void> {
  const runner = await Runner.newRunner({ configSchema });
  await runner.run(initWorkflow);
}

await main();
