import { expect } from "bun:test";

import type { GotenbergError, Result } from "../../src/types";

type MockFetchInput = string | URL | Request;

type MockFetchHandler = (
   request: Request,
) => Response | Promise<Response>;

export const withMockedFetch = (handler: MockFetchHandler) => {
   const originalFetch = globalThis.fetch;

   Object.defineProperty(globalThis, "fetch", {
      configurable: true,
      value: (input: MockFetchInput, init?: RequestInit) => {
         const request = input instanceof Request ? input : new Request(String(input), init);
         return Promise.resolve(handler(request));
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
