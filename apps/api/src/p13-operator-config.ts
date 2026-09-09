const P13_PASSWORD_MIN_LENGTH = 12;
const P13_PASSWORD_MAX_LENGTH = 256;

/**
 * Validate the operator credential before making an account request.
 *
 * The value itself is deliberately never included in an error. This keeps the
 * command fail-closed without leaking credentials into the terminal or public
 * evidence.
 */
export function parseP13OperatorPassword(value: string | undefined): string {
  const password = value?.trim();
  if (password === undefined || password.length === 0) {
    throw new Error("ROVAULTA_P13_PASSWORD is required");
  }
  if (password.length < P13_PASSWORD_MIN_LENGTH || password.length > P13_PASSWORD_MAX_LENGTH) {
    throw new Error(
      `ROVAULTA_P13_PASSWORD must be ${P13_PASSWORD_MIN_LENGTH}-${P13_PASSWORD_MAX_LENGTH} characters; update the ignored root .env or export a valid value`,
    );
  }
  return password;
}
