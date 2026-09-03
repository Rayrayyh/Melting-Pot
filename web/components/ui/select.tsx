"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { CaretUpDown, Check } from "@phosphor-icons/react";
import { cn } from "@/lib/cn";

export type SelectOption<T extends string> = { value: T; label: string };

/** The one easing the sidebar, its card and every menu in the product share. */
export const MENU_EASE = [0.075, 0.82, 0.165, 1] as const;

/**
 * The product's own dropdown, standing in for the browser's select.
 *
 * A native select paints its list in the operating system's style, so a warm
 * paper page grew a blue system menu the moment anyone sorted it. This is the
 * account menu from the foot of the sidebar, generalised: the same raised
 * card, the same rows, the same short rise on open, with a check against the
 * current choice. Keyboard reach matches the native control: arrows walk the
 * list, Home and End jump, typing a letter finds the next option starting
 * with it, Enter or Space picks, Escape leaves it as it was.
 */
export function Select<T extends string>({
  value,
  options,
  onChange,
  label,
  labelledBy,
  size = "md",
  align = "end",
  className,
}: {
  value: T;
  options: ReadonlyArray<SelectOption<T>>;
  onChange: (value: T) => void;
  /** Accessible name when there is no visible label element. */
  label?: string;
  /** id of the visible label, read out before the current choice. */
  labelledBy?: string;
  size?: "sm" | "md";
  /** Which edge of the trigger the list lines up with. */
  align?: "start" | "end";
  className?: string;
}) {
  const id = useId();
  const listId = `${id}-list`;
  const triggerId = `${id}-trigger`;
  const reduceMotion = useReducedMotion();
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const [open, setOpen] = useState(false);
  const selectedIndex = Math.max(
    0,
    options.findIndex((option) => option.value === value),
  );
  const [activeIndex, setActiveIndex] = useState(selectedIndex);
  const selected = options[selectedIndex];

  function show() {
    setActiveIndex(selectedIndex);
    setOpen(true);
  }

  function hide(returnFocus = true) {
    setOpen(false);
    if (returnFocus) triggerRef.current?.focus();
  }

  function choose(index: number) {
    const option = options[index];
    hide();
    if (option && option.value !== value) onChange(option.value);
  }

  // A press anywhere outside closes the list without swallowing that press.
  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  // The list takes focus as it opens so the arrow keys land in it, and the
  // active row is kept in view as it moves.
  useEffect(() => {
    if (open) listRef.current?.focus({ preventScroll: true });
  }, [open]);
  useEffect(() => {
    if (!open) return;
    const row = listRef.current?.children[activeIndex] as HTMLElement | undefined;
    row?.scrollIntoView({ block: "nearest" });
  }, [open, activeIndex]);

  function onTriggerKeyDown(event: ReactKeyboardEvent<HTMLButtonElement>) {
    if (["ArrowDown", "ArrowUp", "Enter", " "].includes(event.key)) {
      event.preventDefault();
      show();
    }
  }

  function onListKeyDown(event: ReactKeyboardEvent<HTMLUListElement>) {
    const last = options.length - 1;
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        setActiveIndex((i) => Math.min(last, i + 1));
        return;
      case "ArrowUp":
        event.preventDefault();
        setActiveIndex((i) => Math.max(0, i - 1));
        return;
      case "Home":
        event.preventDefault();
        setActiveIndex(0);
        return;
      case "End":
        event.preventDefault();
        setActiveIndex(last);
        return;
      case "Enter":
      case " ":
        event.preventDefault();
        choose(activeIndex);
        return;
      case "Escape":
        event.preventDefault();
        hide();
        return;
      case "Tab":
        setOpen(false);
        return;
      default:
    }
    if (event.key.length === 1 && !event.metaKey && !event.ctrlKey && !event.altKey) {
      const key = event.key.toLowerCase();
      const count = options.length;
      for (let step = 1; step <= count; step += 1) {
        const i = (activeIndex + step) % count;
        if (options[i].label.toLowerCase().startsWith(key)) {
          setActiveIndex(i);
          return;
        }
      }
    }
  }

  return (
    <div ref={rootRef} className={cn("relative inline-block", className)}>
      <button
        ref={triggerRef}
        id={triggerId}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-label={labelledBy ? undefined : label}
        aria-labelledby={labelledBy ? `${labelledBy} ${triggerId}` : undefined}
        onClick={() => (open ? hide(false) : show())}
        onKeyDown={onTriggerKeyDown}
        className={cn(
          "inline-flex w-full items-center gap-2 rounded-(--radius-control) border border-edge-strong bg-surface text-ink transition-colors hover:border-primary focus-visible:border-primary",
          size === "sm" ? "h-8 pl-2.5 pr-2 text-[13px]" : "h-9 pl-3 pr-2 text-[13px]",
          open && "border-primary",
        )}
      >
        <span className="min-w-0 flex-1 truncate text-left">{selected?.label}</span>
        <CaretUpDown
          aria-hidden
          className={cn(
            "size-3.5 shrink-0 text-ink-faint transition-colors",
            open && "text-primary",
          )}
        />
      </button>
      <AnimatePresence>
        {open ? (
          <motion.ul
            ref={listRef}
            id={listId}
            role="listbox"
            tabIndex={-1}
            aria-labelledby={labelledBy}
            aria-label={labelledBy ? undefined : label}
            aria-activedescendant={`${id}-opt-${activeIndex}`}
            onKeyDown={onListKeyDown}
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: reduceMotion ? 0 : 0.2, ease: MENU_EASE }}
            style={{ transformOrigin: align === "end" ? "top right" : "top left" }}
            className={cn(
              "absolute top-full z-50 mt-1 max-h-72 w-max min-w-full max-w-72 overflow-y-auto rounded-(--radius-card) border border-edge bg-surface py-1.5 shadow-(--shadow-raised) focus:outline-none",
              align === "end" ? "right-0" : "left-0",
            )}
          >
            {options.map((option, i) => (
              <li
                key={option.value}
                id={`${id}-opt-${i}`}
                role="option"
                aria-selected={option.value === value}
                onPointerMove={() => {
                  if (activeIndex !== i) setActiveIndex(i);
                }}
                onClick={() => choose(i)}
                className={cn(
                  "flex cursor-pointer items-center gap-2.5 px-3.5 py-2 text-sm transition-colors",
                  i === activeIndex ? "bg-sunken text-ink" : "text-ink-muted",
                  option.value === value && "font-medium text-ink",
                )}
              >
                <span className="min-w-0 flex-1 truncate">{option.label}</span>
                <Check
                  aria-hidden
                  weight="bold"
                  className={cn(
                    "size-3.5 shrink-0 text-primary transition-opacity",
                    option.value === value ? "opacity-100" : "opacity-0",
                  )}
                />
              </li>
            ))}
          </motion.ul>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
