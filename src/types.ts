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

// ---- logger interface ----

export type GotenbergLogger = {
  info?: (message: string, meta?: Record<string, unknown>) => void;
  warn?: (message: string, meta?: Record<string, unknown>) => void;
  error?: (message: string, meta?: Record<string, unknown>) => void;
};

// ---- high-level class config ----

export type GotenbergOptions = {
  logger?: GotenbergLogger;
  /** optional concurrency limiter shared across all requests from this instance */
  limiter?: GotenbergLimiter;
};
