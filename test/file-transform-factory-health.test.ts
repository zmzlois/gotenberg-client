import { describe, expect, test } from "bun:test";

import { createGotenbergClient } from "../src";
import { assertResultOk, withMockedFetch } from "./utils/test-utils";
import { BASE_URL } from "./utils/gotenberg-test-helpers";

describe("createGotenbergClient", () => {
  describe("health and version", () => {
    test("health and version endpoints return expected payloads", async () => {
      const healthFixture = {
        status: "up" as const,
      };

      const healthMock = withMockedFetch((request) => {
        expect(request.method).toBe("GET");
        expect(request.url).toBe(`${BASE_URL}/health`);
        return new Response(JSON.stringify(healthFixture), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      });

      const client = createGotenbergClient({
        baseUrl: BASE_URL,
        basicAuth: { username: "u", password: "p" },
      });

      let healthResult: Awaited<ReturnType<typeof client.health>>;

      try {
        healthResult = await client.health();
        assertResultOk(healthResult);
        expect(healthResult.value).toEqual(healthFixture);
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

      let versionResult: Awaited<ReturnType<typeof client.version>>;

      try {
        versionResult = await client.version();
        assertResultOk(versionResult);
        expect(versionResult.value).toBe("3.14.15");
      } finally {
        versionMock.restore();
      }
    });
  });
});
