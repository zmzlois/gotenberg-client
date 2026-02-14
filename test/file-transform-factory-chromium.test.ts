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
  describe("chromium converters", () => {
    test("convertUrl sends trace, output filename, headers and options", async () => {
      const artifacts: string[] = [];

      const { restore } = withMockedFetch(async (request) => {
        expect(request.method).toBe("POST");
        expect(request.url).toBe(`${BASE_URL}/forms/chromium/convert/url`);
        expect(request.headers.get("Gotenberg-Trace")).toBe("trace-id");
        expect(request.headers.get("Gotenberg-Output-Filename")).toBe(
          "output.pdf",
        );
        const form = await request.formData();
        expect(form.get("url")).toBe("https://example.com");
        expect(form.get("paperWidth")).toBe("8.5");
        expect(form.get("printBackground")).toBe("true");
        expect(form.get("quality")).toBe("75");
        expect(request.headers.get("Authorization")).toBe("Basic dTpw");
        return makeBinaryResponse("converted-url.pdf", "application/pdf");
      });

      const client = createGotenbergClient({
        baseUrl: BASE_URL,
        basicAuth: { username: "u", password: "p" },
      });

      try {
        const result = await client.convertUrl({
          url: "https://example.com",
          trace: "trace-id",
          outputFilename: "output.pdf",
          headers: { "X-Test": "true" },
          options: {
            paperWidth: 8.5,
            printBackground: true,
            quality: 75,
          },
        });

        assertResultOk(result);
        const artifact = await writeArtifact(result.value, "convert-url", artifacts);
        expect(artifact).toContain("convert-url");
        expect(result.value.contentType).toBe("application/pdf");
        expect(result.value.filename).toBe("converted-url.pdf");
        expect(result.value.trace).toBe("server-trace");
      } finally {
        restore();
        cleanupArtifacts(artifacts);
      }
    });

    test("convertHtml sends inline html file, extra files and options", async () => {
      const artifacts: string[] = [];
      const pdf = await loadFixturePdf();

      const { restore } = withMockedFetch(async (request) => {
        expect(request.method).toBe("POST");
        expect(request.url).toBe(`${BASE_URL}/forms/chromium/convert/html`);
        const form = await request.formData();
        expect(form.getAll("files")).toHaveLength(2);
        expect(form.get("singlePage")).toBe("true");
        expect(form.get("scale")).toBe("1.5");
        return makeBinaryResponse("converted-html.pdf", "application/pdf");
      });

      const client = createGotenbergClient({
        baseUrl: BASE_URL,
        basicAuth: { username: "u", password: "p" },
      });

      try {
        const result = await client.convertHtml({
          indexHtml: "<html><body><p>hello</p></body></html>",
          files: [pdf],
          options: {
            singlePage: true,
            scale: 1.5,
          },
        });

        assertResultOk(result);
        await writeArtifact(result.value, "convert-html", artifacts);
        expect(result.value.filename).toBe("converted-html.pdf");
      } finally {
        restore();
        cleanupArtifacts(artifacts);
      }
    });

    test("convertMarkdown sends markdown index and markdownFiles", async () => {
      const artifacts: string[] = [];
      const pdf = await loadFixturePdf();

      const { restore } = withMockedFetch(async (request) => {
        expect(request.method).toBe("POST");
        expect(request.url).toBe(`${BASE_URL}/forms/chromium/convert/markdown`);
        const form = await request.formData();
        expect(form.getAll("files")).toHaveLength(3);
        expect(form.get("printBackground")).toBe("false");
        expect(form.get("nativePageRanges")).toBe("1-1");
        return makeBinaryResponse("converted-markdown.pdf", "application/pdf");
      });

      const client = createGotenbergClient({
        baseUrl: BASE_URL,
        basicAuth: { username: "u", password: "p" },
      });

      try {
        const result = await client.convertMarkdown({
          indexHtml: {
            name: "index.md",
            data: "# markdown",
            contentType: "text/markdown",
          },
          markdownFiles: [
            {
              name: "notes.md",
              data: "# note",
              contentType: "text/markdown",
            },
          ],
          files: [pdf],
          options: {
            printBackground: false,
            nativePageRanges: "1-1",
          },
        });

        assertResultOk(result);
        await writeArtifact(result.value, "convert-markdown", artifacts);
        expect(result.value.filename).toBe("converted-markdown.pdf");
      } finally {
        restore();
        cleanupArtifacts(artifacts);
      }
    });

    test("screenshotUrl sends URL-based screenshot request with image options", async () => {
      const artifacts: string[] = [];

      const { restore } = withMockedFetch(async (request) => {
        expect(request.method).toBe("POST");
        expect(request.url).toBe(`${BASE_URL}/forms/chromium/screenshot/url`);
        const form = await request.formData();
        expect(form.get("url")).toBe("https://example.com/page");
        expect(form.get("format")).toBe("png");
        expect(form.get("width")).toBe("1280");
        expect(form.get("height")).toBe("720");
        return makeBinaryResponse("screen-url.png", "image/png");
      });

      const client = createGotenbergClient({
        baseUrl: BASE_URL,
        basicAuth: { username: "u", password: "p" },
      });

      try {
        const result = await client.screenshotUrl({
          url: "https://example.com/page",
          outputFilename: "screen-url.png",
          options: {
            format: "png",
            width: 1280,
            height: 720,
          },
        });
        assertResultOk(result);
        await writeArtifact(result.value, "screenshot-url", artifacts);
        expect(result.value.contentType).toBe("image/png");
      } finally {
        restore();
        cleanupArtifacts(artifacts);
      }
    });

    test("screenshotHtml handles inline html plus attached files", async () => {
      const artifacts: string[] = [];
      const pdf = await loadFixturePdf();

      const { restore } = withMockedFetch(async (request) => {
        expect(request.url).toBe(`${BASE_URL}/forms/chromium/screenshot/html`);
        const form = await request.formData();
        expect(form.getAll("files")).toHaveLength(2);
        expect(form.get("format")).toBe("jpeg");
        expect(form.get("quality")).toBe("80");
        return makeBinaryResponse("screen-html.jpeg", "image/jpeg");
      });

      const client = createGotenbergClient({
        baseUrl: BASE_URL,
        basicAuth: { username: "u", password: "p" },
      });

      try {
        const result = await client.screenshotHtml({
          indexHtml: "<html><body>screen</body></html>",
          files: [pdf],
          options: { format: "jpeg", quality: 80 },
          outputFilename: "screen-html.jpeg",
        });
        assertResultOk(result);
        await writeArtifact(result.value, "screenshot-html", artifacts);
        expect(result.value.filename).toBe("screen-html.jpeg");
      } finally {
        restore();
        cleanupArtifacts(artifacts);
      }
    });

    test("screenshotMarkdown forwards markdown files and options", async () => {
      const artifacts: string[] = [];
      const pdf = await loadFixturePdf();

      const { restore } = withMockedFetch(async (request) => {
        expect(request.url).toBe(`${BASE_URL}/forms/chromium/screenshot/markdown`);
        const form = await request.formData();
        expect(form.getAll("files")).toHaveLength(3);
        expect(form.get("format")).toBe("webp");
        expect(form.get("optimizeForSpeed")).toBe("true");
        return makeBinaryResponse("screen-markdown.webp", "image/webp");
      });

      const client = createGotenbergClient({
        baseUrl: BASE_URL,
        basicAuth: { username: "u", password: "p" },
      });

      try {
        const result = await client.screenshotMarkdown({
          indexHtml: { name: "notes.html", data: "<html/>", contentType: "text/html" },
          markdownFiles: [
            {
              name: "notes.md",
              data: "# screenshot",
              contentType: "text/markdown",
            },
          ],
          files: [pdf],
          options: {
            format: "webp",
            optimizeForSpeed: true,
          },
          outputFilename: "screen-markdown.webp",
        });
        assertResultOk(result);
        await writeArtifact(result.value, "screenshot-markdown", artifacts);
        expect(result.value.trace).toBe("server-trace");
      } finally {
        restore();
        cleanupArtifacts(artifacts);
      }
    });
  });
});
