import { DeviceActionStatus } from "@ledgerhq/device-management-kit";
import {
  type SignTypedDataDAReturnType,
  SignTypedDataDAStateStep,
} from "@ledgerhq/device-signer-kit-ethereum";
import type { Subscription } from "rxjs";
import type { ClearSigningAttempt } from "./clear-signing-context";
import { failLedger, LedgerGateError, normalizeLedgerError } from "./errors";

export interface StrictLedgerSignature {
  readonly signature: `0x${string}`;
  readonly steps: readonly SignTypedDataDAStateStep[];
}

function toCanonicalSignature(output: { r: string; s: string; v: number }): `0x${string}` {
  if (!/^0x[0-9a-fA-F]{64}$/.test(output.r) || !/^0x[0-9a-fA-F]{64}$/.test(output.s)) {
    return failLedger("MALFORMED_SIGNATURE", "Ledger returned malformed signature scalars");
  }
  const normalizedV = output.v <= 1 ? output.v + 27 : output.v;
  if (normalizedV !== 27 && normalizedV !== 28) {
    return failLedger("MALFORMED_SIGNATURE", "Ledger returned an invalid recovery identifier");
  }
  return `${output.r}${output.s.slice(2)}${normalizedV.toString(16)}` as `0x${string}`;
}

/** Cancel and reject the signer kit's documented legacy typed-data fallback state. */
export function runStrictTypedDataAction(
  action: SignTypedDataDAReturnType,
  clearSigningAttempt: ClearSigningAttempt,
): Promise<StrictLedgerSignature> {
  return new Promise((resolve, reject) => {
    const steps: SignTypedDataDAStateStep[] = [];
    let settled = false;
    let subscription: Subscription | null = null;
    subscription = action.observable.subscribe({
      next(state) {
        if (state.status === DeviceActionStatus.Pending) {
          const step = state.intermediateValue.step;
          steps.push(step);
          if (step === SignTypedDataDAStateStep.SIGN_TYPED_DATA_LEGACY) {
            settled = true;
            action.cancel();
            subscription?.unsubscribe();
            reject(
              new LedgerGateError(
                "CLEAR_SIGNING_UNAVAILABLE",
                "Ledger attempted a forbidden legacy typed-data fallback",
              ),
            );
          }
          if (step === SignTypedDataDAStateStep.SIGN_TYPED_DATA) {
            try {
              clearSigningAttempt.assertResolved();
            } catch (error) {
              settled = true;
              action.cancel();
              subscription?.unsubscribe();
              reject(normalizeLedgerError(error));
            }
          }
          return;
        }
        if (state.status === DeviceActionStatus.Completed && !settled) {
          settled = true;
          subscription?.unsubscribe();
          const requiredSteps = [
            SignTypedDataDAStateStep.BUILD_CONTEXT,
            SignTypedDataDAStateStep.PROVIDE_CONTEXT,
            SignTypedDataDAStateStep.SIGN_TYPED_DATA,
          ];
          if (!requiredSteps.every((step) => steps.includes(step))) {
            reject(
              new LedgerGateError(
                "CLEAR_SIGNING_UNAVAILABLE",
                "Ledger did not use the full Clear Signing typed-data path",
              ),
            );
            return;
          }
          try {
            resolve(Object.freeze({ signature: toCanonicalSignature(state.output), steps }));
          } catch (error) {
            reject(normalizeLedgerError(error));
          }
          return;
        }
        if (state.status === DeviceActionStatus.Error && !settled) {
          settled = true;
          subscription?.unsubscribe();
          reject(normalizeLedgerError(state.error));
          return;
        }
        if (state.status === DeviceActionStatus.Stopped && !settled) {
          settled = true;
          subscription?.unsubscribe();
          reject(new LedgerGateError("SIGNING_FAILED", "Ledger action stopped before approval"));
        }
      },
      error(error) {
        if (!settled) {
          settled = true;
          reject(normalizeLedgerError(error));
        }
      },
      complete() {
        if (!settled) {
          settled = true;
          reject(new LedgerGateError("SIGNING_FAILED", "Ledger returned no signature"));
        }
      },
    });
  });
}
