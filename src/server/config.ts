/** Reads and validates the server's JWT signing secret from its environment. */
export function readJwtSecret(environment: NodeJS.ProcessEnv = process.env): string {
  const jwtSecret = environment.JWT_SECRET;
  if (!jwtSecret || jwtSecret.length < 32) {
    throw new Error('JWT_SECRET must be set and contain at least 32 characters.');
  }
  return jwtSecret;
}
