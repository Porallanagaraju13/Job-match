import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { extractResumeText } from "./text-extraction";

describe("extractResumeText", () => {
  it("extracts readable text from a valid PDF fixture", async () => {
    const path = fileURLToPath(new URL("../../../tests/fixtures/real-resume.pdf", import.meta.url));
    const bytes = new Uint8Array(await readFile(path));
    const text = await extractResumeText({
      bytes,
      mimeType: "application/pdf",
      originalName: "real-resume.pdf",
    });

    expect(text).toContain("This is a real resume.");
    expect(text).toContain("Name: John Doe");
    expect(text).toContain("Skills: React, Node.js");
  });
});
