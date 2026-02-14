import { GotenbergRequestClient } from "./client";
import type {
  ConvertHtmlInput,
  ConvertMarkdownInput,
  ConvertOfficeInput,
  ConvertToPdfaInput,
  ConvertUrlInput,
  EmbedFilesInput,
  EncryptPdfInput,
  FlattenPdfInput,
  GotenbergClientOptions,
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

/**
 * Public client API. Instantiate with `new Gotenberg()` and the required
 * env vars: GOTENBERG_URL, GOTENBERG_API_BASIC_AUTH_USERNAME,
 * GOTENBERG_API_BASIC_AUTH_PASSWORD.
 */
export class Gotenberg extends GotenbergRequestClient {
  private readonly logger?: GotenbergLogger;

  /**
   * reads connection config from environment variables:
   * - GOTENBERG_URL (required)
   * - GOTENBERG_API_BASIC_AUTH_USERNAME (required)
   * - GOTENBERG_API_BASIC_AUTH_PASSWORD (required)
   */
  constructor(options?: GotenbergOptions) {
    const clientOptions: GotenbergClientOptions = {
      baseUrl: requireEnv("GOTENBERG_URL"),
      basicAuth: {
        username: requireEnv("GOTENBERG_API_BASIC_AUTH_USERNAME"),
        password: requireEnv("GOTENBERG_API_BASIC_AUTH_PASSWORD"),
      },
      limiter: options?.limiter,
    };

    super(clientOptions);
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

  private async withErrorLogging<T>(
    method: string,
    request: () => Promise<Result<T, GotenbergError>>,
  ): Promise<Result<T, GotenbergError>> {
    const result = await request();
    this.logIfError(method, result);
    return result;
  }

  override async health(signal?: AbortSignal): ReturnType<GotenbergClient["health"]> {
    return this.withErrorLogging("health", () => super.health(signal));
  }

  override async version(signal?: AbortSignal): ReturnType<GotenbergClient["version"]> {
    return this.withErrorLogging("version", () => super.version(signal));
  }

  override async urlToPdf(input: ConvertUrlInput): ReturnType<GotenbergClient["convertUrl"]> {
    return this.withErrorLogging("urlToPdf", () => super.convertUrl(input));
  }

  override async htmlToPdf(input: ConvertHtmlInput): ReturnType<GotenbergClient["convertHtml"]> {
    return this.withErrorLogging("htmlToPdf", () => super.convertHtml(input));
  }

  override async markdownToPdf(
    input: ConvertMarkdownInput,
  ): ReturnType<GotenbergClient["convertMarkdown"]> {
    return this.withErrorLogging("markdownToPdf", () => super.convertMarkdown(input));
  }

  override async screenshotUrl(
    input: ScreenshotUrlInput,
  ): ReturnType<GotenbergClient["screenshotUrl"]> {
    return this.withErrorLogging("screenshotUrl", () => super.screenshotUrl(input));
  }

  override async screenshotHtml(
    input: ScreenshotHtmlInput,
  ): ReturnType<GotenbergClient["screenshotHtml"]> {
    return this.withErrorLogging("screenshotHtml", () =>
      super.screenshotHtml(input),
    );
  }

  override async screenshotMarkdown(
    input: ScreenshotMarkdownInput,
  ): ReturnType<GotenbergClient["screenshotMarkdown"]> {
    return this.withErrorLogging("screenshotMarkdown", () =>
      super.screenshotMarkdown(input),
    );
  }

  override async pdfToImage(
    input: ScreenshotUrlInput,
  ): ReturnType<GotenbergClient["screenshotUrl"]> {
    return this.withErrorLogging("pdfToImage", () => super.screenshotUrl(input));
  }

  override async officeToPdf(
    input: ConvertOfficeInput,
  ): ReturnType<GotenbergClient["convertOffice"]> {
    return this.withErrorLogging("officeToPdf", () => super.convertOffice(input));
  }

  override async excelToPdf(
    input: ConvertOfficeInput,
  ): ReturnType<GotenbergClient["convertOffice"]> {
    return this.withErrorLogging("excelToPdf", () => super.convertOffice(input));
  }

  override async wordToPdf(
    input: ConvertOfficeInput,
  ): ReturnType<GotenbergClient["convertOffice"]> {
    return this.withErrorLogging("wordToPdf", () => super.convertOffice(input));
  }

  override async mergePdf(input: MergePdfInput): ReturnType<GotenbergClient["mergePdf"]> {
    return this.withErrorLogging("mergePdf", () => super.mergePdf(input));
  }

  override async splitPdf(input: SplitPdfInput): ReturnType<GotenbergClient["splitPdf"]> {
    return this.withErrorLogging("splitPdf", () => super.splitPdf(input));
  }

  override async flattenPdf(
    input: FlattenPdfInput,
  ): ReturnType<GotenbergClient["flattenPdf"]> {
    return this.withErrorLogging("flattenPdf", () => super.flattenPdf(input));
  }

  override async encryptPdf(
    input: EncryptPdfInput,
  ): ReturnType<GotenbergClient["encryptPdf"]> {
    return this.withErrorLogging("encryptPdf", () => super.encryptPdf(input));
  }

  override async embedFiles(
    input: EmbedFilesInput,
  ): ReturnType<GotenbergClient["embedFiles"]> {
    return this.withErrorLogging("embedFiles", () => super.embedFiles(input));
  }

  override async readMetadata(
    input: ReadMetadataInput,
  ): ReturnType<GotenbergClient["readMetadata"]> {
    return this.withErrorLogging("readMetadata", () => super.readMetadata(input));
  }

  override async writeMetadata(
    input: WriteMetadataInput,
  ): ReturnType<GotenbergClient["writeMetadata"]> {
    return this.withErrorLogging("writeMetadata", () => super.writeMetadata(input));
  }

  override async convertToPdfa(
    input: ConvertToPdfaInput,
  ): ReturnType<GotenbergClient["convertToPdfa"]> {
    return this.withErrorLogging("convertToPdfa", () => super.convertToPdfa(input));
  }
}
