import type { ClearanceReference } from "@preflight/domain";

/** Port only. DMK device discovery/signing is intentionally deferred to the implementation phase. */
export interface DeploymentIntent {
  clearance: ClearanceReference;
  targetEnvironment: string;
  nonce: string;
  expiresAt: string;
}

export interface HardwareApproval {
  signerAddress: string;
  signature: string;
}

export interface LedgerApprovalGate {
  requestApproval(intent: DeploymentIntent): Promise<HardwareApproval>;
}
