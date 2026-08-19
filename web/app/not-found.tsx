import { CookingPot } from "@phosphor-icons/react/dist/ssr";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-24 gap-5 text-center">
      <CookingPot className="size-10 text-ink-faint" aria-hidden />
      <div className="space-y-1.5">
        <h1 className="text-xl font-semibold tracking-tight">
          This page isn&apos;t in the Pot
        </h1>
        <p className="text-sm text-ink-muted max-w-sm">
          The link may be wrong, or you may not be a member of this Pot yet.
          Joining takes one class code.
        </p>
      </div>
      <div className="flex gap-2.5">
        <Button href="/home" variant="secondary">
          Go home
        </Button>
        <Button href="/">Enter a class code</Button>
      </div>
    </div>
  );
}
