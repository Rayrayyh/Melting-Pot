"use client";

import { getClientAuth } from "@/lib/auth/client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { CaretUpDown, GearSix, Info, SignOut, User } from "@phosphor-icons/react";
import { Avatar } from "@/components/ui/avatar";

/**
 * The account control, anchored to the bottom of the left nav. Identity sits
 * where the person's own things live, leaving the top bar to the Pot they are
 * reading.
 */
export function NavProfile({ displayName, email }: { displayName: string; email: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  function go(href: string) {
    setOpen(false);
    router.push(href);
  }

  return (
    <div className="relative border-t border-edge p-2">
      {open ? (
        <>
          <div className="fixed inset-0 z-40" aria-hidden onClick={() => setOpen(false)} />
          <div className="absolute bottom-full left-2 right-2 z-50 mb-1 rounded-(--radius-card) border border-edge bg-surface py-1.5 shadow-(--shadow-raised)">
            <MenuItem
              icon={<User className="size-4" />}
              label="My contributions"
              onClick={() => go("/me/contributions")}
            />
            <MenuItem
              icon={<GearSix className="size-4" />}
              label="Settings"
              onClick={() => go("/me/settings")}
            />
            <MenuItem
              icon={<Info className="size-4" />}
              label="About MeltingPot"
              onClick={() => go("/")}
            />
            <div className="my-1 border-t border-edge" />
            <MenuItem
              icon={<SignOut className="size-4" />}
              label="Log out"
              onClick={async () => {
                setOpen(false);
                await getClientAuth().signOut();
                router.push("/");
                router.refresh();
              }}
            />
          </div>
        </>
      ) : null}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Account menu"
        aria-expanded={open}
        className="flex w-full items-center gap-2.5 rounded-(--radius-control) p-1.5 text-left transition-colors hover:bg-sunken"
      >
        <Avatar name={displayName} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium text-ink">{displayName}</span>
          <span className="block truncate text-[12px] text-ink-muted">{email}</span>
        </span>
        <CaretUpDown className="size-4 shrink-0 text-ink-faint" aria-hidden />
      </button>
    </div>
  );
}

function MenuItem({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-2.5 px-3.5 py-2 text-sm text-ink-muted transition-colors hover:bg-sunken hover:text-ink"
    >
      {icon}
      {label}
    </button>
  );
}
