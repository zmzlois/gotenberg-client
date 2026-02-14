import { expect, test } from "bun:test";
import { createGotenbergClient } from "../src";
import type { GotenbergFile } from "../src/types";

const withMockedFetch = (
   handler: (request: Request) => Response | Promise<Response>,
) => {
   const originalFetch = globalThis.fetch;
   Object.defineProperty(globalThis, "fetch", {
      configurable: true,
      value: (input: RequestInfo | URL, init?: RequestInit) => {
         return Promise.resolve(handler(new Request(input, init)));
      },
   });

   return {
      restore: () => {
         Object.defineProperty(globalThis, "fetch", {
            configurable: true,
            value: originalFetch,
         });
      },
   };
};

test("health uses GET /health and parses JSON", async () => {
   const restore = withMockedFetch((request) => {
      expect(request.method).toBe("GET");
      expect(request.url).toBe("http://localhost:3000/health");
      return new Response(JSON.stringify({ status: "up" }), {
         status: 200,
         headers: { "content-type": "application/json" },
      });
   }).restore;

   const client = createGotenbergClient({
      baseUrl: "http://localhost:3000",
      basicAuth: { username: "u", password: "p" },
   });
   const result = await client.health();
   restore();

   expect(result.ok).toBe(true);
   expect(result.value.status).toBe("up");
});

test("convertUrl sends multipart form data with expected fields", async () => {
   const restore = withMockedFetch(async (request) => {
      expect(request.method).toBe("POST");
      expect(request.url).toBe(
         "http://localhost:3000/forms/chromium/convert/url",
      );
      const form = await request.formData();
      expect(form.get("url")).toBe("https://example.com");
      expect(form.get("paperWidth")).toBe("8.5");
      expect(form.get("printBackground")).toBe("true");
      expect(request.headers.get("Gotenberg-Trace")).toBe("trace-id");
      expect(request.headers.get("Gotenberg-Output-Filename")).toBe(
         "output.pdf",
      );
      expect(request.headers.get("Authorization")).toBe("Basic dTpw");

      return new Response(new Uint8Array([1, 2, 3, 4]), {
         status: 200,
         headers: {
            "content-type": "application/pdf",
            "content-disposition": 'filename="converted.pdf"',
            "Gotenberg-Trace": "server-trace",
         },
      });
   }).restore;

   const client = createGotenbergClient({
      baseUrl: "http://localhost:3000",
      basicAuth: { username: "u", password: "p" },
   });

   const result = await client.convertUrl({
      url: "https://example.com",
      trace: "trace-id",
      outputFilename: "output.pdf",
      headers: { "X-Test": "1" },
      options: {
         paperWidth: 8.5,
         printBackground: true,
      },
   });
   restore();

   expect(result.ok).toBe(true);
   expect(result.value.contentType).toBe("application/pdf");
   expect(result.value.filename).toBe("converted.pdf");
   expect(result.value.trace).toBe("server-trace");
});

test("metadata endpoints accept fixture pdf payload", async () => {
   const fixture = await Bun.file("test/fixtures/sample-pdf.pdf").arrayBuffer();
   const sampleFile: GotenbergFile = {
      name: "sample-pdf.pdf",
      data: fixture,
      contentType: "application/pdf",
   };

   const restore = withMockedFetch(async (request) => {
      const form = await request.formData();
      const files = form.getAll("files");
      expect(files).toHaveLength(1);
      const metadata = form.get("metadata");
      expect(metadata).toBeNull();

      return new Response(JSON.stringify({ metadata: {} }), {
         status: 200,
         headers: { "content-type": "application/json" },
      });
   }).restore;

   const client = createGotenbergClient({
      baseUrl: "http://localhost:3000",
      basicAuth: { username: "u", password: "p" },
   });

   const result = await client.readMetadata({
      files: [sampleFile],
      headers: { "X-Test": "1" },
      trace: "trace-meta",
   });
   restore();

   expect(result.ok).toBe(true);
   expect(result.value).toEqual({ metadata: {} });
});
