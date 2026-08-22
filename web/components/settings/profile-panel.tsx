"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, Check, Trash } from "@phosphor-icons/react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardSection, Eyebrow } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { avatarSrc } from "@/lib/avatar-url";
import { supabaseBrowser } from "@/lib/supabase/client";

const MAX_BYTES = 2 * 1024 * 1024;
const TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"];

/**
 * Your name and your picture, the two things about an account that belong to
 * the person rather than to the app.
 *
 * The picture goes to Storage from the browser, and only its path is written
 * to the profile: update_my_profile refuses a path outside the caller's own
 * folder, so the column can never end up pointing at another host.
 */
export function ProfilePanel({
  userId,
  email,
  initialName,
  initialAvatarPath,
}: {
  userId: string;
  email: string;
  initialName: string;
  initialAvatarPath: string | null;
}) {
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(initialName);
  const [avatarPath, setAvatarPath] = useState(initialAvatarPath);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const trimmed = name.trim();
  const dirty = trimmed !== initialName.trim() || avatarPath !== initialAvatarPath;
  const nameValid = trimmed.length >= 1 && trimmed.length <= 80;

  async function pickFile(file: File) {
    setError(null);
    if (!TYPES.includes(file.type)) {
      setError("That file is not an image MeltingPot can show. Use a PNG, JPEG, WEBP or GIF.");
      return;
    }
    if (file.size > MAX_BYTES) {
      setError("That picture is over 2 MB. Try a smaller one.");
      return;
    }
    setUploading(true);
    // The finally matters: an upload that throws must give the control back.
    try {
      const extension = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "png";
      // The name changes every time so a replaced picture is never served
      // from a cache under the old URL.
      const path = `${userId}/${Date.now()}.${extension}`;
      const { error: uploadError } = await supabaseBrowser()
        .storage.from("avatars")
        .upload(path, file, { upsert: true, contentType: file.type });
      if (uploadError) {
        setError("That picture could not be uploaded. Try again.");
        return;
      }
      setAvatarPath(path);
      setSaved(false);
    } catch {
      setError("The connection dropped while uploading. Try again.");
    } finally {
      setUploading(false);
    }
  }

  async function save() {
    if (!nameValid || saving) return;
    setSaving(true);
    setError(null);
    try {
      const { error: rpcError } = await supabaseBrowser().rpc("update_my_profile", {
        p_display_name: trimmed,
        p_avatar_url: avatarPath,
      });
      if (rpcError) {
        setError(
          rpcError.message.includes("invalid_display_name")
            ? "A display name needs at least one character."
            : "That could not be saved. Try again.",
        );
        return;
      }
      setSaved(true);
      // Every screen reads the name and picture from the server, so they have
      // to be told this changed.
      router.refresh();
    } catch {
      setError("The connection dropped while saving. Try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardSection className="space-y-5">
        <div className="space-y-1.5">
          <Eyebrow>Profile</Eyebrow>
          <p className="text-sm text-ink-muted leading-relaxed">
            How your name and picture appear on everything you share.
          </p>
        </div>

        <div className="flex items-center gap-4">
          <Avatar name={trimmed || initialName} src={avatarSrc(avatarPath)} size="lg" />
          <div className="flex flex-wrap items-center gap-2">
            <input
              ref={fileInput}
              type="file"
              accept={TYPES.join(",")}
              className="sr-only"
              onChange={(event) => {
                const file = event.target.files?.[0];
                // Clearing the input lets the same file be picked again after
                // a failure, which otherwise fires no change event.
                event.target.value = "";
                if (file) void pickFile(file);
              }}
            />
            <Button
              variant="secondary"
              size="sm"
              onClick={() => fileInput.current?.click()}
              disabled={uploading}
            >
              {uploading ? <Spinner label={null} /> : <Camera className="size-4" />}
              {uploading ? "Uploading" : avatarPath ? "Change picture" : "Upload a picture"}
            </Button>
            {avatarPath ? (
              <Button
                variant="quiet"
                size="sm"
                onClick={() => {
                  setAvatarPath(null);
                  setSaved(false);
                }}
                disabled={uploading}
              >
                <Trash className="size-4" />
                Remove
              </Button>
            ) : null}
          </div>
        </div>

        <div className="space-y-1.5">
          <Field label="Display name">
            {(props) => (
              <Input
                {...props}
                value={name}
                maxLength={80}
                onChange={(event) => {
                  setName(event.target.value);
                  setSaved(false);
                }}
              />
            )}
          </Field>
          <p className="text-[12px] text-ink-faint">
            Signed in as {email}. Your email is never shown to the class.
          </p>
        </div>

        {error ? (
          <p role="alert" className="text-[13px] text-danger">
            {error}
          </p>
        ) : null}

        <div className="flex items-center gap-3">
          <Button onClick={() => void save()} disabled={!dirty || !nameValid || saving || uploading}>
            {saving ? <Spinner label={null} /> : null}
            {saving ? "Saving" : "Save profile"}
          </Button>
          {saved && !dirty ? (
            <span className="inline-flex items-center gap-1.5 text-[13px] text-success">
              <Check weight="bold" className="size-3.5" aria-hidden />
              Saved
            </span>
          ) : null}
        </div>
      </CardSection>
    </Card>
  );
}
