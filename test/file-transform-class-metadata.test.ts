import { describe, expect, test } from "bun:test";

import { assertResultOk, withMockedFetch } from "./utils/test-utils";
import {
  BASE_URL,
  cleanupArtifacts,
  loadFixtureDocx,
  loadFixturePdf,
  makeBinaryResponse,
  withTestGotenbergEnv,
  writeArtifact,
} from "./utils/gotenberg-test-helpers";

describe("Gotenberg class client", () => {
  describe("metadata helpers", () => {
    test("Gotenberg embed and metadata methods preserve payloads and output artifacts", async () => {
      const artifacts: string[] = [];
      const pdf = await loadFixturePdf();
      const docx = await loadFixtureDocx();

      const embedMock = withMockedFetch(async (request) => {
        expect(request.url).toBe(`${BASE_URL}/forms/pdfengines/embed`);
        const form = await request.formData();
        expect(form.getAll("files")).toHaveLength(1);
        expect(form.getAll("embeds")).toHaveLength(1);
        return makeBinaryResponse("embedded.pdf", "application/pdf");
      });

      try {
        const embedResult = await withTestGotenbergEnv((client) =>
          client.embedFiles({
            files: [pdf],
            embeds: [docx],
            outputFilename: "embedded.pdf",
          }),
        );
        assertResultOk(embedResult);
        await writeArtifact(embedResult.value, "class-embed", artifacts);
        expect(embedResult.value.filename).toBe("embedded.pdf");
      } finally {
        embedMock.restore();
      }

      const readMetaMock = withMockedFetch(async (request) => {
        expect(request.url).toBe(`${BASE_URL}/forms/pdfengines/metadata/read`);
        const form = await request.formData();
        expect(form.getAll("files")).toHaveLength(1);
        return new Response(
          JSON.stringify({ metadata: { Title: "unit-test" } }),
          {
            status: 200,
            headers: { "content-type": "application/json" },
          },
        );
      });

      try {
        const metadata = await withTestGotenbergEnv((client) =>
          client.readMetadata({ files: [pdf], trace: "meta-trace" }),
        );
        assertResultOk(metadata);
        expect(metadata.value).toMatchObject({ metadata: { Title: "unit-test" } });
      } finally {
        readMetaMock.restore();
      }

      const writeMetadataMock = withMockedFetch(async (request) => {
        expect(request.url).toBe(`${BASE_URL}/forms/pdfengines/metadata/write`);
        const form = await request.formData();
        expect(form.get("metadata")).toBe(
          JSON.stringify({ Title: "unit-test", Author: "gotenberg" }),
        );
        return makeBinaryResponse("metadata.pdf", "application/pdf");
      });

      try {
        const writeMetadataResult = await withTestGotenbergEnv((client) =>
          client.writeMetadata({
            files: [pdf],
            outputFilename: "metadata.pdf",
            metadata: { Title: "unit-test", Author: "gotenberg" },
          }),
        );
        assertResultOk(writeMetadataResult);
        await writeArtifact(
          writeMetadataResult.value,
          "class-write-metadata",
          artifacts,
        );
        expect(writeMetadataResult.value.filename).toBe("metadata.pdf");
      } finally {
        writeMetadataMock.restore();
        cleanupArtifacts(artifacts);
      }
    });
  });
});
