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
  describe("conversion helpers", () => {
    test("Gotenberg.urlToPdf wraps convertUrl and sends expected request", async () => {
      const artifacts: string[] = [];
      const { restore } = withMockedFetch(async (request) => {
        expect(request.method).toBe("POST");
        expect(request.url).toBe(`${BASE_URL}/forms/chromium/convert/url`);
        const form = await request.formData();
        expect(form.get("url")).toBe("https://example.com");
        expect(form.get("paperWidth")).toBe("8.5");
        return makeBinaryResponse("url-to-pdf.pdf", "application/pdf");
      });

      try {
        const result = await withTestGotenbergEnv(async (client) =>
          client.urlToPdf({
            url: "https://example.com",
            options: {
              paperWidth: 8.5,
            },
          }),
        );
        assertResultOk(result);
        const artifact = await writeArtifact(result.value, "class-url-to-pdf", artifacts);
        expect(result.value.filename).toBe("url-to-pdf.pdf");
        expect(artifact).toContain("class-url-to-pdf");
      } finally {
        restore();
        cleanupArtifacts(artifacts);
      }
    });

    test("Gotenberg.htmlToPdf wraps convertHtml and includes inline HTML", async () => {
      const artifacts: string[] = [];
      const pdf = await loadFixturePdf();

      const { restore } = withMockedFetch(async (request) => {
        expect(request.method).toBe("POST");
        expect(request.url).toBe(`${BASE_URL}/forms/chromium/convert/html`);
        const form = await request.formData();
        expect(form.getAll("files")).toHaveLength(2);
        expect(form.get("singlePage")).toBe("true");
        return makeBinaryResponse("html-to-pdf.pdf", "application/pdf");
      });

      try {
        const result = await withTestGotenbergEnv(async (client) =>
          client.htmlToPdf({
            indexHtml: "<html><body>hello</body></html>",
            files: [pdf],
            options: { singlePage: true },
          }),
        );
        assertResultOk(result);
        await writeArtifact(result.value, "class-html-to-pdf", artifacts);
        expect(result.value.filename).toBe("html-to-pdf.pdf");
      } finally {
        restore();
        cleanupArtifacts(artifacts);
      }
    });

    test("Gotenberg.markdownToPdf wraps convertMarkdown and forwards markdown payloads", async () => {
      const artifacts: string[] = [];
      const pdf = await loadFixturePdf();

      const { restore } = withMockedFetch(async (request) => {
        expect(request.method).toBe("POST");
        expect(request.url).toBe(`${BASE_URL}/forms/chromium/convert/markdown`);
        const form = await request.formData();
        expect(form.getAll("files")).toHaveLength(3);
        expect(form.get("nativePageRanges")).toBe("1-2");
        return makeBinaryResponse("markdown-to-pdf.pdf", "application/pdf");
      });

      try {
        const result = await withTestGotenbergEnv(async (client) =>
          client.markdownToPdf({
            indexHtml: {
              name: "index.md",
              data: "# title",
              contentType: "text/markdown",
            },
            markdownFiles: [
              { name: "notes.md", data: "# notes", contentType: "text/markdown" },
            ],
            files: [pdf],
            options: { nativePageRanges: "1-2" },
          }),
        );
        assertResultOk(result);
        await writeArtifact(result.value, "class-markdown-to-pdf", artifacts);
        expect(result.value.filename).toBe("markdown-to-pdf.pdf");
      } finally {
        restore();
        cleanupArtifacts(artifacts);
      }
    });
  });
});
