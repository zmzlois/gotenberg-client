import { describe, expect, test } from "bun:test";

import { assertResultOk, withMockedFetch } from "./utils/test-utils";
import { withTestGotenbergEnv, BASE_URL } from "./utils/gotenberg-test-helpers";

describe("Gotenberg class client", () => {
  describe("health and version", () => {
    test("Gotenberg.health and Gotenberg.version use env variables and parse payloads", async () => {
      const healthMock = withMockedFetch((request) => {
        expect(request.method).toBe("GET");
        expect(request.url).toBe(`${BASE_URL}/health`);
        return new Response(JSON.stringify({ status: "up" }), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      });
      try {
        await withTestGotenbergEnv(async (client) => {
          const healthResult = await client.health();
          assertResultOk(healthResult);
          expect(healthResult.value.status).toBe("up");
        });
      } finally {
        healthMock.restore();
      }

      const versionMock = withMockedFetch((request) => {
        expect(request.method).toBe("GET");
        expect(request.url).toBe(`${BASE_URL}/version`);
        return new Response("3.14.15", {
          status: 200,
          headers: { "content-type": "text/plain" },
        });
      });

      try {
        await withTestGotenbergEnv(async (client) => {
          const versionResult = await client.version();
          assertResultOk(versionResult);
          expect(versionResult.value).toBe("3.14.15");
        });
      } finally {
        versionMock.restore();
      }
    });
  });
});
