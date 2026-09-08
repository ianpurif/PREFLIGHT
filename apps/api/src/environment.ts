import { compatibilityEnvironmentKey } from "@rovaulta/domain";

/** Reads a current key first, then its opaque pre-migration alias. */
export function readEnvironment(
  environment: NodeJS.ProcessEnv,
  currentKey: string,
): string | undefined {
  return environment[currentKey] ?? environment[compatibilityEnvironmentKey(currentKey)];
}
