import {
  isPasswordLengthValid,
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
} from "./application/password-policy.js";

/**
 * Validate the operator credential before making an account request.
 *
 * The value itself is deliberately never included in an error. This keeps the
 * command fail-closed without leaking credentials into the terminal or public
 * evidence.
 */
export function parseP13OperatorPassword(value: string | undefined): string {
  const password = value;
  if (password === undefined || password.length === 0) {
    throw new Error("ROVAULTA_P13_PASSWORD is required");
  }
  if (!isPasswordLengthValid(password)) {
    throw new Error(
      `ROVAULTA_P13_PASSWORD must be ${PASSWORD_MIN_LENGTH}-${PASSWORD_MAX_LENGTH} characters; update the ignored root .env or export a valid value`,
    );
  }
  return password;
}
