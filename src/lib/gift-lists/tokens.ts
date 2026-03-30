import "server-only";

import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

function tokenDigest(token: string) {
  return createHash("sha256").update(token, "utf8").digest();
}

export function generateHostAccessToken() {
  return randomBytes(24).toString("base64url");
}

export function hashHostAccessToken(token: string) {
  return tokenDigest(token).toString("hex");
}

export function verifyHostAccessToken(token: string, expectedHash: string | null | undefined) {
  if (!expectedHash || !token) {
    return false;
  }

  const expectedBuffer = Buffer.from(expectedHash, "hex");
  const receivedBuffer = tokenDigest(token);

  if (expectedBuffer.length !== receivedBuffer.length) {
    return false;
  }

  return timingSafeEqual(receivedBuffer, expectedBuffer);
}
