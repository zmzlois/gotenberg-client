import {
  appendEmbeds,
  appendFile,
  appendFiles,
  appendFormValue,
  appendOptions,
  prepareHtmlFile,
  requestBinary,
  requestJson,
  requestText,
} from "./request";
import type {
  ConvertHtmlInput,
  ConvertMarkdownInput,
  ConvertOfficeInput,
  ConvertToPdfaInput,
  ConvertUrlInput,
  EmbedFilesInput,
  EncryptPdfInput,
  FlattenPdfInput,
  GotenbergClient,
  GotenbergClientOptions,
  GotenbergHealth,
  MergePdfInput,
  ReadMetadataInput,
  ScreenshotHtmlInput,
  ScreenshotMarkdownInput,
  ScreenshotUrlInput,
  SplitPdfInput,
  WriteMetadataInput,
} from "./types";

/**
 * Internal request layer used by the public `Gotenberg` class.
 * It focuses purely on transport + payload assembly.
 */
export class GotenbergRequestClient implements GotenbergClient {
  constructor(private readonly options: GotenbergClientOptions) {}

  async health(signal?: AbortSignal) {
    return requestJson<GotenbergHealth>(this.options, {
      path: "/health",
      signal,
    });
  }

  async version(signal?: AbortSignal) {
    return requestText(this.options, { path: "/version", signal });
  }

  async convertUrl(input: ConvertUrlInput) {
    const form = new FormData();
    form.append("url", input.url);
    appendOptions(form, input.options);

    return requestBinary(this.options, {
      path: "/forms/chromium/convert/url",
      body: form,
      headers: input.headers,
      trace: input.trace,
      outputFilename: input.outputFilename,
      signal: input.signal,
    });
  }

  async convertHtml(input: ConvertHtmlInput) {
    const form = new FormData();
    appendFile(form, "files", prepareHtmlFile(input.indexHtml));
    for (const file of input.files ?? []) appendFile(form, "files", file);
    appendOptions(form, input.options);

    return requestBinary(this.options, {
      path: "/forms/chromium/convert/html",
      body: form,
      headers: input.headers,
      trace: input.trace,
      outputFilename: input.outputFilename,
      signal: input.signal,
    });
  }

  async convertMarkdown(input: ConvertMarkdownInput) {
    const form = new FormData();
    appendFile(form, "files", prepareHtmlFile(input.indexHtml));
    appendFiles(form, input.markdownFiles);
    for (const file of input.files ?? []) appendFile(form, "files", file);
    appendOptions(form, input.options);

    return requestBinary(this.options, {
      path: "/forms/chromium/convert/markdown",
      body: form,
      headers: input.headers,
      trace: input.trace,
      outputFilename: input.outputFilename,
      signal: input.signal,
    });
  }

  async screenshotUrl(input: ScreenshotUrlInput) {
    const form = new FormData();
    form.append("url", input.url);
    appendOptions(form, input.options);

    return requestBinary(this.options, {
      path: "/forms/chromium/screenshot/url",
      body: form,
      headers: input.headers,
      trace: input.trace,
      outputFilename: input.outputFilename,
      signal: input.signal,
    });
  }

  async screenshotHtml(input: ScreenshotHtmlInput) {
    const form = new FormData();
    appendFile(form, "files", prepareHtmlFile(input.indexHtml));
    for (const file of input.files ?? []) appendFile(form, "files", file);
    appendOptions(form, input.options);

    return requestBinary(this.options, {
      path: "/forms/chromium/screenshot/html",
      body: form,
      headers: input.headers,
      trace: input.trace,
      outputFilename: input.outputFilename,
      signal: input.signal,
    });
  }

  async screenshotMarkdown(input: ScreenshotMarkdownInput) {
    const form = new FormData();
    appendFile(form, "files", prepareHtmlFile(input.indexHtml));
    appendFiles(form, input.markdownFiles);
    for (const file of input.files ?? []) appendFile(form, "files", file);
    appendOptions(form, input.options);

    return requestBinary(this.options, {
      path: "/forms/chromium/screenshot/markdown",
      body: form,
      headers: input.headers,
      trace: input.trace,
      outputFilename: input.outputFilename,
      signal: input.signal,
    });
  }

  async convertOffice(input: ConvertOfficeInput) {
    const form = new FormData();
    appendFiles(form, input.files);
    appendOptions(form, input.options);
    appendEmbeds(form, input.embeds);

    return requestBinary(this.options, {
      path: "/forms/libreoffice/convert",
      body: form,
      headers: input.headers,
      trace: input.trace,
      outputFilename: input.outputFilename,
      signal: input.signal,
    });
  }

  async mergePdf(input: MergePdfInput) {
    const form = new FormData();
    appendFiles(form, input.files);
    appendOptions(form, input.options);
    appendEmbeds(form, input.embeds);

    return requestBinary(this.options, {
      path: "/forms/pdfengines/merge",
      body: form,
      headers: input.headers,
      trace: input.trace,
      outputFilename: input.outputFilename,
      signal: input.signal,
    });
  }

  async splitPdf(input: SplitPdfInput) {
    const form = new FormData();
    appendFiles(form, input.files);
    appendFormValue(form, "splitMode", input.splitMode);
    appendFormValue(form, "splitSpan", input.splitSpan);
    appendFormValue(form, "splitUnify", input.splitUnify);
    appendOptions(form, input.options);
    appendEmbeds(form, input.embeds);

    return requestBinary(this.options, {
      path: "/forms/pdfengines/split",
      body: form,
      headers: input.headers,
      trace: input.trace,
      outputFilename: input.outputFilename,
      signal: input.signal,
    });
  }

  async flattenPdf(input: FlattenPdfInput) {
    const form = new FormData();
    appendFiles(form, input.files);

    return requestBinary(this.options, {
      path: "/forms/pdfengines/flatten",
      body: form,
      headers: input.headers,
      trace: input.trace,
      outputFilename: input.outputFilename,
      signal: input.signal,
    });
  }

  async encryptPdf(input: EncryptPdfInput) {
    const form = new FormData();
    appendFiles(form, input.files);
    appendFormValue(form, "userPassword", input.userPassword);
    appendFormValue(form, "ownerPassword", input.ownerPassword);

    return requestBinary(this.options, {
      path: "/forms/pdfengines/encrypt",
      body: form,
      headers: input.headers,
      trace: input.trace,
      outputFilename: input.outputFilename,
      signal: input.signal,
    });
  }

  async embedFiles(input: EmbedFilesInput) {
    const form = new FormData();
    appendFiles(form, input.files);
    appendEmbeds(form, input.embeds);

    return requestBinary(this.options, {
      path: "/forms/pdfengines/embed",
      body: form,
      headers: input.headers,
      trace: input.trace,
      outputFilename: input.outputFilename,
      signal: input.signal,
    });
  }

  async readMetadata(input: ReadMetadataInput) {
    const form = new FormData();
    appendFiles(form, input.files);

    return requestJson<Record<string, Record<string, string>>>(this.options, {
      path: "/forms/pdfengines/metadata/read",
      method: "POST",
      body: form,
      headers: input.headers,
      trace: input.trace,
      signal: input.signal,
    });
  }

  async writeMetadata(input: WriteMetadataInput) {
    const form = new FormData();
    appendFiles(form, input.files);
    appendFormValue(form, "metadata", input.metadata);

    return requestBinary(this.options, {
      path: "/forms/pdfengines/metadata/write",
      body: form,
      headers: input.headers,
      trace: input.trace,
      outputFilename: input.outputFilename,
      signal: input.signal,
    });
  }

  async convertToPdfa(input: ConvertToPdfaInput) {
    const form = new FormData();
    appendFiles(form, input.files);
    appendFormValue(form, "pdfa", input.pdfa);
    appendFormValue(form, "pdfua", input.pdfua);

    return requestBinary(this.options, {
      path: "/forms/pdfengines/convert",
      body: form,
      headers: input.headers,
      trace: input.trace,
      outputFilename: input.outputFilename,
      signal: input.signal,
    });
  }
}
