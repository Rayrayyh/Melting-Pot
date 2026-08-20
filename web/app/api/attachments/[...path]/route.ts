import { supabaseServer } from "@/lib/supabase/server";

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
  const fileName = row?.name ?? baseName.replace(/^\d+-/, "");

  return new Response(data, {
    headers: {
      "Content-Type": data.type || "application/octet-stream",
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`,
      "Cache-Control": "private, max-age=0, must-revalidate",
    },
  });
}
