import { notFound } from "next/navigation";

// Everything under /dev is a development-only surface (the styleguide with
// demo data). It must not exist in production, so this server layout 404s
// there; local dev and the e2e run (both NODE_ENV=development) keep it.
export default function DevLayout({ children }: { children: React.ReactNode }) {
  if (process.env.NODE_ENV === "production") notFound();
  return children;
}
