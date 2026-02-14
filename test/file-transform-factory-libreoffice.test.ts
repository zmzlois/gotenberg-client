import { describe, expect, test } from "bun:test";

import { createGotenbergClient } from "../src";
import { assertResultOk, withMockedFetch } from "./utils/test-utils";
import {
  BASE_URL,
  cleanupArtifacts,
  loadFixtureDocx,
  loadFixturePdf,
  makeBinaryResponse,
  writeArtifact,
} from "./utils/gotenberg-test-helpers";

describe("createGotenbergClient", () => {
  describe("libreoffice converters", () => {
    test("convertOffice forwards LibreOffice files and options with embeds", async () => {
      const artifacts: string[] = [];
      const docx = await loadFixtureDocx();
      const pdf = await loadFixturePdf();

      const { restore } = withMockedFetch(async (request) => {
        expect(request.url).toBe(`${BASE_URL}/forms/libreoffice/convert`);
        const form = await request.formData();
        expect(form.getAll("files")).toHaveLength(1);
        expect(form.getAll("embeds")).toHaveLength(1);
        expect(form.get("pdfa")).toBe("PDF/A-3b");
        expect(form.get("quality")).toBe("90");
        return makeBinaryResponse("office.pdf", "application/pdf");
      });

      const client = createGotenbergClient({
        baseUrl: BASE_URL,
        basicAuth: { username: "u", password: "p" },
      });

      try {
        const result = await client.convertOffice({
          files: [docx],
          embeds: [pdf],
          outputFilename: "office.pdf",
          options: {
            pdfa: "PDF/A-3b",
            quality: 90,
          },
        });
        assertResultOk(result);
        await writeArtifact(result.value, "convert-office", artifacts);
        expect(result.value.filename).toBe("office.pdf");
      } finally {
        restore();
        cleanupArtifacts(artifacts);
      }
    });
  });
});
