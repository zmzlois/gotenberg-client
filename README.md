# gotenberg-client

Typed, promise-based wrapper for [Project Gotenberg](https://gotenberg.dev/). 

> You will have to deploy your own Gotenberg server to use this package.

- Minimal surface: one entrypoint, one initialization model.
- Strong request typing built from shared interfaces in `src/types.ts`.
- Every method returns `Result<T, GotenbergError>`.

## Quick Links

- [Install](#install)
- [Prerequisites Environment Variables](#prerequisites-environment-variables)
- [Initialization](#initialization)
- [Where Can You Use This Package](#where-can-you-use-this-package)
- [Shared Input Types](#shared-input-types)
- [Response Model](#response-model)
- [Health and Version](#health-and-version)
- [Checking service health](#checking-service-health)
- [Reading server version](#reading-server-version)
- [Chromium to PDF](#chromium-to-pdf)
- [Converting URL to PDF](#converting-url-to-pdf)
- [Converting HTML to PDF](#converting-html-to-pdf)
- [Converting Markdown to PDF](#converting-markdown-to-pdf)
- [Chromium to Image](#chromium-to-image)
- [Taking URL screenshots](#taking-url-screenshots)
- [Taking HTML screenshots](#taking-html-screenshots)
- [Taking Markdown screenshots](#taking-markdown-screenshots)
- [Converting PDF to Images](#converting-pdf-to-images)
- [LibreOffice](#libreoffice)
- [Converting Office documents to PDF](#converting-office-documents-to-pdf)
- [Converting Excel to PDF](#converting-excel-to-pdf)
- [Converting Word to PDF](#converting-word-to-pdf)
- [PDF Operations](#pdf-operations)
- [Merging PDFs](#merging-pdfs)
- [Splitting PDFs](#splitting-pdfs)
- [Flattening PDFs](#flattening-pdfs)
- [Encrypting PDFs](#encrypting-pdfs)
- [Embedding files in PDFs](#embedding-files-in-pdfs)
- [Reading PDF metadata](#reading-pdf-metadata)
- [Writing PDF metadata](#writing-pdf-metadata)
- [Converting to PDF/A](#converting-to-pdfa)
- [Error Handling](#error-handling)
- [Development](#development)
- [Deploy Your Own Gotenberg Server](#deploy-your-own-gotenberg-server)

## Install

```bash
npm i gotenberg-client
```

```bash
bun add gotenberg-client
```

```bash
pnpm add gotenberg-client
```

## Prerequisites Environment Variables

`new Gotenberg()` reads required values from environment variables on construction:

- `GOTENBERG_URL`
- `GOTENBERG_API_BASIC_AUTH_USERNAME`
- `GOTENBERG_API_BASIC_AUTH_PASSWORD`

If any are missing, constructor will throw.

## Initialization


```ts
import { Gotenberg } from "gotenberg-client";

const gotenberg = new Gotenberg({
  logger: {
    error: (message, meta) => console.error(message, meta),
    warn: (message, meta) => console.warn(message, meta),
  },
});
```

Optional logger and limiter are available via `GotenbergOptions`.

## Where Can You Use This Package?

This package is built for server-side runtime usage:

- Node.js and Bun services
- serverless functions (if Gotenberg endpoint is accessible)
- background workers and CLI scripts
- SSR handlers (for example, Next.js API routes, Nuxt server handlers)

It is not intended for browser/client-side frontends because:

- credentials are read from environment variables on the server
- exposing shared secrets in a bundle is unsafe
- CORS, auth, and network constraints are usually unsuitable for direct browser calls

For browser products, call this package from your backend and expose a controlled API to the UI.

### Compatibility Matrix

| Runtime | Recommended minimum | `fetch` support | Compatibility notes |
| --- | --- | --- | --- |
| **Node.js** | `18+` | Built-in | Recommended runtime. Native `fetch`, `Blob`, `FormData`, `AbortController`, `Headers`, `Request`, and `Response` are available. |
| **Node.js** | `16.x` (legacy) | Requires polyfill | Use `undici` (or equivalent) to provide global `fetch`, `Request`, `Response`, `Headers`, and streaming body support. |
| **Bun** | `1.0+` | Built-in | Fully supported with current package APIs. |
| **Cloudflare Workers / edge runtimes** | Runtime-dependent | Usually built-in | Possible but not officially tested. Ensure runtime provides `fetch` and stream-compatible multipart/form data behavior. |
| **Browser** | — | Usually built-in | Not recommended for this package because credentials are environment-driven and intended for private/backend use. |

### Runtime Requirements At A Glance

- Works best in environments with modern web-fetch globals.
- If global `fetch` is missing, provide a polyfill before constructing `new Gotenberg()`.
- In browsers, avoid using env-based credentials directly; add a server proxy instead.

## Shared Input Types

Code: type definitions live in [`src/types.ts`](./src/types.ts).

Use `GotenbergFile` for any upload field:

```ts
import type { GotenbergFile } from "gotenberg-client";

const index: GotenbergFile = {
  name: "document.docx",
  data: await Bun.file("document.docx").arrayBuffer(),
  contentType:
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
};
```

## Response

Each method returns:

```ts
type Result<T, E> = { ok: true; value: T } | { ok: false; error: E };
```

On success, binary methods return:

```ts
{
  blob: Blob;
  filename: string | null;
  contentType: string | null;
  trace: string | null;
}
```

On failure, inspect `error.type` (`config`, `network`, `http`, `invalid-response`).

## Health and Version

### Checking service health

#### `health(signal?)`

Warm-starting worker pipelines or running readiness checks. Avoid sending expensive transformation jobs when Gotenberg server is down.
```ts
const result = await gotenberg.health();
if (result.ok) {
  console.log(result.value.status); // "up" | "down"
}
```

### Reading server version

#### `version(signal?)`

Validating server compatibility during deployment or in diagnostics. Helps with support and incident triage when output behavior changes across server versions.
```ts
const result = await gotenberg.version();
if (result.ok) {
  console.log("Gotenberg:", result.value);
}
```

## Chromium to PDF

### Converting URL to PDF
Gotenberg handles page loading, rendering, and output as PDF, removing browser automation work from your app.
#### `urlToPdf(input: ConvertUrlInput)`


```ts
const result = await gotenberg.urlToPdf({
  url: "https://example.com",
  options: { printBackground: true },
});
```

### Converting HTML to PDF

You can generate HTML from templates in your application and need immediate PDF output and convert dynamic HTML directly without writing temporary files.

#### `htmlToPdf(input: ConvertHtmlInput)`

```ts
const result = await gotenberg.htmlToPdf({
  indexHtml: "<html><body>hello</body></html>",
  options: { singlePage: true },
});
```

### Converting Markdown to PDF

#### `markdownToPdf(input: ConvertMarkdownInput)`

```ts
const result = await gotenberg.markdownToPdf({
  indexHtml: { name: "index.md", data: "# notes", contentType: "text/markdown" },
  markdownFiles: [
    { name: "appendix.md", data: "# appendix", contentType: "text/markdown" },
  ],
});
```

## Chromium to Image

### Taking URL screenshots

#### `screenshotUrl(input: ScreenshotUrlInput)`


```ts
const result = await gotenberg.screenshotUrl({
  url: "https://example.com",
  options: { format: "png", width: 1280, height: 720 },
});
```

### Taking HTML screenshots

#### `screenshotHtml(input: ScreenshotHtmlInput)`

```ts
const result = await gotenberg.screenshotHtml({
  indexHtml: "<html><body>visual diff</body></html>",
  options: { format: "webp", optimizeForSpeed: true },
});
```

### Taking Markdown screenshots

#### `screenshotMarkdown(input: ScreenshotMarkdownInput)`

```ts
const result = await gotenberg.screenshotMarkdown({
  indexHtml: { name: "index.md", data: "# screenshot", contentType: "text/markdown" },
  markdownFiles: [{ name: "notes.md", data: "# note", contentType: "text/markdown" }],
});
```


### Converting PDF to Images

#### `pdfToImage(input: ScreenshotUrlInput)`


Alias for URL screenshot flow for convenience:

```ts
const result = await gotenberg.pdfToImage({
  url: "https://example.com/my.pdf",
  options: { format: "png" },
});
```


## LibreOffice

### Converting Office documents to PDF

#### `officeToPdf(input: ConvertOfficeInput)`

```ts
const result = await gotenberg.officeToPdf({
  files: [{ name: "report.docx", data: await Bun.file("report.docx").arrayBuffer() }],
});
```

### Converting Excel to PDF

#### `excelToPdf(input: ConvertOfficeInput)`


```ts
const result = await gotenberg.excelToPdf({ files: [/* ... */] });
```


### Converting Word to PDF

#### `wordToPdf(input: ConvertOfficeInput)`

```ts
const result = await gotenberg.wordToPdf({ files: [/* ... */] });
```

## PDF Operations

### Merging PDFs

#### `mergePdf(input: MergePdfInput)`

```ts
const result = await gotenberg.mergePdf({
  files: [pdfA, pdfB],
  outputFilename: "merged.pdf",
});
```

### Splitting PDFs

#### `splitPdf(input: SplitPdfInput)`

```ts
const result = await gotenberg.splitPdf({
  files: [pdf],
  splitMode: "pages",
  splitSpan: "1",
});
```


### Flattening PDFs

#### `flattenPdf(input: FlattenPdfInput)`

```ts
const result = await gotenberg.flattenPdf({
  files: [pdf],
  outputFilename: "flattened.pdf",
});
```

### Encrypting PDFs

#### `encryptPdf(input: EncryptPdfInput)`

```ts
const result = await gotenberg.encryptPdf({
  files: [pdf],
  userPassword: "owner-only",
});
```

### Embedding files in PDFs

#### `embedFiles(input: EmbedFilesInput)`


```ts
const result = await gotenberg.embedFiles({
  files: [pdf],
  embeds: [overlay],
  outputFilename: "embedded.pdf",
});
```


### Reading PDF metadata

#### `readMetadata(input: ReadMetadataInput)`


```ts
const result = await gotenberg.readMetadata({ files: [pdf] });
if (result.ok) {
  console.log(result.value);
}
```


### Writing PDF metadata

#### `writeMetadata(input: WriteMetadataInput)`


```ts
const result = await gotenberg.writeMetadata({
  files: [pdf],
  metadata: { Title: "Quarterly Report", Author: "Ops Team" },
});
```


### Converting to PDF/A

#### `convertToPdfa(input: ConvertToPdfaInput)`


```ts
const result = await gotenberg.convertToPdfa({
  files: [pdf],
  pdfa: "PDF/A-2b",
  pdfua: true,
});
```

## Error Handling

```ts
const result = await gotenberg.version();
if (!result.ok) {
  const error = result.error;
  console.error(error.type, error.message, error.status, error.trace);
  return;
}

console.log("ready");
```

## Development

```bash
bun install
bun run format
bun test
bun run build
```


## Deploy Your Own Gotenberg Server

You must run your own Gotenberg instance and point `GOTENBERG_URL` to it.

### Docker example

```bash
docker run --rm -p 3000:3000 gotenberg/gotenberg:8
```

### Docker with basic auth reverse proxy

Use a reverse proxy (for example Nginx, Caddy, Traefik) in front of Gotenberg and enforce basic auth there. Then set:

- `GOTENBERG_URL` to proxy URL
- `GOTENBERG_API_BASIC_AUTH_USERNAME` to proxy username
- `GOTENBERG_API_BASIC_AUTH_PASSWORD` to proxy password

### Production deployment notes

- keep Gotenberg inside a public/private network is fine either case - as long as you set the username and password within the environment
- set request size/time limits at gateway level
- monitor CPU and memory because Chromium and LibreOffice conversions are workload-heavy
- run multiple replicas behind a load balancer for high-throughput conversion workloads
