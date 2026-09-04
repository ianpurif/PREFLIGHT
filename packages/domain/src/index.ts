/** Boilerplate domain vocabulary only; no product behavior lives here yet. */
export type ClearanceVerdict = "CLEAR" | "HOLD" | "ESCALATE";

export interface PreflightIdentifiers {
  siteCommitment: string;
  robotBuildDigest: string;
  evaluatorVersion: string;
}

export interface ClearanceReference extends PreflightIdentifiers {
  clearanceId: string;
  verdict: ClearanceVerdict;
  expiresAt: string;
}
