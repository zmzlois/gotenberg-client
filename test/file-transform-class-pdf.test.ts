import { describe, expect, test } from "bun:test";

import { assertResultOk, withMockedFetch } from "./utils/test-utils";
import {
  BASE_URL,
  cleanupArtifacts,
  loadFixturePdf,
  makeBinaryResponse,
  withTestGotenbergEnv,
  writeArtifact,
} from "./utils/gotenberg-test-helpers";

describe("Gotenberg class client", () => {
  describe("pdf helpers", () => {
    test("mergePdf works as expected", async () => {
      const artifacts: string[] = [];
      const pdf = await loadFixturePdf();

      const mergeMock = withMockedFetch(async (request) => {
        expect(request.url).toBe(`${BASE_URL}/forms/pdfengines/merge`);
        const form = await request.formData();
        expect(form.getAll("files")).toHaveLength(2);
        return makeBinaryResponse("merged.pdf", "application/pdf");
      });

      try {
        const mergeResult = await withTestGotenbergEnv((client) =>
          client.mergePdf({
            files: [pdf, pdf],
            outputFilename: "merged.pdf",
          }),
        );
        assertResultOk(mergeResult);
        await writeArtifact(mergeResult.value, "class-merge-pdf", artifacts);
        expect(mergeResult.value.filename).toBe("merged.pdf");
      } finally {
        mergeMock.restore();
      }

      const splitMock = withMockedFetch(async (request) => {
        expect(request.url).toBe(`${BASE_URL}/forms/pdfengines/split`);
        const form = await request.formData();
        expect(form.get("splitMode")).toBe("pages");
        return makeBinaryResponse("split.pdf", "application/pdf");
      });

      try {
        const splitResult = await withTestGotenbergEnv((client) =>
          client.splitPdf({
            files: [pdf],
            splitMode: "pages",
            splitSpan: "1",
            splitUnify: true,
            outputFilename: "split.pdf",
          }),
        );
        assertResultOk(splitResult);
        await writeArtifact(splitResult.value, "class-split-pdf", artifacts);
        expect(splitResult.value.filename).toBe("split.pdf");
      } finally {
        splitMock.restore();
      }

      const flattenMock = withMockedFetch(async (request) => {
        expect(request.url).toBe(`${BASE_URL}/forms/pdfengines/flatten`);
        return makeBinaryResponse("flattened.pdf", "application/pdf");
      });

      try {
        const flattenResult = await withTestGotenbergEnv((client) =>
          client.flattenPdf({
            files: [pdf],
            outputFilename: "flattened.pdf",
          }),
        );
        assertResultOk(flattenResult);
        await writeArtifact(flattenResult.value, "class-flatten-pdf", artifacts);
        expect(flattenResult.value.filename).toBe("flattened.pdf");
      } finally {
        flattenMock.restore();
      }

      const encryptMock = withMockedFetch(async (request) => {
        expect(request.url).toBe(`${BASE_URL}/forms/pdfengines/encrypt`);
        const form = await request.formData();
        expect(form.get("userPassword")).toBe("u-pass");
        return makeBinaryResponse("encrypted.pdf", "application/pdf");
      });

      try {
        const encryptResult = await withTestGotenbergEnv((client) =>
          client.encryptPdf({
            files: [pdf],
            userPassword: "u-pass",
            ownerPassword: "o-pass",
            outputFilename: "encrypted.pdf",
          }),
        );
        assertResultOk(encryptResult);
        await writeArtifact(encryptResult.value, "class-encrypt-pdf", artifacts);
        expect(encryptResult.value.filename).toBe("encrypted.pdf");
      } finally {
        encryptMock.restore();
      }

      const pdfaMock = withMockedFetch(async (request) => {
        expect(request.url).toBe(`${BASE_URL}/forms/pdfengines/convert`);
        const form = await request.formData();
        expect(form.get("pdfa")).toBe("PDF/A-2b");
        expect(form.get("pdfua")).toBe("true");
        return makeBinaryResponse("pdfa.pdf", "application/pdf");
      });

      try {
        const pdfaResult = await withTestGotenbergEnv((client) =>
          client.convertToPdfa({
            files: [pdf],
            pdfa: "PDF/A-2b",
            pdfua: true,
            outputFilename: "pdfa.pdf",
          }),
        );
        assertResultOk(pdfaResult);
        await writeArtifact(pdfaResult.value, "class-convert-to-pdfa", artifacts);
        expect(pdfaResult.value.filename).toBe("pdfa.pdf");
      } finally {
        pdfaMock.restore();
      }

      cleanupArtifacts(artifacts);
    });
  });
});
