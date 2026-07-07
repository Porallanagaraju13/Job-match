import "server-only";

import { inflateRawSync, inflateSync } from "node:zlib";
import mammoth from "mammoth";
import { PDFParse } from "pdf-parse";

function compactWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function cleanExtractedText(value: string) {
  return value
    .replace(/\u0000/g, "")
    .replace(/\u00a0/g, " ")
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t\f\v]+/g, " ")
    .replace(/[ \t]*\n[ \t]*/g, "\n")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function decodeXmlEntities(value: string) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([a-f0-9]+);/gi, (_, code) => String.fromCharCode(Number.parseInt(code, 16)));
}

function printableText(bytes: Uint8Array) {
  return Buffer.from(bytes)
    .toString("latin1")
    .replace(/[^\x09\x0a\x0d\x20-\x7e]+/g, " ")
    .replace(/[ \t\f\v]+/g, " ");
}

function decodePdfLiteral(value: string) {
  return value
    .replace(/\\n/g, "\n")
    .replace(/\\r/g, "\r")
    .replace(/\\t/g, "\t")
    .replace(/\\b/g, "\b")
    .replace(/\\f/g, "\f")
    .replace(/\\([\\()])/g, "$1")
    .replace(/\\\d{1,3}/g, " ");
}

function extractPdfStrings(value: string) {
  const strings: string[] = [];
  for (const match of value.matchAll(/\((?:\\.|[^\\)]){2,}\)/g)) {
    strings.push(decodePdfLiteral(match[0].slice(1, -1)));
  }
  for (const match of value.matchAll(/<([0-9a-fA-F\s]{8,})>/g)) {
    const hex = match[1].replace(/\s+/g, "");
    if (hex.length % 2 !== 0) continue;
    const decoded = Buffer.from(hex, "hex").toString("utf16le");
    if (/[a-z]{3,}/i.test(decoded)) strings.push(decoded);
  }
  return strings.join("\n");
}

function extractPdfTextFallback(bytes: Uint8Array) {
  const buffer = Buffer.from(bytes);
  const raw = buffer.toString("latin1");
  const chunks = [extractPdfStrings(raw)];
  let cursor = 0;

  while (cursor < raw.length) {
    const streamStart = raw.indexOf("stream", cursor);
    if (streamStart === -1) break;
    const streamEnd = raw.indexOf("endstream", streamStart);
    if (streamEnd === -1) break;

    const dictionaryStart = Math.max(0, raw.lastIndexOf("<<", streamStart));
    const dictionary = raw.slice(dictionaryStart, streamStart);
    const dataStart = streamStart + "stream".length + (raw[streamStart + 6] === "\r" ? 2 : 1);
    const stream = buffer.subarray(dataStart, streamEnd);

    if (dictionary.includes("/FlateDecode")) {
      try {
        chunks.push(extractPdfStrings(inflateSync(stream).toString("latin1")));
      } catch {
        try {
          chunks.push(extractPdfStrings(inflateRawSync(stream).toString("latin1")));
        } catch {
          // Some PDF streams are images or use unsupported filters.
        }
      }
    }

    cursor = streamEnd + "endstream".length;
  }

  const text = cleanExtractedText(chunks.join("\n"));
  return text.length > 80 ? text : cleanExtractedText(`${text}\n${printableText(bytes)}`);
}

async function extractPdfText(bytes: Uint8Array) {
  let parser: PDFParse | null = null;
  try {
    parser = new PDFParse({ data: new Uint8Array(Buffer.from(bytes)) });
    const result = await parser.getText();
    const pageText = result.pages.map((page) => page.text).filter(Boolean).join("\n\n");
    const text = cleanExtractedText(pageText || result.text);
    if (text.length > 80) return text;
  } catch {
    // Fall back to a lightweight text stream reader for PDFs pdf.js cannot decode.
  } finally {
    if (parser) await parser.destroy().catch(() => undefined);
  }

  return extractPdfTextFallback(bytes);
}

type ZipEntry = {
  name: string;
  compressionMethod: number;
  compressedSize: number;
  localHeaderOffset: number;
};

function readUInt16(buffer: Buffer, offset: number) {
  return offset + 2 <= buffer.length ? buffer.readUInt16LE(offset) : 0;
}

function readUInt32(buffer: Buffer, offset: number) {
  return offset + 4 <= buffer.length ? buffer.readUInt32LE(offset) : 0;
}

function zipEntries(buffer: Buffer) {
  const entries: ZipEntry[] = [];
  const endOffset = buffer.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
  if (endOffset === -1) return entries;

  const centralDirectorySize = readUInt32(buffer, endOffset + 12);
  const centralDirectoryOffset = readUInt32(buffer, endOffset + 16);
  let cursor = centralDirectoryOffset;
  const limit = Math.min(buffer.length, centralDirectoryOffset + centralDirectorySize);

  while (cursor + 46 <= limit && readUInt32(buffer, cursor) === 0x02014b50) {
    const compressionMethod = readUInt16(buffer, cursor + 10);
    const compressedSize = readUInt32(buffer, cursor + 20);
    const fileNameLength = readUInt16(buffer, cursor + 28);
    const extraLength = readUInt16(buffer, cursor + 30);
    const commentLength = readUInt16(buffer, cursor + 32);
    const localHeaderOffset = readUInt32(buffer, cursor + 42);
    const name = buffer.subarray(cursor + 46, cursor + 46 + fileNameLength).toString("utf8");

    entries.push({ name, compressionMethod, compressedSize, localHeaderOffset });
    cursor += 46 + fileNameLength + extraLength + commentLength;
  }

  return entries;
}

function readZipEntry(buffer: Buffer, entry: ZipEntry) {
  const cursor = entry.localHeaderOffset;
  if (readUInt32(buffer, cursor) !== 0x04034b50) return null;

  const fileNameLength = readUInt16(buffer, cursor + 26);
  const extraLength = readUInt16(buffer, cursor + 28);
  const dataStart = cursor + 30 + fileNameLength + extraLength;
  const data = buffer.subarray(dataStart, dataStart + entry.compressedSize);

  if (entry.compressionMethod === 0) return data;
  if (entry.compressionMethod === 8) {
    try {
      return inflateRawSync(data);
    } catch {
      return null;
    }
  }
  return null;
}

function extractDocxTextFallback(bytes: Uint8Array) {
  const buffer = Buffer.from(bytes);
  const documentParts = zipEntries(buffer)
    .filter((entry) => /^word\/(document|header\d*|footer\d*|comments)\.xml$/i.test(entry.name))
    .map((entry) => readZipEntry(buffer, entry))
    .filter((entry): entry is Buffer => Boolean(entry));

  const text = documentParts
    .map((part) =>
      decodeXmlEntities(
        part
          .toString("utf8")
          .replace(/<w:tab\/>/g, " ")
          .replace(/<\/w:p>/g, "\n")
          .replace(/<[^>]+>/g, " "),
      ),
    )
    .join("\n");

  return cleanExtractedText(text);
}

async function extractDocxText(bytes: Uint8Array) {
  try {
    const result = await mammoth.extractRawText({ buffer: Buffer.from(bytes) });
    const text = cleanExtractedText(result.value);
    if (text.length > 80) return text;
  } catch {
    // Keep the custom XML reader as a dependency-light fallback.
  }

  return extractDocxTextFallback(bytes);
}

export async function extractResumeText({
  bytes,
  mimeType,
  originalName,
}: {
  bytes: Uint8Array;
  mimeType: string;
  originalName: string;
}) {
  const extension = originalName.split(".").pop()?.toLowerCase();
  if (mimeType === "application/pdf" || extension === "pdf") return extractPdfText(bytes);
  if (
    mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    extension === "docx"
  ) {
    return extractDocxText(bytes);
  }
  return compactWhitespace(printableText(bytes));
}
