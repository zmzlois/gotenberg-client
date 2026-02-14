import { describe, expect, test } from "bun:test";

import { createGotenbergClient } from "../src";
import { assertResultOk, withMockedFetch } from "./utils/test-utils";
import {
  BASE_URL,
  cleanupArtifacts,
  loadFixtureDocx,
  loadFixturePdf,
  makeBinaryResponse,
  writeArtifact,
} from "./utils/gotenberg-test-helpers";

describe("createGotenbergClient", () => {
  describe("pdf operations", () => {
    test("mergePdf includes all source files and merge options", async () => {
      const artifacts: string[] = [];
      const pdf = await loadFixturePdf();

      const { restore } = withMockedFetch(async (request) => {
        expect(request.url).toBe(`${BASE_URL}/forms/pdfengines/merge`);
        const form = await request.formData();
        expect(form.getAll("files")).toHaveLength(2);
        expect(form.get("pdfa")).toBe("PDF/A-2b");
        expect(form.get("flatten")).toBe("true");
        return makeBinaryResponse("merged.pdf", "application/pdf");
      });

      const client = createGotenbergClient({
        baseUrl: BASE_URL,
        basicAuth: { username: "u", password: "p" },
      });

      try {
        const result = await client.mergePdf({
          files: [pdf, pdf],
          options: {
            pdfa: "PDF/A-2b",
            flatten: true,
          },
          outputFilename: "merged.pdf",
        });
        assertResultOk(result);
        await writeArtifact(result.value, "merge-pdf", artifacts);
        expect(result.value.contentType).toBe("application/pdf");
      } finally {
        restore();
        cleanupArtifacts(artifacts);
      }
    });

    test("splitPdf sends splitMode, splitSpan and output binary", async () => {
      const artifacts: string[] = [];
      const pdf = await loadFixturePdf();

      const { restore } = withMockedFetch(async (request) => {
        expect(request.url).toBe(`${BASE_URL}/forms/pdfengines/split`);
        const form = await request.formData();
        expect(form.getAll("files")).toHaveLength(1);
        expect(form.get("splitMode")).toBe("pages");
        expect(form.get("splitSpan")).toBe("1");
        expect(form.get("splitUnify")).toBe("true");
        return makeBinaryResponse("split.zip", "application/zip");
      });

      const client = createGotenbergClient({
        baseUrl: BASE_URL,
        basicAuth: { username: "u", password: "p" },
      });

      try {
        const result = await client.splitPdf({
          files: [pdf],
          splitMode: "pages",
          splitSpan: "1",
          splitUnify: true,
          outputFilename: "split.zip",
        });
        assertResultOk(result);
        await writeArtifact(result.value, "split-pdf", artifacts);
        expect(result.value.filename).toBe("split.zip");
      } finally {
        restore();
        cleanupArtifacts(artifacts);
      }
    });

    test("flattenPdf only forwards files and transforms", async () => {
      const artifacts: string[] = [];
      const pdf = await loadFixturePdf();

      const { restore } = withMockedFetch(async (request) => {
        expect(request.url).toBe(`${BASE_URL}/forms/pdfengines/flatten`);
        const form = await request.formData();
        expect(form.getAll("files")).toHaveLength(1);
        return makeBinaryResponse("flattened.pdf", "application/pdf");
      });

      const client = createGotenbergClient({
        baseUrl: BASE_URL,
        basicAuth: { username: "u", password: "p" },
      });

      try {
        const result = await client.flattenPdf({
          files: [pdf],
          outputFilename: "flattened.pdf",
        });
        assertResultOk(result);
        await writeArtifact(result.value, "flatten-pdf", artifacts);
        expect(result.value.contentType).toBe("application/pdf");
      } finally {
        restore();
        cleanupArtifacts(artifacts);
      }
    });

    test("encryptPdf sends passwords and returns output", async () => {
      const artifacts: string[] = [];
      const pdf = await loadFixturePdf();

      const { restore } = withMockedFetch(async (request) => {
        expect(request.url).toBe(`${BASE_URL}/forms/pdfengines/encrypt`);
        const form = await request.formData();
        expect(form.get("userPassword")).toBe("owner-pass");
        expect(form.get("ownerPassword")).toBe("admin-pass");
        return makeBinaryResponse("encrypted.pdf", "application/pdf");
      });

      const client = createGotenbergClient({
        baseUrl: BASE_URL,
        basicAuth: { username: "u", password: "p" },
      });

      try {
        const result = await client.encryptPdf({
          files: [pdf],
          userPassword: "owner-pass",
          ownerPassword: "admin-pass",
          outputFilename: "encrypted.pdf",
        });
        assertResultOk(result);
        await writeArtifact(result.value, "encrypt-pdf", artifacts);
        expect(result.value.filename).toBe("encrypted.pdf");
      } finally {
        restore();
        cleanupArtifacts(artifacts);
      }
    });

    test("embedFiles submits both files and embeds", async () => {
      const artifacts: string[] = [];
      const pdf = await loadFixturePdf();
      const docx = await loadFixtureDocx();

      const { restore } = withMockedFetch(async (request) => {
        expect(request.url).toBe(`${BASE_URL}/forms/pdfengines/embed`);
        const form = await request.formData();
        expect(form.getAll("files")).toHaveLength(1);
        expect(form.getAll("embeds")).toHaveLength(1);
        return makeBinaryResponse("embedded.pdf", "application/pdf");
      });

      const client = createGotenbergClient({
        baseUrl: BASE_URL,
        basicAuth: { username: "u", password: "p" },
      });

      try {
        const result = await client.embedFiles({
          files: [pdf],
          embeds: [docx],
          outputFilename: "embedded.pdf",
        });
        assertResultOk(result);
        await writeArtifact(result.value, "embed-files", artifacts);
        expect(result.value.filename).toBe("embedded.pdf");
      } finally {
        restore();
        cleanupArtifacts(artifacts);
      }
    });

    test("convertToPdfa sends pdfa and pdfua parameters and returns output", async () => {
      const artifacts: string[] = [];
      const pdf = await loadFixturePdf();

      const { restore } = withMockedFetch(async (request) => {
        expect(request.url).toBe(`${BASE_URL}/forms/pdfengines/convert`);
        const form = await request.formData();
        expect(form.get("pdfa")).toBe("PDF/A-2b");
        expect(form.get("pdfua")).toBe("true");
        return makeBinaryResponse("pdfa.pdf", "application/pdf");
      });

      const client = createGotenbergClient({
        baseUrl: BASE_URL,
        basicAuth: { username: "u", password: "p" },
      });

      try {
        const result = await client.convertToPdfa({
          files: [pdf],
          outputFilename: "pdfa.pdf",
          pdfa: "PDF/A-2b",
          pdfua: true,
        });
        assertResultOk(result);
        await writeArtifact(result.value, "convert-to-pdfa", artifacts);
        expect(result.value.trace).toBe("server-trace");
      } finally {
        restore();
        cleanupArtifacts(artifacts);
      }
    });
  });
});
