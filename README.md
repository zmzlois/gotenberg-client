# gotenberg-client

Tiny, typed client for [Gotenberg](https://gotenberg.dev/) with two entry styles:
- **Factory API** (`createGotenbergClient`) for explicit, DI-friendly usage
- **Class API** (`new Gotenberg()`) for environment-driven configuration


## Install
### npm 
```bash
npm install gotenberg-client
```
### pnpm 
```bash
pnpm install gotenberg-client
```
### Bun 
```bash
bun install gotenberg-client
```
## Quick start

Pass in required environment variables. See more options in [GotenbergClientOptions](./src/types.ts)
```ts
import { createGotenbergClient } from "gotenberg-client";

const client = createGotenbergClient({
  baseUrl: process.env.GOTENBERG_URL,
  basicAuth: {
    username: process.env.GOTENBERG_API_BASIC_AUTH_USERNAME,
    password: process.env.GOTENBERG_API_BASIC_AUTH_PASSWORD,
  },
});

// Convert URL -> PDF
const pdfResult = await client.convertUrl({
  url: "https://example.com", // a remove storage file 
  outputFilename: "example.pdf",
  options: {
    printBackground: true,
    marginTop: "12mm",
  },
});

if (!pdfResult.ok) {
  throw new Error(`Conversion failed: ${pdfResult.error.message}`);
}

// Response includes content-type + filename + server trace metadata
console.log(pdfResult.value.filename, pdfResult.value.contentType);
```

Optionally you can also just make sure the environment variables exists within the environment and use the methods directly.
```ts
import { Gotenberg } from "gotenberg-client";

// You can also use the class API that reads from env vars
process.env.GOTENBERG_URL = "https://gotenberg.example.com";
process.env.GOTENBERG_API_BASIC_AUTH_USERNAME = "basic-user";
process.env.GOTENBERG_API_BASIC_AUTH_PASSWORD = "basic-password";

const client = new Gotenberg();
const htmlResult = await client.htmlToPdf({
  indexHtml: "<html><body><h1>hello</h1></body></html>",
  outputFilename: "hello.pdf",
  options: { printBackground: true },
});

if (!htmlResult.ok) {
  throw new Error(`Conversion failed: ${htmlResult.error.message}`);
}
```

## Environment variables

Required when using `new Gotenberg()`:

- `GOTENBERG_URL`
- `GOTENBERG_API_BASIC_AUTH_USERNAME`
- `GOTENBERG_API_BASIC_AUTH_PASSWORD`

## File inputs

You can pass `string`, `ArrayBuffer`, `Uint8Array`, or `Blob` per `GotenbergFile`:

```ts
import type { GotenbergFile } from "gotenberg-client";

const file: GotenbergFile = {
  name: "contract.docx",
  data: await Bun.file("contract.docx").arrayBuffer(),
  contentType:
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
};
```

## API reference (factory API)

The default export is `createGotenbergClient` from:

```ts
import { createGotenbergClient } from "gotenberg-client";
```

Method coverage:

- `health(signal?)` -> service status check
- `version(signal?)` -> server version string
- **Chromium → PDF**
  - `convertUrl(input: ConvertUrlInput)`
  - `convertHtml(input: ConvertHtmlInput)`
  - `convertMarkdown(input: ConvertMarkdownInput)`
- **Chromium → Image**
  - `screenshotUrl(input: ScreenshotUrlInput)`
  - `screenshotHtml(input: ScreenshotHtmlInput)`
  - `screenshotMarkdown(input: ScreenshotMarkdownInput)`
- **LibreOffice**
  - `convertOffice(input: ConvertOfficeInput)`
- **PDF engines**
  - `mergePdf(input: MergePdfInput)`
  - `splitPdf(input: SplitPdfInput)`
  - `flattenPdf(input: FlattenPdfInput)`
  - `encryptPdf(input: EncryptPdfInput)`
  - `embedFiles(input: EmbedFilesInput)`
  - `readMetadata(input: ReadMetadataInput)`
  - `writeMetadata(input: WriteMetadataInput)`
  - `convertToPdfa(input: ConvertToPdfaInput)`

## API reference (class API)

The class API is a thin wrapper around the same client contract and adds optional logger hooks:

```ts
import { Gotenberg } from "gotenberg-client";
```

Methods:

- `health(signal?)`
- `version(signal?)`
- `urlToPdf(input: ConvertUrlInput)`
- `htmlToPdf(input: ConvertHtmlInput)`
- `markdownToPdf(input: ConvertMarkdownInput)`
- `screenshotUrl(input: ScreenshotUrlInput)`
- `screenshotHtml(input: ScreenshotHtmlInput)`
- `screenshotMarkdown(input: ScreenshotMarkdownInput)`
- `pdfToImage(input: ScreenshotUrlInput)` *(alias for `screenshotUrl`)*
- `officeToPdf(input: ConvertOfficeInput)`
- `excelToPdf(input: ConvertOfficeInput)`
- `wordToPdf(input: ConvertOfficeInput)`
- `mergePdf(input: MergePdfInput)`
- `splitPdf(input: SplitPdfInput)`
- `flattenPdf(input: FlattenPdfInput)`
- `encryptPdf(input: EncryptPdfInput)`
- `embedFiles(input: EmbedFilesInput)`
- `readMetadata(input: ReadMetadataInput)`
- `writeMetadata(input: WriteMetadataInput)`
- `convertToPdfa(input: ConvertToPdfaInput)`

## Example: upload + merge PDFs

```ts
import { createGotenbergClient } from "gotenberg-client";
import type { GotenbergFile } from "gotenberg-client";

const mergeInput = async (): Promise<GotenbergFile[]> => Promise.all([
    Bun.file("a.pdf").arrayBuffer().then((data) => ({
      name: "a.pdf",
      data,
      contentType: "application/pdf",
    })),
    Bun.file("b.pdf").arrayBuffer().then((data) => ({
      name: "b.pdf",
      data,
      contentType: "application/pdf",
    })),
  ]);

const client = createGotenbergClient({
  baseUrl: "https://gotenberg.example.com",
  basicAuth: { username: "u", password: "p" },
});

const files = await mergeInput();
const merged = await client.mergePdf({
  files,
  outputFilename: "merged.pdf",
  options: { pdfa: "PDF/A-2b" },
});

if (!merged.ok) {
  throw new Error(merged.error.message);
}

// Persist the output if needed
await Bun.write("merged.pdf", merged.value.blob);
```


## Error handling

All methods return `Result<T, GotenbergError>`:

- `ok: true, value: T`
- `ok: false, error: GotenbergError`

Example:

```ts
const result = await client.version();
if (!result.ok) {
  // Handle network/config/response issues consistently
  console.error(result.error.type, result.error.message);
  return;
}

console.log("Gotenberg version:", result.value);
```

## Local development

```bash
bun install
bun test
bun run build
bun run typecheck
bun run format
```

## Publishing to npm (GitHub Actions)

This package uses GitHub Actions with npm Trusted Publishing (OIDC):

1. Configure OIDC/trusted publishing for this package in npm (`.github/workflows/publish.yml`).
2. Bump version (`npm version patch|minor|major`) and push tag `v<version>`.
3. CI runs: `bun test`, `bun run build`, then `npm publish --access public`.
4. Manual release is supported using `workflow_dispatch` (when enabled in your workflow).

The manual workflow is intentionally aligned with environment-based and tag-based release flows.
