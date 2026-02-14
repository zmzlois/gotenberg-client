import { describe, expect, test } from "bun:test";

import { createGotenbergClient } from "../src";
import { assertResultOk, withMockedFetch } from "./utils/test-utils";
import {
  BASE_URL,
  cleanupArtifacts,
  loadFixturePdf,
  makeBinaryResponse,
  writeArtifact,
} from "./utils/gotenberg-test-helpers";

describe("createGotenbergClient", () => {
  describe("metadata operations", () => {
    test("readMetadata returns json payload and verifies request form", async () => {
      const pdf = await loadFixturePdf();

      const { restore } = withMockedFetch(async (request) => {
        expect(request.url).toBe(`${BASE_URL}/forms/pdfengines/metadata/read`);
        const form = await request.formData();
        expect(form.getAll("files")).toHaveLength(1);
        expect(form.get("metadata")).toBeNull();
        return new Response(
          JSON.stringify({
            metadata: { Producer: "gotenberg-client", Author: "test-suite" },
          }),
          {
            status: 200,
            headers: { "content-type": "application/json" },
          },
        );
      });

      const client = createGotenbergClient({
        baseUrl: BASE_URL,
        basicAuth: { username: "u", password: "p" },
      });
      try {
        const result = await client.readMetadata({
          files: [pdf],
          headers: { "X-Meta-Test": "true" },
          trace: "metadata-trace",
        });

        assertResultOk(result);
        expect(result.value.metadata).toMatchObject({ Author: "test-suite" });
      } finally {
        restore();
      }
    });

    test("writeMetadata sends serialized metadata and returns pdf result", async () => {
      const artifacts: string[] = [];
      const pdf = await loadFixturePdf();

      const { restore } = withMockedFetch(async (request) => {
        expect(request.url).toBe(`${BASE_URL}/forms/pdfengines/metadata/write`);
        const form = await request.formData();
        expect(form.get("metadata")).toBe(
          JSON.stringify({ Author: "gotenberg", Producer: "test" }),
        );
        expect(form.getAll("files")).toHaveLength(1);
        return makeBinaryResponse("metadata.pdf", "application/pdf");
      });

      const client = createGotenbergClient({
        baseUrl: BASE_URL,
        basicAuth: { username: "u", password: "p" },
      });

      try {
        const result = await client.writeMetadata({
          files: [pdf],
          outputFilename: "metadata.pdf",
          metadata: { Author: "gotenberg", Producer: "test" },
        });
        assertResultOk(result);
        await writeArtifact(result.value, "write-metadata", artifacts);
        expect(result.value.filename).toBe("metadata.pdf");
      } finally {
        restore();
        cleanupArtifacts(artifacts);
      }
    });
  });
});
