import type { ClearanceId, ClearanceReference } from "@preflight/domain";

/** Port only. viem-backed registry calls are intentionally deferred. */
export interface ClearanceRegistryClient {
  getClearance(clearanceId: ClearanceId): Promise<ClearanceReference | null>;
}
