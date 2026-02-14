import { mkdirSync, rmSync } from "node:fs";
import { randomUUID } from "node:crypto";

import { Gotenberg } from "../../src";
import type { GotenbergBinaryResponse, GotenbergFile } from "../../src/types";

export const BASE_URL = "http://localhost:3000";
export const TMP_OUTPUT_DIR = "test/.tmp";

export const makeBinaryResponse = (
  filename: string,
  contentType: string,
  trace = "server-trace",
) =>
  new Response(new Uint8Array([9, 9, 9, 9]), {
    status: 200,
    headers: {
      "content-type": contentType,
      "content-disposition": `filename="${filename}"`,
      "Gotenberg-Trace": trace,
    },
  });

export const writeArtifact = async (
  result: GotenbergBinaryResponse,
  nameHint: string,
  bucket: string[],
): Promise<string> => {
  mkdirSync(TMP_OUTPUT_DIR, { recursive: true });
  const filePath = `${TMP_OUTPUT_DIR}/${nameHint}-${randomUUID()}`;
  await Bun.write(filePath, result.blob);
  bucket.push(filePath);
  return filePath;
};

export const cleanupArtifacts = (bucket: string[]): void => {
  for (const path of bucket) {
    rmSync(path, { force: true });
  }
};

export const loadFixturePdf = async (): Promise<GotenbergFile> => ({
  name: "sample-pdf.pdf",
  data: await Bun.file("test/fixtures/sample-pdf.pdf").arrayBuffer(),
  contentType: "application/pdf",
});

export const loadFixtureDocx = async (): Promise<GotenbergFile> => ({
  name: "sample-docx.docx",
  data: await Bun.file("test/fixtures/sample-docx.docx").arrayBuffer(),
  contentType:
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
});

export const withTestGotenbergEnv = async <T>(
  testFn: (client: Gotenberg) => Promise<T>,
): Promise<T> => {
  const originalEnv = {
    GOTENBERG_URL: process.env.GOTENBERG_URL,
    GOTENBERG_API_BASIC_AUTH_USERNAME:
      process.env.GOTENBERG_API_BASIC_AUTH_USERNAME,
    GOTENBERG_API_BASIC_AUTH_PASSWORD:
      process.env.GOTENBERG_API_BASIC_AUTH_PASSWORD,
  };

  process.env.GOTENBERG_URL = BASE_URL;
  process.env.GOTENBERG_API_BASIC_AUTH_USERNAME = "u";
  process.env.GOTENBERG_API_BASIC_AUTH_PASSWORD = "p";

  try {
    return await testFn(new Gotenberg());
  } finally {
    process.env.GOTENBERG_URL = originalEnv.GOTENBERG_URL;
    process.env.GOTENBERG_API_BASIC_AUTH_USERNAME =
      originalEnv.GOTENBERG_API_BASIC_AUTH_USERNAME;
    process.env.GOTENBERG_API_BASIC_AUTH_PASSWORD =
      originalEnv.GOTENBERG_API_BASIC_AUTH_PASSWORD;
  }
};
