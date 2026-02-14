# gotenberg-client

Typed, promise-based wrapper for [Gotenberg](https://gotenberg.dev/) with a single public class: `Gotenberg`.

- Minimal surface: one entrypoint, one initialization model.
- Strong request typing built from shared interfaces in `src/types.ts`.
- Every method returns `Result<T, GotenbergError>`.

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

## Prerequisites: environment variables

`new Gotenberg()` reads required values from environment variables on construction:

- `GOTENBERG_URL`
- `GOTENBERG_API_BASIC_AUTH_USERNAME`
- `GOTENBERG_API_BASIC_AUTH_PASSWORD`

If any are missing, constructor throws:

```text
GOTENBERG_URL environment variable is required
```

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

## Shared input types

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

## Response model

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

## Health and version

### `health(signal?)`

```ts
const result = await gotenberg.health();
if (result.ok) {
  console.log(result.value.status); // "up" | "down"
}
```

### `version(signal?)`

```ts
const result = await gotenberg.version();
if (result.ok) {
  console.log("Gotenberg:", result.value);
}
```

## Chromium → PDF

### `urlToPdf(input: ConvertUrlInput)`

```ts
const result = await gotenberg.urlToPdf({
  url: "https://example.com",
  options: { printBackground: true },
});
```

### `htmlToPdf(input: ConvertHtmlInput)`

```ts
const result = await gotenberg.htmlToPdf({
  indexHtml: "<html><body>hello</body></html>",
  options: { singlePage: true },
});
```

### `markdownToPdf(input: ConvertMarkdownInput)`

```ts
const result = await gotenberg.markdownToPdf({
  indexHtml: { name: "index.md", data: "# notes", contentType: "text/markdown" },
  markdownFiles: [
    { name: "appendix.md", data: "# appendix", contentType: "text/markdown" },
  ],
});
```

## Chromium → image

### `screenshotUrl(input: ScreenshotUrlInput)`

```ts
const result = await gotenberg.screenshotUrl({
  url: "https://example.com",
  options: { format: "png", width: 1280, height: 720 },
});
```

### `screenshotHtml(input: ScreenshotHtmlInput)`

```ts
const result = await gotenberg.screenshotHtml({
  indexHtml: "<html><body>visual diff</body></html>",
  options: { format: "webp", optimizeForSpeed: true },
});
```

### `screenshotMarkdown(input: ScreenshotMarkdownInput)`

```ts
const result = await gotenberg.screenshotMarkdown({
  indexHtml: { name: "index.md", data: "# screenshot", contentType: "text/markdown" },
  markdownFiles: [{ name: "notes.md", data: "# note", contentType: "text/markdown" }],
});
```

### `pdfToImage(input: ScreenshotUrlInput)`

Alias for URL screenshot flow for convenience:

```ts
const result = await gotenberg.pdfToImage({
  url: "https://example.com/my.pdf",
  options: { format: "png" },
});
```

## LibreOffice

### `officeToPdf(input: ConvertOfficeInput)`

```ts
const result = await gotenberg.officeToPdf({
  files: [{ name: "report.docx", data: await Bun.file("report.docx").arrayBuffer() }],
});
```

### `excelToPdf(input: ConvertOfficeInput)`

```ts
const result = await gotenberg.excelToPdf({ files: [/* ... */] });
```

### `wordToPdf(input: ConvertOfficeInput)`

```ts
const result = await gotenberg.wordToPdf({ files: [/* ... */] });
```

## PDF operations

### `mergePdf(input: MergePdfInput)`

```ts
const result = await gotenberg.mergePdf({
  files: [pdfA, pdfB],
  outputFilename: "merged.pdf",
});
```

### `splitPdf(input: SplitPdfInput)`

```ts
const result = await gotenberg.splitPdf({
  files: [pdf],
  splitMode: "pages",
  splitSpan: "1",
});
```

### `flattenPdf(input: FlattenPdfInput)`

```ts
const result = await gotenberg.flattenPdf({
  files: [pdf],
  outputFilename: "flattened.pdf",
});
```

### `encryptPdf(input: EncryptPdfInput)`

```ts
const result = await gotenberg.encryptPdf({
  files: [pdf],
  userPassword: "owner-only",
});
```

### `embedFiles(input: EmbedFilesInput)`

```ts
const result = await gotenberg.embedFiles({
  files: [pdf],
  embeds: [overlay],
  outputFilename: "embedded.pdf",
});
```

### `readMetadata(input: ReadMetadataInput)`

```ts
const result = await gotenberg.readMetadata({ files: [pdf] });
if (result.ok) {
  console.log(result.value);
}
```

### `writeMetadata(input: WriteMetadataInput)`

```ts
const result = await gotenberg.writeMetadata({
  files: [pdf],
  metadata: { Title: "Quarterly Report", Author: "Ops Team" },
});
```

### `convertToPdfa(input: ConvertToPdfaInput)`

```ts
const result = await gotenberg.convertToPdfa({
  files: [pdf],
  pdfa: "PDF/A-2b",
  pdfua: true,
});
```

## Error handling

```ts
const result = await gotenberg.version();
if (!result.ok) {
  const error = result.error;
  console.error(error.type, error.message, error.status, error.trace);
  return;
}

console.log("ready");
```
