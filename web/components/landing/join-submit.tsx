"use client";

import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

/**
 * The submit button for joining or opening a Pot.
 *
 * The action behind it finalizes membership in the database and then
 * redirects, which takes a beat. Without this the button sat there looking
 * untouched for that whole beat, so people pressed it again. useFormStatus
 * reads the pending state of the form it sits inside, which is why this is a
 * separate component: the hook only sees a form from within.
 */
export function JoinSubmit({ label, busyLabel }: { label: string; busyLabel: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" className="w-full" disabled={pending}>
      {pending ? (
        <>
          <Spinner label={null} />
          {busyLabel}
        </>
      ) : (
        label
      )}
    </Button>
  );
}
