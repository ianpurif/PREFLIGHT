import type { DeploymentIntent } from "@preflight/domain";

/** Port only. DMK device discovery/signing is intentionally deferred to the implementation phase. */
export interface HardwareApproval {
  signerAddress: string;
  signature: string;
}

export interface LedgerApprovalGate {
  requestApproval(intent: DeploymentIntent): Promise<HardwareApproval>;
}
