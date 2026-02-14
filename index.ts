// ---- result type (self-contained, no external dependency) ----

export type Result<T, E> = { ok: true; value: T } | { ok: false; error: E };

export const Result = {
   ok<T, E = never>(value: T): Result<T, E> {
      return { ok: true, value };
   },
   err<T = never, E = unknown>(error: E): Result<T, E> {
      return { ok: false, error };
   },
};

// ---- error types ----

export type GotenbergErrorType =
   | "config"
   | "network"
   | "http"
   | "invalid-response";

export type GotenbergError = {
   type: GotenbergErrorType;
   message: string;
   status?: number;
   trace?: string | null;
   details?: string;
   cause?: unknown;
};

// ---- core types ----

/** wraps async work to limit concurrency — matches the signature of p-limit's returned function */
export type GotenbergLimiter = <T>(fn: () => Promise<T>) => Promise<T>;

export type GotenbergClientOptions = {
   baseUrl: string;
   defaultHeaders?: Record<string, string>;
   basicAuth?: { username: string; password: string };
   timeoutMs?: number;
   /** optional concurrency limiter — all outgoing requests pass through this when set */
   limiter?: GotenbergLimiter;
};

export type GotenbergBinaryResponse = {
   blob: Blob;
   trace: string | null;
   contentType: string | null;
   filename: string | null;
};

export type GotenbergHealth = {
   status: "up" | "down";
   details?: Record<
      string,
      { status: "up" | "down"; timestamp?: string; error?: string }
   >;
};

export type GotenbergFile = {
   name: string;
   data: Blob | ArrayBuffer | Uint8Array | string;
   contentType?: string;
};

// ---- shared option groups ----

export type PdfOutputOptions = {
   pdfa?: "PDF/A-1b" | "PDF/A-2b" | "PDF/A-3b";
   pdfua?: boolean;
   metadata?: Record<string, string>;
   flatten?: boolean;
   userPassword?: string;
   ownerPassword?: string;
};

export type ChromiumPageOptions = {
   singlePage?: boolean;
   paperWidth?: number | string;
   paperHeight?: number | string;
   marginTop?: number | string;
   marginBottom?: number | string;
   marginLeft?: number | string;
   marginRight?: number | string;
   preferCssPageSize?: boolean;
   generateDocumentOutline?: boolean;
   generateTaggedPdf?: boolean;
   printBackground?: boolean;
   omitBackground?: boolean;
   landscape?: boolean;
   scale?: number | string;
   nativePageRanges?: string;
};

export type ChromiumWaitOptions = {
   waitDelay?: string;
   waitForExpression?: string;
   waitForSelector?: string;
};

export type ChromiumNetworkOptions = {
   emulatedMediaType?: "screen" | "print";
   userAgent?: string;
   extraHttpHeaders?: Record<string, string>;
   cookies?: Array<{
      name: string;
      value: string;
      domain: string;
      path?: string;
      secure?: boolean;
      httpOnly?: boolean;
      sameSite?: "Strict" | "Lax" | "None";
   }>;
   failOnHttpStatusCodes?: number[];
   failOnResourceHttpStatusCodes?: number[];
   ignoreResourceHttpStatusDomains?: string[];
   failOnResourceLoadingFailed?: boolean;
   failOnConsoleExceptions?: boolean;
   skipNetworkIdleEvent?: boolean;
};

export type ChromiumConvertOptions = ChromiumPageOptions &
   ChromiumWaitOptions &
   ChromiumNetworkOptions &
   PdfOutputOptions;

export type ScreenshotOptions = ChromiumWaitOptions &
   ChromiumNetworkOptions & {
      width?: number;
      height?: number;
      clip?: boolean;
      format?: "png" | "jpeg" | "webp";
      quality?: number;
      omitBackground?: boolean;
      optimizeForSpeed?: boolean;
   };

export type LibreOfficeOptions = {
   landscape?: boolean;
   nativePageRanges?: string;
   password?: string;
   merge?: boolean;
   updateIndexes?: boolean;
   skipEmptyPages?: boolean;
   singlePageSheets?: boolean;
   exportFormFields?: boolean;
   allowDuplicateFieldNames?: boolean;
   exportBookmarks?: boolean;
   exportBookmarksToPdfDestination?: boolean;
   exportPlaceholders?: boolean;
   exportNotes?: boolean;
   exportNotesPages?: boolean;
   exportOnlyNotesPages?: boolean;
   exportNotesInMargin?: boolean;
   exportHiddenSlides?: boolean;
   convertOooTargetToPdfTarget?: boolean;
   exportLinksRelativeFsys?: boolean;
   addOriginalDocumentAsStream?: boolean;
   losslessImageCompression?: boolean;
   quality?: number;
   reduceImageResolution?: boolean;
   maxImageResolution?: number;
} & PdfOutputOptions;

// ---- input types ----

// shared fields on most inputs
type CommonInput = {
   trace?: string;
   outputFilename?: string;
   headers?: Record<string, string>;
   signal?: AbortSignal;
};

// chromium → pdf

export type ConvertUrlInput = CommonInput & {
   url: string;
   options?: ChromiumConvertOptions;
};

export type ConvertHtmlInput = CommonInput & {
   indexHtml: string | GotenbergFile;
   files?: GotenbergFile[];
   options?: ChromiumConvertOptions;
};

export type ConvertMarkdownInput = CommonInput & {
   indexHtml: string | GotenbergFile;
   markdownFiles: GotenbergFile[];
   files?: GotenbergFile[];
   options?: ChromiumConvertOptions;
};

// chromium → image

export type ScreenshotUrlInput = CommonInput & {
   url: string;
   options?: ScreenshotOptions;
};

export type ScreenshotHtmlInput = CommonInput & {
   indexHtml: string | GotenbergFile;
   files?: GotenbergFile[];
   options?: ScreenshotOptions;
};

export type ScreenshotMarkdownInput = CommonInput & {
   indexHtml: string | GotenbergFile;
   markdownFiles: GotenbergFile[];
   files?: GotenbergFile[];
   options?: ScreenshotOptions;
};

// libreoffice → pdf

export type ConvertOfficeInput = CommonInput & {
   files: GotenbergFile[];
   options?: LibreOfficeOptions;
   embeds?: GotenbergFile[];
};

// pdf engines

export type MergePdfInput = CommonInput & {
   files: GotenbergFile[];
   options?: PdfOutputOptions;
   embeds?: GotenbergFile[];
};

export type SplitPdfInput = CommonInput & {
   files: GotenbergFile[];
   splitMode: "intervals" | "pages";
   splitSpan: string;
   splitUnify?: boolean;
   options?: PdfOutputOptions;
   embeds?: GotenbergFile[];
};

export type FlattenPdfInput = CommonInput & {
   files: GotenbergFile[];
};

export type EncryptPdfInput = CommonInput & {
   files: GotenbergFile[];
   userPassword: string;
   ownerPassword?: string;
};

export type EmbedFilesInput = CommonInput & {
   files: GotenbergFile[];
   embeds: GotenbergFile[];
};

export type ReadMetadataInput = {
   files: GotenbergFile[];
   trace?: string;
   headers?: Record<string, string>;
   signal?: AbortSignal;
};

export type WriteMetadataInput = CommonInput & {
   files: GotenbergFile[];
   metadata: Record<string, string>;
};

export type ConvertToPdfaInput = CommonInput & {
   files: GotenbergFile[];
   pdfa?: "PDF/A-1b" | "PDF/A-2b" | "PDF/A-3b";
   pdfua?: boolean;
};

// ---- client interface ----

export type GotenbergClient = {
   // utility
   health: (
      signal?: AbortSignal,
   ) => Promise<Result<GotenbergHealth, GotenbergError>>;
   version: (signal?: AbortSignal) => Promise<Result<string, GotenbergError>>;

   // chromium → pdf
   convertUrl: (
      input: ConvertUrlInput,
   ) => Promise<Result<GotenbergBinaryResponse, GotenbergError>>;
   convertHtml: (
      input: ConvertHtmlInput,
   ) => Promise<Result<GotenbergBinaryResponse, GotenbergError>>;
   convertMarkdown: (
      input: ConvertMarkdownInput,
   ) => Promise<Result<GotenbergBinaryResponse, GotenbergError>>;

   // chromium → image
   screenshotUrl: (
      input: ScreenshotUrlInput,
   ) => Promise<Result<GotenbergBinaryResponse, GotenbergError>>;
   screenshotHtml: (
      input: ScreenshotHtmlInput,
   ) => Promise<Result<GotenbergBinaryResponse, GotenbergError>>;
   screenshotMarkdown: (
      input: ScreenshotMarkdownInput,
   ) => Promise<Result<GotenbergBinaryResponse, GotenbergError>>;

   // libreoffice → pdf
   convertOffice: (
      input: ConvertOfficeInput,
   ) => Promise<Result<GotenbergBinaryResponse, GotenbergError>>;

   // pdf engines
   mergePdf: (
      input: MergePdfInput,
   ) => Promise<Result<GotenbergBinaryResponse, GotenbergError>>;
   splitPdf: (
      input: SplitPdfInput,
   ) => Promise<Result<GotenbergBinaryResponse, GotenbergError>>;
   flattenPdf: (
      input: FlattenPdfInput,
   ) => Promise<Result<GotenbergBinaryResponse, GotenbergError>>;
   encryptPdf: (
      input: EncryptPdfInput,
   ) => Promise<Result<GotenbergBinaryResponse, GotenbergError>>;
   embedFiles: (
      input: EmbedFilesInput,
   ) => Promise<Result<GotenbergBinaryResponse, GotenbergError>>;
   readMetadata: (
      input: ReadMetadataInput,
   ) => Promise<Result<Record<string, Record<string, string>>, GotenbergError>>;
   writeMetadata: (
      input: WriteMetadataInput,
   ) => Promise<Result<GotenbergBinaryResponse, GotenbergError>>;
   convertToPdfa: (
      input: ConvertToPdfaInput,
   ) => Promise<Result<GotenbergBinaryResponse, GotenbergError>>;
};

// ---- internal helpers ----

const TRACE_HEADER = "Gotenberg-Trace";
const OUTPUT_FILENAME_HEADER = "Gotenberg-Output-Filename";

const joinUrl = (baseUrl: string, path: string): string => {
   const trimmedBase = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
   const trimmedPath = path.startsWith("/") ? path : `/${path}`;
   return `${trimmedBase}${trimmedPath}`;
};

const parseFilename = (contentDisposition: string | null): string | null => {
   if (!contentDisposition) return null;
   const match = /filename="?([^"]+)"?/i.exec(contentDisposition);
   return match?.[1] ?? null;
};

const appendFormValue = (form: FormData, key: string, value: unknown): void => {
   if (value === undefined || value === null) return;
   if (typeof value === "boolean") {
      form.append(key, value ? "true" : "false");
      return;
   }
   if (typeof value === "number") {
      form.append(key, String(value));
      return;
   }
   if (typeof value === "string") {
      form.append(key, value);
      return;
   }
   form.append(key, JSON.stringify(value));
};

const toBlob = (
   data: Blob | ArrayBuffer | Uint8Array | string,
   contentType?: string,
): Blob => {
   if (data instanceof Blob) return data;
   if (typeof data === "string")
      return new Blob([data], { type: contentType ?? "text/plain" });
   const buffer =
      data instanceof ArrayBuffer
         ? data
         : (new Uint8Array(data).buffer as ArrayBuffer);
   return new Blob([buffer], { type: contentType });
};

const appendFile = (
   form: FormData,
   field: string,
   file: GotenbergFile,
): void => {
   form.append(field, toBlob(file.data, file.contentType), file.name);
};

const appendFiles = (form: FormData, files: GotenbergFile[]): void => {
   for (const file of files) appendFile(form, "files", file);
};

const appendOptions = (
   form: FormData,
   options: Record<string, unknown> | undefined,
): void => {
   if (!options) return;
   for (const [key, value] of Object.entries(options)) {
      appendFormValue(form, key, value);
   }
};

const appendEmbeds = (
   form: FormData,
   embeds: GotenbergFile[] | undefined,
): void => {
   if (!embeds) return;
   for (const file of embeds) appendFile(form, "embeds", file);
};

const prepareHtmlFile = (indexHtml: string | GotenbergFile): GotenbergFile =>
   typeof indexHtml === "string"
      ? { name: "index.html", data: indexHtml, contentType: "text/html" }
      : indexHtml;

const encodeBasicAuth = (
   username: string,
   password: string,
): Result<string, GotenbergError> => {
   const token = `${username}:${password}`;
   if (typeof Buffer !== "undefined") {
      return Result.ok(Buffer.from(token).toString("base64"));
   }
   if (typeof btoa !== "undefined") {
      return Result.ok(btoa(token));
   }
   return Result.err({
      type: "config",
      message: "basic auth encoding is not available in this runtime",
   });
};

const buildHeaders = (
   options: GotenbergClientOptions,
   requestHeaders?: Record<string, string>,
   trace?: string,
   outputFilename?: string,
): Result<Headers, GotenbergError> => {
   const headers = new Headers(options.defaultHeaders ?? {});
   if (requestHeaders) {
      for (const [key, value] of Object.entries(requestHeaders)) {
         headers.set(key, value);
      }
   }
   if (trace) headers.set(TRACE_HEADER, trace);
   if (outputFilename) headers.set(OUTPUT_FILENAME_HEADER, outputFilename);

   if (options.basicAuth) {
      const encoded = encodeBasicAuth(
         options.basicAuth.username,
         options.basicAuth.password,
      );
      if (!encoded.ok) return encoded;
      headers.set("Authorization", `Basic ${encoded.value}`);
   }

   return Result.ok(headers);
};

const withTimeoutSignal = (
   signal: AbortSignal | undefined,
   timeoutMs?: number,
): AbortSignal => {
   if (!timeoutMs) return signal ?? new AbortController().signal;

   const controller = new AbortController();

   if (signal) {
      if (signal.aborted) controller.abort();
      else
         signal.addEventListener("abort", () => controller.abort(), {
            once: true,
         });
   }

   const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
   controller.signal.addEventListener("abort", () => clearTimeout(timeoutId), {
      once: true,
   });

   return controller.signal;
};

const handleBinaryResponse = async (
   response: Response,
): Promise<Result<GotenbergBinaryResponse, GotenbergError>> => {
   const trace = response.headers.get(TRACE_HEADER);
   if (!response.ok) {
      const message = await response.text();
      return Result.err({
         type: "http",
         message: message || response.statusText,
         status: response.status,
         trace,
         details: message,
      });
   }

   return Result.ok({
      blob: await response.blob(),
      trace,
      contentType: response.headers.get("content-type"),
      filename: parseFilename(response.headers.get("content-disposition")),
   });
};

type RequestInput = {
   path: string;
   method?: "GET" | "POST";
   headers?: Record<string, string>;
   body?: BodyInit;
   trace?: string;
   outputFilename?: string;
   signal?: AbortSignal;
};

const doFetch = async (
   options: GotenbergClientOptions,
   input: RequestInput,
): Promise<Result<Response, GotenbergError>> => {
   const headersResult = buildHeaders(
      options,
      input.headers,
      input.trace,
      input.outputFilename,
   );
   if (!headersResult.ok) return headersResult;

   const signal = withTimeoutSignal(input.signal, options.timeoutMs);

   const executeFetch = async (): Promise<Result<Response, GotenbergError>> => {
      try {
         const response = await fetch(joinUrl(options.baseUrl, input.path), {
            method: input.method ?? "POST",
            headers: headersResult.value,
            body: input.body,
            signal,
         });
         return Result.ok(response);
      } catch (cause) {
         const details =
            cause instanceof Error
               ? `${cause.name}: ${cause.message}`
               : typeof cause === "string"
                 ? cause
                 : undefined;

         return Result.err({
            type: "network",
            message: "request failed",
            details,
            cause,
         });
      }
   };

   if (options.limiter) {
      return options.limiter(executeFetch);
   }

   return executeFetch();
};

const requestBinary = async (
   options: GotenbergClientOptions,
   input: RequestInput,
): Promise<Result<GotenbergBinaryResponse, GotenbergError>> => {
   const fetchResult = await doFetch(options, input);
   if (!fetchResult.ok) return fetchResult;
   return handleBinaryResponse(fetchResult.value);
};

const requestJson = async <T>(
   options: GotenbergClientOptions,
   input: RequestInput,
): Promise<Result<T, GotenbergError>> => {
   const fetchResult = await doFetch(options, {
      ...input,
      method: input.method ?? "GET",
   });
   if (!fetchResult.ok) return fetchResult;

   const response = fetchResult.value;
   const trace = response.headers.get(TRACE_HEADER);

   if (!response.ok) {
      const message = await response.text();
      return Result.err({
         type: "http",
         message: message || response.statusText,
         status: response.status,
         trace,
         details: message,
      });
   }

   try {
      return Result.ok((await response.json()) as T);
   } catch (cause) {
      return Result.err({
         type: "invalid-response",
         message: "invalid json response",
         cause,
      });
   }
};

const requestText = async (
   options: GotenbergClientOptions,
   input: RequestInput,
): Promise<Result<string, GotenbergError>> => {
   const fetchResult = await doFetch(options, {
      ...input,
      method: input.method ?? "GET",
   });
   if (!fetchResult.ok) return fetchResult;

   const response = fetchResult.value;

   if (!response.ok) {
      const message = await response.text();
      return Result.err({
         type: "http",
         message: message || response.statusText,
         status: response.status,
         trace: response.headers.get(TRACE_HEADER),
         details: message,
      });
   }

   return Result.ok(await response.text());
};

// ---- client factory ----

export const createGotenbergClient = (
   options: GotenbergClientOptions,
): GotenbergClient => ({
   // ---- utility ----

   async health(signal) {
      return requestJson<GotenbergHealth>(options, {
         path: "/health",
         signal,
      });
   },

   async version(signal) {
      return requestText(options, { path: "/version", signal });
   },

   // ---- chromium → pdf ----

   async convertUrl(input) {
      const form = new FormData();
      form.append("url", input.url);
      appendOptions(form, input.options);

      return requestBinary(options, {
         path: "/forms/chromium/convert/url",
         body: form,
         headers: input.headers,
         trace: input.trace,
         outputFilename: input.outputFilename,
         signal: input.signal,
      });
   },

   async convertHtml(input) {
      const form = new FormData();
      appendFile(form, "files", prepareHtmlFile(input.indexHtml));
      for (const file of input.files ?? []) appendFile(form, "files", file);
      appendOptions(form, input.options);

      return requestBinary(options, {
         path: "/forms/chromium/convert/html",
         body: form,
         headers: input.headers,
         trace: input.trace,
         outputFilename: input.outputFilename,
         signal: input.signal,
      });
   },

   async convertMarkdown(input) {
      const form = new FormData();
      appendFile(form, "files", prepareHtmlFile(input.indexHtml));
      appendFiles(form, input.markdownFiles);
      for (const file of input.files ?? []) appendFile(form, "files", file);
      appendOptions(form, input.options);

      return requestBinary(options, {
         path: "/forms/chromium/convert/markdown",
         body: form,
         headers: input.headers,
         trace: input.trace,
         outputFilename: input.outputFilename,
         signal: input.signal,
      });
   },

   // ---- chromium → image ----

   async screenshotUrl(input) {
      const form = new FormData();
      form.append("url", input.url);
      appendOptions(form, input.options);

      return requestBinary(options, {
         path: "/forms/chromium/screenshot/url",
         body: form,
         headers: input.headers,
         trace: input.trace,
         outputFilename: input.outputFilename,
         signal: input.signal,
      });
   },

   async screenshotHtml(input) {
      const form = new FormData();
      appendFile(form, "files", prepareHtmlFile(input.indexHtml));
      for (const file of input.files ?? []) appendFile(form, "files", file);
      appendOptions(form, input.options);

      return requestBinary(options, {
         path: "/forms/chromium/screenshot/html",
         body: form,
         headers: input.headers,
         trace: input.trace,
         outputFilename: input.outputFilename,
         signal: input.signal,
      });
   },

   async screenshotMarkdown(input) {
      const form = new FormData();
      appendFile(form, "files", prepareHtmlFile(input.indexHtml));
      appendFiles(form, input.markdownFiles);
      for (const file of input.files ?? []) appendFile(form, "files", file);
      appendOptions(form, input.options);

      return requestBinary(options, {
         path: "/forms/chromium/screenshot/markdown",
         body: form,
         headers: input.headers,
         trace: input.trace,
         outputFilename: input.outputFilename,
         signal: input.signal,
      });
   },

   // ---- libreoffice → pdf ----

   async convertOffice(input) {
      const form = new FormData();
      appendFiles(form, input.files);
      appendOptions(form, input.options);
      appendEmbeds(form, input.embeds);

      return requestBinary(options, {
         path: "/forms/libreoffice/convert",
         body: form,
         headers: input.headers,
         trace: input.trace,
         outputFilename: input.outputFilename,
         signal: input.signal,
      });
   },

   // ---- pdf engines ----

   async mergePdf(input) {
      const form = new FormData();
      appendFiles(form, input.files);
      appendOptions(form, input.options);
      appendEmbeds(form, input.embeds);

      return requestBinary(options, {
         path: "/forms/pdfengines/merge",
         body: form,
         headers: input.headers,
         trace: input.trace,
         outputFilename: input.outputFilename,
         signal: input.signal,
      });
   },

   async splitPdf(input) {
      const form = new FormData();
      appendFiles(form, input.files);
      appendFormValue(form, "splitMode", input.splitMode);
      appendFormValue(form, "splitSpan", input.splitSpan);
      appendFormValue(form, "splitUnify", input.splitUnify);
      appendOptions(form, input.options);
      appendEmbeds(form, input.embeds);

      return requestBinary(options, {
         path: "/forms/pdfengines/split",
         body: form,
         headers: input.headers,
         trace: input.trace,
         outputFilename: input.outputFilename,
         signal: input.signal,
      });
   },

   async flattenPdf(input) {
      const form = new FormData();
      appendFiles(form, input.files);

      return requestBinary(options, {
         path: "/forms/pdfengines/flatten",
         body: form,
         headers: input.headers,
         trace: input.trace,
         outputFilename: input.outputFilename,
         signal: input.signal,
      });
   },

   async encryptPdf(input) {
      const form = new FormData();
      appendFiles(form, input.files);
      appendFormValue(form, "userPassword", input.userPassword);
      appendFormValue(form, "ownerPassword", input.ownerPassword);

      return requestBinary(options, {
         path: "/forms/pdfengines/encrypt",
         body: form,
         headers: input.headers,
         trace: input.trace,
         outputFilename: input.outputFilename,
         signal: input.signal,
      });
   },

   async embedFiles(input) {
      const form = new FormData();
      appendFiles(form, input.files);
      appendEmbeds(form, input.embeds);

      return requestBinary(options, {
         path: "/forms/pdfengines/embed",
         body: form,
         headers: input.headers,
         trace: input.trace,
         outputFilename: input.outputFilename,
         signal: input.signal,
      });
   },

   async readMetadata(input) {
      const form = new FormData();
      appendFiles(form, input.files);

      return requestJson<Record<string, Record<string, string>>>(options, {
         path: "/forms/pdfengines/metadata/read",
         method: "POST",
         body: form,
         headers: input.headers,
         trace: input.trace,
         signal: input.signal,
      });
   },

   async writeMetadata(input) {
      const form = new FormData();
      appendFiles(form, input.files);
      appendFormValue(form, "metadata", input.metadata);

      return requestBinary(options, {
         path: "/forms/pdfengines/metadata/write",
         body: form,
         headers: input.headers,
         trace: input.trace,
         outputFilename: input.outputFilename,
         signal: input.signal,
      });
   },

   async convertToPdfa(input) {
      const form = new FormData();
      appendFiles(form, input.files);
      appendFormValue(form, "pdfa", input.pdfa);
      appendFormValue(form, "pdfua", input.pdfua);

      return requestBinary(options, {
         path: "/forms/pdfengines/convert",
         body: form,
         headers: input.headers,
         trace: input.trace,
         outputFilename: input.outputFilename,
         signal: input.signal,
      });
   },
});

// ---- logger interface ----

export type GotenbergLogger = {
   info?: (message: string, meta?: Record<string, unknown>) => void;
   warn?: (message: string, meta?: Record<string, unknown>) => void;
   error?: (message: string, meta?: Record<string, unknown>) => void;
};

// ---- env helpers ----

const requireEnv = (name: string): string => {
   const value = process.env[name];
   if (!value) {
      throw new Error(`${name} environment variable is required`);
   }
   return value;
};

// ---- high-level class ----

export type GotenbergOptions = {
   logger?: GotenbergLogger;
   /** optional concurrency limiter shared across all requests from this instance */
   limiter?: GotenbergLimiter;
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

   // ---- utility ----

   async health(signal?: AbortSignal) {
      const result = await this.client.health(signal);
      this.logIfError("health", result);
      return result;
   }

   async version(signal?: AbortSignal) {
      const result = await this.client.version(signal);
      this.logIfError("version", result);
      return result;
   }

   // ---- chromium → pdf ----

   /** POST /forms/chromium/convert/url — convert a URL to pdf */
   async urlToPdf(input: ConvertUrlInput) {
      const result = await this.client.convertUrl(input);
      this.logIfError("urlToPdf", result);
      return result;
   }

   /** POST /forms/chromium/convert/html — convert an html document to pdf */
   async htmlToPdf(input: ConvertHtmlInput) {
      const result = await this.client.convertHtml(input);
      this.logIfError("htmlToPdf", result);
      return result;
   }

   /** POST /forms/chromium/convert/markdown — convert markdown to pdf via an html wrapper */
   async markdownToPdf(input: ConvertMarkdownInput) {
      const result = await this.client.convertMarkdown(input);
      this.logIfError("markdownToPdf", result);
      return result;
   }

   // ---- chromium → image ----

   /** POST /forms/chromium/screenshot/url — screenshot a URL */
   async screenshotUrl(input: ScreenshotUrlInput) {
      const result = await this.client.screenshotUrl(input);
      this.logIfError("screenshotUrl", result);
      return result;
   }

   /** POST /forms/chromium/screenshot/html — screenshot an html document */
   async screenshotHtml(input: ScreenshotHtmlInput) {
      const result = await this.client.screenshotHtml(input);
      this.logIfError("screenshotHtml", result);
      return result;
   }

   /** POST /forms/chromium/screenshot/markdown — screenshot markdown via an html wrapper */
   async screenshotMarkdown(input: ScreenshotMarkdownInput) {
      const result = await this.client.screenshotMarkdown(input);
      this.logIfError("screenshotMarkdown", result);
      return result;
   }

   /**
    * screenshot a url that serves a pdf. uses chromium's built-in pdf viewer
    * to render the pdf, then captures it as an image.
    *
    * note: the pdf must be accessible via a URL — this does not accept file uploads.
    * use `options.format` to choose between png, jpeg, or webp output.
    */
   async pdfToImage(input: ScreenshotUrlInput) {
      const result = await this.client.screenshotUrl(input);
      this.logIfError("pdfToImage", result);
      return result;
   }

   // ---- libreoffice → pdf ----

   /**
    * POST /forms/libreoffice/convert — convert office documents to pdf.
    * supports 80+ formats: docx, xlsx, pptx, odt, ods, odp, rtf, csv, etc.
    */
   async officeToPdf(input: ConvertOfficeInput) {
      const result = await this.client.convertOffice(input);
      this.logIfError("officeToPdf", result);
      return result;
   }

   /** convenience alias for officeToPdf — for .xls/.xlsx files */
   async excelToPdf(input: ConvertOfficeInput) {
      const result = await this.client.convertOffice(input);
      this.logIfError("excelToPdf", result);
      return result;
   }

   /** convenience alias for officeToPdf — for .doc/.docx files */
   async wordToPdf(input: ConvertOfficeInput) {
      const result = await this.client.convertOffice(input);
      this.logIfError("wordToPdf", result);
      return result;
   }

   // ---- pdf engines ----

   /** POST /forms/pdfengines/merge — merge multiple pdfs into one */
   async mergePdf(input: MergePdfInput) {
      const result = await this.client.mergePdf(input);
      this.logIfError("mergePdf", result);
      return result;
   }

   /** POST /forms/pdfengines/split — split pdfs by intervals or page ranges */
   async splitPdf(input: SplitPdfInput) {
      const result = await this.client.splitPdf(input);
      this.logIfError("splitPdf", result);
      return result;
   }

   /** POST /forms/pdfengines/flatten — flatten pdf form fields and annotations */
   async flattenPdf(input: FlattenPdfInput) {
      const result = await this.client.flattenPdf(input);
      this.logIfError("flattenPdf", result);
      return result;
   }

   /** POST /forms/pdfengines/encrypt — encrypt pdfs with user/owner passwords */
   async encryptPdf(input: EncryptPdfInput) {
      const result = await this.client.encryptPdf(input);
      this.logIfError("encryptPdf", result);
      return result;
   }

   /** POST /forms/pdfengines/embed — embed files inside pdfs */
   async embedFiles(input: EmbedFilesInput) {
      const result = await this.client.embedFiles(input);
      this.logIfError("embedFiles", result);
      return result;
   }

   /** POST /forms/pdfengines/metadata/read — read pdf metadata as json */
   async readMetadata(input: ReadMetadataInput) {
      const result = await this.client.readMetadata(input);
      this.logIfError("readMetadata", result);
      return result;
   }

   /** POST /forms/pdfengines/metadata/write — write metadata into pdfs */
   async writeMetadata(input: WriteMetadataInput) {
      const result = await this.client.writeMetadata(input);
      this.logIfError("writeMetadata", result);
      return result;
   }

   /** POST /forms/pdfengines/convert — convert pdfs to PDF/A or PDF/UA format */
   async convertToPdfa(input: ConvertToPdfaInput) {
      const result = await this.client.convertToPdfa(input);
      this.logIfError("convertToPdfa", result);
      return result;
   }
}
