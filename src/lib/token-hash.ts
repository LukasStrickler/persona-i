import * as crypto from "crypto";

/**
 * Hash a token using SHA-256 algorithm.
 * This matches the hashing function used by BetterAuth when storeToken is set to use a custom hasher.
 *
 * @param token - The plain token string to hash
 * @returns The hashed token as a hexadecimal string
 */
export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}
