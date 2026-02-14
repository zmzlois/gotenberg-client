import { expect } from "bun:test";

import type { GotenbergError, Result } from "../../src/types";

type MockFetchHandler = (
   request: Request,
) => Response | Promise<Response>;

export const withMockedFetch = (handler: MockFetchHandler) => {
   const originalFetch = globalThis.fetch;

   Object.defineProperty(globalThis, "fetch", {
      configurable: true,
      value: (input: RequestInfo | URL, init?: RequestInit) => {
         return Promise.resolve(handler(new Request(input, init)));
      },
   });

   return {
      restore: () => {
         Object.defineProperty(globalThis, "fetch", {
            configurable: true,
            value: originalFetch,
         });
      },
   };
};

export function assertResultOk<T>(
  result: Result<T, GotenbergError>,
): asserts result is { ok: true; value: T } {
  expect(result.ok).toBe(true);
  if (!result.ok) {
    const message = result.error.cause
      ? `Request failed: ${result.error.message} (${String(result.error.cause)})`
      : `Request failed: ${result.error.message}`;
    throw new Error(message);
  }
}
