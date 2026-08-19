# 002 Stack and hosting

Summary: User chose Next.js + Supabase (RLS on, endpoints scoped) + Netlify, with Framer Motion and GSAP for animation; decided 2026-08-19 in the planning session.

## The decision (user's own words)

"Next.js, gsap, supabase, netlify or supabase for backend, supabase rls turned on and endpoints scoped and blocked. Framer motion for animations"

## What that resolves to

- Next.js App Router, TypeScript, Tailwind CSS, deployed on Netlify (user confirmed Netlify for the live URL; the hackathon requires a hosted deployment).
- Supabase is the backend: Postgres, Supabase Auth, Storage for attachments.
- RLS is enabled on every table. Policies scope all reads and writes to Pot members with the right role. The anon key is safe to expose because RLS is the enforcement layer.
- Privileged operations that RLS cannot express cleanly run in Next.js route handlers / server actions using the service role key, each one narrowly scoped and validating the caller's session first: class-code lookup before auth (returns only safe public fields), joining via code, code regeneration, maintainer decisions, ownership transfers.
- Framer Motion for React component/page transitions; GSAP available for the organizing-progress sequence if a timeline is needed. All motion honors prefers-reduced-motion.

## Supabase account facts (checked 2026-08-19)

- One org: "Rayyan's projects" (`vercel_icfg_PJZyv1Qo3DeAGFhaYZEN3WfL`).
- No MeltingPot project exists yet; a new project on this org costs $0/month (confirmed via cost check). One project is ACTIVE_HEALTHY (Agentify), the rest are INACTIVE.
- A new project named for meltingpot gets created in build step 2.

## Why it mattered

The stack decision was blocking: SQLite would have ruled out serverless hosting, and Netlify serverless rules out local file persistence. Supabase gives real persistence behind the free tier, and RLS satisfies the user's explicit security requirement.
