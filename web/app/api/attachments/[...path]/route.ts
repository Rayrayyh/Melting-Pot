import { supabaseServer } from "@/lib/supabase/server";
import {
  claimIsHonest,
  looksExecutable,
  safeFileName,
  sniffMime,
} from "@/lib/attachments/serve";

// Serves uploaded attachment files from the private storage bucket. The
// download runs with the viewer's own session, so storage RLS (Pot
// membership on the first path segment) decides access; this route adds no
// authority of its own.
export async function GET(
  _request: Request,
  context: { params: Promise<{ path: string[] }> },
) {
  const { path } = await context.params;
  const storagePath = path.join("/");
  if (!storagePath) {
    return new Response("Not found", { status: 404 });
  }

  const supabase = await supabaseServer();
  const { data, error } = await supabase.storage
    .from("attachments")
    .download(storagePath);
  if (error || !data) {
    return new Response("Not found", { status: 404 });
  }

  // Object keys are ASCII-safe upload artifacts; the student's real file
  // name lives on the attachments row and becomes the download filename.
  const { data: row } = await supabase
    .from("attachments")
    .select("name")
    .eq("storage_path", storagePath)
    .maybeSingle();
  const baseName = storagePath.split("/").pop() ?? "attachment";
  const fileName = safeFileName(row?.name, baseName.replace(/^\d+-/, "") || "attachment");

  // The bucket only ever checked the type the uploader declared, and the row's
  // name is caller-controlled, so a file could claim to be a PDF, be named
  // .exe, and be neither. Read the leading bytes and refuse to pass on a claim
  // they do not support. This is not a malware scan: a genuine PDF that is
  // also malicious still downloads as a PDF.
  const head = new Uint8Array(await data.slice(0, 64).arrayBuffer());
  const sniffed = sniffMime(head);
  const declared = data.type || null;
  const disguised = looksExecutable(head) || !claimIsHonest(declared, sniffed);

  return new Response(data, {
    headers: {
      "Content-Type": disguised ? "application/octet-stream" : declared || "application/octet-stream",
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(
        disguised ? `${fileName}.bin` : fileName,
      )}`,
      // Never let a browser second-guess the type we just settled on.
      "X-Content-Type-Options": "nosniff",
      // Stored objects never change under their key, so the browser may keep
      // one for a few minutes. Private, so no shared cache ever holds a class
      // file, and short, so losing access to a Pot takes effect quickly.
      "Cache-Control": "private, max-age=300",
    },
  });
}
