import type { BlindSigningReportParams } from "@ledgerhq/context-module";
import {
  type ClearSignContext,
  type ClearSignContextType,
  type ContextModule,
  ContextModuleBuilder,
  ContextModuleChainID,
  type SignReportParams,
  type TypedDataClearSignContext,
  type TypedDataContext,
} from "@ledgerhq/context-module";
import {
  PREFLIGHT_DEPLOYMENT_INTENT_TYPES,
  PREFLIGHT_SEPOLIA_DEPLOYMENT,
} from "@preflight/chain-client";
import { failLedger } from "./errors";

export interface ClearSigningAttempt {
  readonly begin: () => void;
  readonly assertResolved: () => void;
}

function hasExactDeploymentSchema(context: TypedDataContext): boolean {
  const actual = context.schema.DeploymentIntent;
  const expected = PREFLIGHT_DEPLOYMENT_INTENT_TYPES.DeploymentIntent;
  return (
    actual !== undefined &&
    actual.length === expected.length &&
    expected.every(
      (field, index) => actual[index]?.name === field.name && actual[index]?.type === field.type,
    )
  );
}

function hasExactDisplayFilters(result: TypedDataClearSignContext): boolean {
  if (result.type !== "success") return false;
  const expectedPaths = PREFLIGHT_DEPLOYMENT_INTENT_TYPES.DeploymentIntent.map(
    (field) => field.name,
  ).sort();
  const actualPaths = Object.keys(result.filters).sort();
  return (
    result.messageInfo.filtersCount === expectedPaths.length &&
    actualPaths.length === expectedPaths.length &&
    expectedPaths.every(
      (path, index) => actualPaths[index] === path && result.filters[path]?.path === path,
    )
  );
}

/** Delegates official context calls while exposing only exact descriptor-resolution state. */
export class GuardedClearSigningContext implements ContextModule, ClearSigningAttempt {
  readonly #delegate: ContextModule;
  #resolved = false;

  constructor(originToken: string, delegate?: ContextModule) {
    this.#delegate =
      delegate ??
      new ContextModuleBuilder({ originToken }).setChain(ContextModuleChainID.Ethereum).build();
  }

  begin(): void {
    this.#resolved = false;
  }

  assertResolved(): void {
    if (!this.#resolved) {
      failLedger(
        "CLEAR_SIGNING_UNAVAILABLE",
        "Ledger did not resolve the exact Preflight Clear Signing descriptor",
      );
    }
  }

  async getContexts<TInput>(
    input: TInput,
    expectedTypes?: ClearSignContextType[],
  ): Promise<ClearSignContext[]> {
    return this.#delegate.getContexts(input, expectedTypes);
  }

  async getFieldContext<TInput>(
    field: TInput,
    expectedType: ClearSignContextType,
  ): Promise<ClearSignContext> {
    return this.#delegate.getFieldContext(field, expectedType);
  }

  async getTypedDataFilters(context: TypedDataContext): Promise<TypedDataClearSignContext> {
    const result = await this.#delegate.getTypedDataFilters(context);
    this.#resolved =
      hasExactDisplayFilters(result) &&
      context.chainId === PREFLIGHT_SEPOLIA_DEPLOYMENT.chainId &&
      context.verifyingContract.toLowerCase() ===
        PREFLIGHT_SEPOLIA_DEPLOYMENT.verifyingContract.toLowerCase() &&
      hasExactDeploymentSchema(context);
    return result;
  }

  async report(params: BlindSigningReportParams): Promise<void> {
    return this.#delegate.report(params);
  }

  async signReport(params: SignReportParams): Promise<void> {
    return this.#delegate.signReport?.(params);
  }
}
