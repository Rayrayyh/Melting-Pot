import { CheckCircle } from "@phosphor-icons/react/dist/ssr";
import { passwordRules } from "@/lib/auth/password-rules";
import { cn } from "@/lib/cn";

/**
 * The live rule list under the signup password field: each requirement ticks
 * as it is met, so nobody learns the rules from a rejection. The rows only
 * change color and icon weight; nothing moves, so the form never jumps while
 * someone types.
 */
export function PasswordChecklist({ password }: { password: string }) {
  return (
    <ul aria-live="polite" className="mt-2 space-y-1">
      {passwordRules(password).map((rule) => (
        <li
          key={rule.id}
          className={cn(
            "flex items-center gap-1.5 text-[12px] transition-colors",
            rule.met ? "text-success" : "text-ink-faint",
          )}
        >
          <CheckCircle
            weight={rule.met ? "fill" : "regular"}
            className="size-3.5 shrink-0"
            aria-hidden
          />
          {rule.label}
          <span className="sr-only">{rule.met ? "(met)" : "(not met yet)"}</span>
        </li>
      ))}
    </ul>
  );
}
