/**
 * Turns a stored avatar path into something an img tag can load.
 *
 * `profiles.avatar_url` holds a path inside the avatars bucket
 * (`<user id>/<file>`), never a full URL: the RPC that writes it refuses
 * anything else, so a stored value can never point at another host. The public
 * URL is assembled here rather than stored, which means moving the project or
 * the bucket does not require rewriting every row.
 */
export function avatarSrc(path: string | null | undefined): string | null {
  if (!path) return null;
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) return null;
  return `${base.replace(/\/$/, "")}/storage/v1/object/public/avatars/${path}`;
}
