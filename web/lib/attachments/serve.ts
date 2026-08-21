/**
 * What a downloaded attachment is allowed to claim about itself.
 *
 * The storage bucket only ever checked the MIME type the uploader declared,
 * and the file name on the attachments row is caller-controlled and goes
 * straight into Content-Disposition. Together that let someone upload
 * executable bytes while declaring application/pdf, name the row
 * "LectureNotes.exe", share it, and offer the class a trusted-looking
 * download. Uploads go from the browser to Storage directly, so there is no
 * server hop to validate on: the download route is the choke point every
 * viewer passes through, and it is where this runs.
 *
 * This narrows the hole rather than closing it. Verifying that the bytes match
 * the claim stops the disguise, but it is not malware scanning: a real PDF
 * that happens to be malicious still downloads as a PDF.
 */

/** Leading bytes that identify a format, longest first so PDF beats nothing. */
const SIGNATURES: Array<{ mime: string; bytes: number[]; offset?: number }> = [
  { mime: "application/pdf", bytes: [0x25, 0x50, 0x44, 0x46] }, // %PDF
  { mime: "image/png", bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] },
  { mime: "image/jpeg", bytes: [0xff, 0xd8, 0xff] },
  { mime: "image/gif", bytes: [0x47, 0x49, 0x46, 0x38] },
  { mime: "image/webp", bytes: [0x57, 0x45, 0x42, 0x50], offset: 8 },
  // Office documents and every other zip container share this one.
  { mime: "application/zip", bytes: [0x50, 0x4b, 0x03, 0x04] },
];

/** Executable headers, which no attachment should ever begin with. */
const EXECUTABLE: Array<{ label: string; bytes: number[] }> = [
  { label: "dos/pe", bytes: [0x4d, 0x5a] }, // MZ: .exe, .dll
  { label: "elf", bytes: [0x7f, 0x45, 0x4c, 0x46] },
  { label: "mach-o", bytes: [0xfe, 0xed, 0xfa, 0xce] },
  { label: "mach-o", bytes: [0xcf, 0xfa, 0xed, 0xfe] },
  { label: "shebang", bytes: [0x23, 0x21] }, // #!
];

function startsWith(head: Uint8Array, bytes: number[], offset = 0): boolean {
  if (head.length < offset + bytes.length) return false;
  return bytes.every((b, i) => head[offset + i] === b);
}

/** The format the bytes actually are, or null when nothing matches. */
export function sniffMime(head: Uint8Array): string | null {
  for (const sig of SIGNATURES) {
    if (startsWith(head, sig.bytes, sig.offset)) return sig.mime;
  }
  return null;
}

export function looksExecutable(head: Uint8Array): boolean {
  return EXECUTABLE.some((sig) => startsWith(head, sig.bytes));
}

/**
 * A file name safe to put in a header and safe to land in a downloads folder.
 *
 * Strips directory separators so nothing can traverse, drops control
 * characters so the header cannot be split, and refuses a trailing dot, which
 * Windows silently removes and which can therefore hide the real extension.
 */
export function safeFileName(name: string | null | undefined, fallback: string): string {
  const raw = (name ?? "").trim();
  const cleaned = raw
    .replace(/[/\\]/g, "-")
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .replace(/^\.+/, "")
    .replace(/\.+$/, "")
    .slice(0, 200)
    .trim();
  return cleaned || fallback;
}

/**
 * Whether the declared type is consistent with the bytes.
 *
 * Unknown-to-us formats (plain text, Office's inner types, anything without a
 * signature above) are not treated as a mismatch: the point is to catch a file
 * pretending to be something it is not, not to allowlist formats twice.
 */
export function claimIsHonest(declared: string | null, sniffed: string | null): boolean {
  if (!sniffed) return true;
  if (!declared) return false;
  if (declared === sniffed) return true;
  // Office files are zip containers, so a zip signature under an Office or
  // OpenDocument type is exactly what a real one looks like.
  if (sniffed === "application/zip") {
    return (
      declared.startsWith("application/vnd.openxmlformats-officedocument") ||
      declared.startsWith("application/vnd.oasis.opendocument") ||
      declared === "application/zip"
    );
  }
  return false;
}
