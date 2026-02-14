import { describe, expect, test } from "bun:test";

import { Gotenberg } from "../src";
import { assertResultOk, withMockedFetch } from "./utils/test-utils";
import {
  BASE_URL,
  cleanupArtifacts,
  loadFixtureDocx,
  makeBinaryResponse,
  withTestGotenbergEnv,
  writeArtifact,
} from "./utils/gotenberg-test-helpers";

describe("Gotenberg class client", () => {
  describe("office helpers", () => {
    type OfficeResult = Awaited<ReturnType<Gotenberg["officeToPdf"]>>;

    test("Gotenberg office helpers wrap convertOffice and pass through outputs", async () => {
      const artifacts: string[] = [];
      const docx = await loadFixtureDocx();
      const { restore } = withMockedFetch(async (request) => {
        expect(request.url).toBe(`${BASE_URL}/forms/libreoffice/convert`);
        const form = await request.formData();
        expect(form.getAll("files")).toHaveLength(1);
        return makeBinaryResponse("office.pdf", "application/pdf");
      });

      const wrappers: Array<{ name: string; run: (client: Gotenberg) => Promise<OfficeResult> }> =
        [
          {
            name: "officeToPdf",
            run: (client) =>
              client.officeToPdf({ files: [docx], outputFilename: "office.pdf" }),
          },
          {
            name: "excelToPdf",
            run: (client) =>
              client.excelToPdf({ files: [docx], outputFilename: "office.pdf" }),
          },
          {
            name: "wordToPdf",
            run: (client) =>
              client.wordToPdf({ files: [docx], outputFilename: "office.pdf" }),
          },
        ];

      try {
        for (const wrapper of wrappers) {
          const result = await withTestGotenbergEnv(wrapper.run);
          assertResultOk(result);
          const artifact = await writeArtifact(result.value, `class-${wrapper.name}`, artifacts);
          expect(artifact).toContain("class-");
          expect(result.value.filename).toBe("office.pdf");
        }
      } finally {
        restore();
        cleanupArtifacts(artifacts);
      }
    });
  });
});
