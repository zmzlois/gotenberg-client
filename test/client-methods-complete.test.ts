import { mkdirSync, rmSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { describe, expect, test } from "bun:test";

import { createGotenbergClient, Gotenberg } from "../src";
import type { GotenbergBinaryResponse, GotenbergFile } from "../src/types";
import { assertResultOk, withMockedFetch } from "./utils/test-utils";

const BASE_URL = "http://localhost:3000";
const TMP_OUTPUT_DIR = "test/.tmp";

const makeBinaryResponse = (
  filename: string,
  contentType: string,
  trace = "server-trace",
) =>
  new Response(new Uint8Array([9, 9, 9, 9]), {
    status: 200,
    headers: {
      "content-type": contentType,
      "content-disposition": `filename="${filename}"`,
      "Gotenberg-Trace": trace,
    },
  });

const writeArtifact = async (
  result: GotenbergBinaryResponse,
  nameHint: string,
  bucket: string[],
): Promise<string> => {
  mkdirSync(TMP_OUTPUT_DIR, { recursive: true });
  const filePath = `${TMP_OUTPUT_DIR}/${nameHint}-${randomUUID()}`;
  await Bun.write(filePath, result.blob);
  bucket.push(filePath);
  return filePath;
};

const cleanupArtifacts = (bucket: string[]): void => {
  for (const path of bucket) {
    rmSync(path, { force: true });
  }
};

const loadFixturePdf = async (): Promise<GotenbergFile> => ({
  name: "sample-pdf.pdf",
  data: await Bun.file("test/fixtures/sample-pdf.pdf").arrayBuffer(),
  contentType: "application/pdf",
});

const loadFixtureDocx = async (): Promise<GotenbergFile> => ({
  name: "sample-docx.docx",
  data: await Bun.file("test/fixtures/sample-docx.docx").arrayBuffer(),
  contentType:
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
});

const withTestGotenbergEnv = async <T>(
  testFn: (client: Gotenberg) => Promise<T>,
): Promise<T> => {
  const originalEnv = {
    GOTENBERG_URL: process.env.GOTENBERG_URL,
    GOTENBERG_API_BASIC_AUTH_USERNAME:
      process.env.GOTENBERG_API_BASIC_AUTH_USERNAME,
    GOTENBERG_API_BASIC_AUTH_PASSWORD:
      process.env.GOTENBERG_API_BASIC_AUTH_PASSWORD,
  };

  process.env.GOTENBERG_URL = BASE_URL;
  process.env.GOTENBERG_API_BASIC_AUTH_USERNAME = "u";
  process.env.GOTENBERG_API_BASIC_AUTH_PASSWORD = "p";

  try {
    return await testFn(new Gotenberg());
  } finally {
    process.env.GOTENBERG_URL = originalEnv.GOTENBERG_URL;
    process.env.GOTENBERG_API_BASIC_AUTH_USERNAME =
      originalEnv.GOTENBERG_API_BASIC_AUTH_USERNAME;
    process.env.GOTENBERG_API_BASIC_AUTH_PASSWORD =
      originalEnv.GOTENBERG_API_BASIC_AUTH_PASSWORD;
  }
};

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
  let versionResult: Awaited<ReturnType<typeof client.version>>;

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
  try {
    versionResult = await client.version();
    assertResultOk(versionResult);
    expect(versionResult.value).toBe("3.14.15");
  } finally {
    versionMock.restore();
  }
  });

  });

  describe("chromium converters", () => {

test("convertUrl sends trace, output filename, headers and options", async () => {
  const artifacts: string[] = [];

  const { restore } = withMockedFetch(async (request) => {
    expect(request.method).toBe("POST");
    expect(request.url).toBe(`${BASE_URL}/forms/chromium/convert/url`);
    expect(request.headers.get("Gotenberg-Trace")).toBe("trace-id");
    expect(request.headers.get("Gotenberg-Output-Filename")).toBe("output.pdf");
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
      indexHtml: { name: "index.md", data: "# markdown", contentType: "text/markdown" },
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

  describe("libreoffice converters", () => {

test("convertOffice forwards LibreOffice files and options with embeds", async () => {
  const artifacts: string[] = [];
  const docx = await loadFixtureDocx();
  const pdf = await loadFixturePdf();

  const { restore } = withMockedFetch(async (request) => {
    expect(request.url).toBe(`${BASE_URL}/forms/libreoffice/convert`);
    const form = await request.formData();
    expect(form.getAll("files")).toHaveLength(1);
    expect(form.getAll("embeds")).toHaveLength(1);
    expect(form.get("pdfa")).toBe("PDF/A-3b");
    expect(form.get("quality")).toBe("90");
    return makeBinaryResponse("office.pdf", "application/pdf");
  });

  const client = createGotenbergClient({
    baseUrl: BASE_URL,
    basicAuth: { username: "u", password: "p" },
  });

  try {
    const result = await client.convertOffice({
      files: [docx],
      embeds: [pdf],
      outputFilename: "office.pdf",
      options: {
        pdfa: "PDF/A-3b",
        quality: 90,
      },
    });
    assertResultOk(result);
    await writeArtifact(result.value, "convert-office", artifacts);
    expect(result.value.filename).toBe("office.pdf");
  } finally {
    restore();
    cleanupArtifacts(artifacts);
  }
  });
  
  });

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

test("splitPdf sends splitMode/splitSpan and output binary", async () => {
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

test("convertToPdfa sends pdfa/pdfua parameters and returns output", async () => {
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
        indexHtml: { name: "index.md", data: "# title", contentType: "text/markdown" },
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

  describe("office helpers", () => {

test("Gotenberg office helpers wrap convertOffice and pass through outputs", async () => {
  const artifacts: string[] = [];
  const docx = await loadFixtureDocx();
  const { restore } = withMockedFetch(async (request) => {
    expect(request.url).toBe(`${BASE_URL}/forms/libreoffice/convert`);
    const form = await request.formData();
    expect(form.getAll("files")).toHaveLength(1);
    return makeBinaryResponse("office.pdf", "application/pdf");
  });

  const wrappers = [
    {
      name: "officeToPdf",
      run: (client: Gotenberg) =>
        client.officeToPdf({ files: [docx], outputFilename: "office.pdf" }),
    },
    {
      name: "excelToPdf",
      run: (client: Gotenberg) =>
        client.excelToPdf({ files: [docx], outputFilename: "office.pdf" }),
    },
    {
      name: "wordToPdf",
      run: (client: Gotenberg) =>
        client.wordToPdf({ files: [docx], outputFilename: "office.pdf" }),
    },
  ];

  try {
    for (const wrapper of wrappers) {
      const result = await withTestGotenbergEnv(wrapper.run);
      assertResultOk(result);
      const artifact = await writeArtifact(result.value, `class-${wrapper.name}`, artifacts);
      expect(artifact).toContain("class-");
      expect(result.value.filename).toBe("office.pdf");
    }
  } finally {
    restore();
    cleanupArtifacts(artifacts);
  }
});

  });

  describe("pdf helpers", () => {

test("Gotenberg mergePdf/splitPdf/flattenPdf/encryptPdf and convertToPdfa methods work as expected", async () => {
  const artifacts: string[] = [];
  const pdf = await loadFixturePdf();

  try {
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

  } finally {
    cleanupArtifacts(artifacts);
  }
});

  });

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
      }
    } finally {
      readMetaMock.restore();
    }
  } finally {
    embedMock.restore();
    cleanupArtifacts(artifacts);
  }
});

  });

});
