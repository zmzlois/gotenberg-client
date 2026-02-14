import { Result } from "./types";
import type {
  GotenbergBinaryResponse,
  GotenbergClientOptions,
  GotenbergError,
  GotenbergFile,
} from "./types";

const TRACE_HEADER = "Gotenberg-Trace";
const OUTPUT_FILENAME_HEADER = "Gotenberg-Output-Filename";

export const joinUrl = (baseUrl: string, path: string): string => {
  const trimmedBase = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
  const trimmedPath = path.startsWith("/") ? path : `/${path}`;
  return `${trimmedBase}${trimmedPath}`;
};

const parseFilename = (contentDisposition: string | null): string | null => {
  if (!contentDisposition) return null;
  const match = /filename="?([^"]+)"?/i.exec(contentDisposition);
  return match?.[1] ?? null;
};

export const appendFormValue = (
  form: FormData,
  key: string,
  value: unknown,
): void => {
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

export const appendFile = (
  form: FormData,
  field: string,
  file: GotenbergFile,
): void => {
  form.append(field, toBlob(file.data, file.contentType), file.name);
};

export const appendFiles = (form: FormData, files: GotenbergFile[]): void => {
  for (const file of files) appendFile(form, "files", file);
};

export const appendOptions = (
  form: FormData,
  options: Record<string, unknown> | undefined,
): void => {
  if (!options) return;
  for (const [key, value] of Object.entries(options)) {
    appendFormValue(form, key, value);
  }
};

export const appendEmbeds = (
  form: FormData,
  embeds: GotenbergFile[] | undefined,
): void => {
  if (!embeds) return;
  for (const file of embeds) appendFile(form, "embeds", file);
};

export const prepareHtmlFile = (
  indexHtml: string | GotenbergFile,
): GotenbergFile =>
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
  requestHeaders: Record<string, string> | undefined,
  trace: string | undefined,
  outputFilename: string | undefined,
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
    if (!encoded.ok) {
      return {
        ok: false,
        error: encoded.error,
      };
    }
    headers.set("Authorization", `Basic ${encoded.value}`);
  }

  return Result.ok(headers);
};

const withTimeoutSignal = (
  signal: AbortSignal | undefined,
  timeoutMs: number | undefined,
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
  if (!headersResult.ok) {
    return {
      ok: false,
      error: headersResult.error,
    };
  }

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

export const requestBinary = async (
  options: GotenbergClientOptions,
  input: RequestInput,
): Promise<Result<GotenbergBinaryResponse, GotenbergError>> => {
  const fetchResult = await doFetch(options, input);
  if (!fetchResult.ok) {
    return {
      ok: false,
      error: fetchResult.error,
    };
  }
  return handleBinaryResponse(fetchResult.value);
};

export const requestJson = async <T>(
  options: GotenbergClientOptions,
  input: RequestInput,
): Promise<Result<T, GotenbergError>> => {
  const fetchResult = await doFetch(options, {
    ...input,
    method: input.method ?? "GET",
  });
  if (!fetchResult.ok) {
    return {
      ok: false,
      error: fetchResult.error,
    };
  }

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

export const requestText = async (
  options: GotenbergClientOptions,
  input: RequestInput,
): Promise<Result<string, GotenbergError>> => {
  const fetchResult = await doFetch(options, {
    ...input,
    method: input.method ?? "GET",
  });
  if (!fetchResult.ok) {
    return {
      ok: false,
      error: fetchResult.error,
    };
  }

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
