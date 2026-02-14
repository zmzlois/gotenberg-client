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
  describe("screenshot helpers", () => {
    test("Gotenberg.screenshotUrl and pdfToImage proxy to screenshot endpoint", async () => {
      const screenshotArtifacts: string[] = [];
      const imageArtifacts: string[] = [];

      const screenshotMock = withMockedFetch(async (request) => {
        expect(request.method).toBe("POST");
        expect(request.url).toBe(`${BASE_URL}/forms/chromium/screenshot/url`);
        const form = await request.formData();
        expect(form.get("url")).toBe("https://example.com/hello");
        expect(form.get("format")).toBe("webp");
        return makeBinaryResponse("screenshot.webp", "image/webp");
      });

      try {
        const resultScreenshot = await withTestGotenbergEnv(async (client) =>
          client.screenshotUrl({
            url: "https://example.com/hello",
            outputFilename: "screenshot.webp",
            options: { format: "webp" },
          }),
        );
        assertResultOk(resultScreenshot);
        await writeArtifact(
          resultScreenshot.value,
          "class-screenshot-url",
          screenshotArtifacts,
        );
      } finally {
        screenshotMock.restore();
        cleanupArtifacts(screenshotArtifacts);
      }

      const imageMock = withMockedFetch(async (request) => {
        expect(request.method).toBe("POST");
        expect(request.url).toBe(`${BASE_URL}/forms/chromium/screenshot/url`);
        const form = await request.formData();
        expect(form.get("url")).toBe("https://example.com/sample.pdf");
        return makeBinaryResponse("pdf-image.png", "image/png");
      });

      try {
        const resultImage = await withTestGotenbergEnv(async (client) =>
          client.pdfToImage({
            url: "https://example.com/sample.pdf",
            outputFilename: "pdf-image.png",
          }),
        );
        assertResultOk(resultImage);
        await writeArtifact(resultImage.value, "class-pdf-to-image", imageArtifacts);
        expect(resultImage.value.contentType).toBe("image/png");
      } finally {
        imageMock.restore();
        cleanupArtifacts(imageArtifacts);
      }
    });

    test("Gotenberg.screenshotHtml and screenshotMarkdown forward file params", async () => {
      const htmlArtifacts: string[] = [];
      const markdownArtifacts: string[] = [];
      const pdf = await loadFixturePdf();

      const screenshotHtmlMock = withMockedFetch(async (request) => {
        expect(request.url).toBe(`${BASE_URL}/forms/chromium/screenshot/html`);
        const form = await request.formData();
        expect(form.getAll("files")).toHaveLength(2);
        return makeBinaryResponse("screenshot-html.png", "image/png");
      });

      try {
        const htmlResult = await withTestGotenbergEnv(async (client) =>
          client.screenshotHtml({
            indexHtml: "<html><body>html screenshot</body></html>",
            files: [pdf],
            outputFilename: "screenshot-html.png",
            options: { format: "png" },
          }),
        );
        assertResultOk(htmlResult);
        await writeArtifact(htmlResult.value, "class-screenshot-html", htmlArtifacts);
        expect(htmlResult.value.filename).toBe("screenshot-html.png");
      } finally {
        screenshotHtmlMock.restore();
        cleanupArtifacts(htmlArtifacts);
      }

      const screenshotMarkdownMock = withMockedFetch(async (request) => {
        expect(request.url).toBe(`${BASE_URL}/forms/chromium/screenshot/markdown`);
        const form = await request.formData();
        expect(form.getAll("files")).toHaveLength(3);
        return makeBinaryResponse("screenshot-md.webp", "image/webp");
      });

      try {
        const markdownResult = await withTestGotenbergEnv(async (client) =>
          client.screenshotMarkdown({
            indexHtml: {
              name: "notes.html",
              data: "<h1>notes</h1>",
              contentType: "text/html",
            },
            markdownFiles: [
              {
                name: "notes.md",
                data: "# markdown note",
                contentType: "text/markdown",
              },
            ],
            files: [pdf],
            outputFilename: "screenshot-md.webp",
            options: { format: "webp" },
          }),
        );
        assertResultOk(markdownResult);
        await writeArtifact(
          markdownResult.value,
          "class-screenshot-markdown",
          markdownArtifacts,
        );
        expect(markdownResult.value.filename).toBe("screenshot-md.webp");
      } finally {
        screenshotMarkdownMock.restore();
        cleanupArtifacts(markdownArtifacts);
      }
    });
  });
});
