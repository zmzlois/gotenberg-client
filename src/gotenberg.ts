import { createGotenbergClient } from "./client";
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
  GotenbergError,
  GotenbergLogger,
  GotenbergOptions,
  MergePdfInput,
  ReadMetadataInput,
  Result,
  ScreenshotHtmlInput,
  ScreenshotMarkdownInput,
  ScreenshotUrlInput,
  SplitPdfInput,
  WriteMetadataInput,
} from "./types";

const requireEnv = (name: string): string => {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} environment variable is required`);
  }
  return value;
};

export class Gotenberg {
  private readonly client: GotenbergClient;
  private readonly logger?: GotenbergLogger;

  /**
   * reads connection config from environment variables:
   * - GOTENBERG_URL (required)
   * - GOTENBERG_API_BASIC_AUTH_USERNAME (required)
   * - GOTENBERG_API_BASIC_AUTH_PASSWORD (required)
   */
  constructor(options?: GotenbergOptions) {
    this.client = createGotenbergClient({
      baseUrl: requireEnv("GOTENBERG_URL"),
      basicAuth: {
        username: requireEnv("GOTENBERG_API_BASIC_AUTH_USERNAME"),
        password: requireEnv("GOTENBERG_API_BASIC_AUTH_PASSWORD"),
      },
      limiter: options?.limiter,
    });

    this.logger = options?.logger;
  }

  private logIfError<T>(
    method: string,
    result: Result<T, GotenbergError>,
  ): void {
    if (!result.ok) {
      this.logger?.error?.("gotenberg request failed", {
        method,
        error: result.error,
      });
    }
  }

  async health(signal?: AbortSignal) {
    const result = await this.client.health(signal);
    this.logIfError("health", result);
    return result;
  }

  async version(signal?: AbortSignal): Promise<Result<string, GotenbergError>> {
    const result = await this.client.version(signal);
    this.logIfError("version", result);
    return result;
  }

  async urlToPdf(input: ConvertUrlInput) {
    const result = await this.client.convertUrl(input);
    this.logIfError("urlToPdf", result);
    return result;
  }

  async htmlToPdf(input: ConvertHtmlInput) {
    const result = await this.client.convertHtml(input);
    this.logIfError("htmlToPdf", result);
    return result;
  }

  async markdownToPdf(input: ConvertMarkdownInput) {
    const result = await this.client.convertMarkdown(input);
    this.logIfError("markdownToPdf", result);
    return result;
  }

  async screenshotUrl(input: ScreenshotUrlInput) {
    const result = await this.client.screenshotUrl(input);
    this.logIfError("screenshotUrl", result);
    return result;
  }

  async screenshotHtml(input: ScreenshotHtmlInput) {
    const result = await this.client.screenshotHtml(input);
    this.logIfError("screenshotHtml", result);
    return result;
  }

  async screenshotMarkdown(input: ScreenshotMarkdownInput) {
    const result = await this.client.screenshotMarkdown(input);
    this.logIfError("screenshotMarkdown", result);
    return result;
  }

  async pdfToImage(input: ScreenshotUrlInput) {
    const result = await this.client.screenshotUrl(input);
    this.logIfError("pdfToImage", result);
    return result;
  }

  async officeToPdf(input: ConvertOfficeInput) {
    const result = await this.client.convertOffice(input);
    this.logIfError("officeToPdf", result);
    return result;
  }

  async excelToPdf(input: ConvertOfficeInput) {
    const result = await this.client.convertOffice(input);
    this.logIfError("excelToPdf", result);
    return result;
  }

  async wordToPdf(input: ConvertOfficeInput) {
    const result = await this.client.convertOffice(input);
    this.logIfError("wordToPdf", result);
    return result;
  }

  async mergePdf(input: MergePdfInput) {
    const result = await this.client.mergePdf(input);
    this.logIfError("mergePdf", result);
    return result;
  }

  async splitPdf(input: SplitPdfInput) {
    const result = await this.client.splitPdf(input);
    this.logIfError("splitPdf", result);
    return result;
  }

  async flattenPdf(input: FlattenPdfInput) {
    const result = await this.client.flattenPdf(input);
    this.logIfError("flattenPdf", result);
    return result;
  }

  async encryptPdf(input: EncryptPdfInput) {
    const result = await this.client.encryptPdf(input);
    this.logIfError("encryptPdf", result);
    return result;
  }

  async embedFiles(input: EmbedFilesInput) {
    const result = await this.client.embedFiles(input);
    this.logIfError("embedFiles", result);
    return result;
  }

  async readMetadata(input: ReadMetadataInput) {
    const result = await this.client.readMetadata(input);
    this.logIfError("readMetadata", result);
    return result;
  }

  async writeMetadata(input: WriteMetadataInput) {
    const result = await this.client.writeMetadata(input);
    this.logIfError("writeMetadata", result);
    return result;
  }

  async convertToPdfa(input: ConvertToPdfaInput) {
    const result = await this.client.convertToPdfa(input);
    this.logIfError("convertToPdfa", result);
    return result;
  }
}
