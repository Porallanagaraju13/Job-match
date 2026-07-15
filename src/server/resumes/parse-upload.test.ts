import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { describe, expect, it, vi } from "vitest";
import { parseUploadedResume, ResumeParsingError } from "./parse-upload";

describe("parseUploadedResume", () => {
  it("returns extracted profile data for a readable PDF", async () => {
    const path = fileURLToPath(new URL("../../../tests/fixtures/real-resume.pdf", import.meta.url));
    const bytes = new Uint8Array(await readFile(path));
    const result = await parseUploadedResume({
      bytes,
      mimeType: "application/pdf",
      originalName: "real-resume.pdf",
    });

    expect(result.text).toContain("This is a real resume.");
    expect(result.extraction.skills).toContain("React");
    expect(result.quality.completenessScore).toBeGreaterThan(0);
  });

  it("rejects files that do not contain readable resume text", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);

    await expect(
      parseUploadedResume({
        bytes: Buffer.from("%PDF-1.4\n%%EOF"),
        mimeType: "application/pdf",
        originalName: "empty.pdf",
      }),
    ).rejects.toBeInstanceOf(ResumeParsingError);

    consoleError.mockRestore();
  });
});
