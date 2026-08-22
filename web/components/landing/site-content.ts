import type { Icon } from "@phosphor-icons/react";
import {
  HandPalm,
  LockSimpleOpen,
  PencilSimple,
  ShieldCheck,
  SignIn,
  UsersThree,
} from "@phosphor-icons/react/dist/ssr";

/** Shared copy for the public pages, so the landing and the standalone
 *  pages describe the product in exactly the same words. */

export const REPO_URL = "https://github.com/Rayrayyh/Meltingpot";

export const STEPS: { number: string; icon: Icon; title: string; body: string }[] = [
  {
    number: "1",
    icon: SignIn,
    title: "Join your class",
    body: "One code from a classmate puts the whole vault in front of you. No forms, no setup, no login wall.",
  },
  {
    number: "2",
    icon: PencilSimple,
    title: "Write it rough",
    body: "Type what you remember between classes. Typos, fragments, half-ideas: all welcome. Formatting is not your job.",
  },
  {
    number: "3",
    icon: UsersThree,
    title: "Approve and share",
    body: "Review the organized version next to your original, change anything, then share it with the class.",
  },
];

export const PRINCIPLES: { icon: Icon; title: string; body: string }[] = [
  {
    icon: LockSimpleOpen,
    title: "Originals are sacred",
    body: "Every submission is kept exactly as written and stays one tap away, in every version, forever.",
  },
  {
    icon: HandPalm,
    title: "You hold the pen",
    body: "The organizer suggests titles, structure, and placement. It never publishes. Only you can share your notes.",
  },
  {
    icon: ShieldCheck,
    title: "People decide corrections",
    body: "Suggested fixes travel with reasons and sources to a maintainer who decides. Nothing changes silently.",
  },
];

/** The people behind the app, credited in the footer. */
export const MAKERS: { name: string; avatar: string; href: string }[] = [
  {
    name: "Rayrayyh",
    avatar: "/credits/rayrayyh.png",
    href: "https://github.com/Rayrayyh",
  },
  {
    name: "metabender",
    avatar: "/credits/metabender.png",
    href: "https://github.com/metabender",
  },
  {
    name: "cozbrozdevarc",
    avatar: "/credits/cozbrozdevarc.jpg",
    href: "https://github.com/cozbrozdevarc",
  },
  {
    name: "AnonymousDev",
    avatar: "/credits/anonymousdev.png",
    href: "https://github.com/AnonymousDev",
  },
];
