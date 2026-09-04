import type { ClearanceReference } from "@preflight/domain";

/** Port only. viem-backed registry calls are intentionally deferred. */
export interface ClearanceRegistryClient {
  getClearance(clearanceId: string): Promise<ClearanceReference | null>;
}
