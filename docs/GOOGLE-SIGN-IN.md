# Finishing Google sign in

The app already has everything on the code side: a "Continue with Google"
button, the callback route that turns Google's one-time code into a session,
and a database trigger that takes the person's real name from Google instead of
labelling them "Student". What is left is the part only you can do, because it
needs your Google account and your Supabase project: creating the OAuth
credentials and pasting them into Supabase.

The button stays hidden until you finish, so nothing on the live site can be
pressed in a broken state. The last step turns it on.

## A note on Firebase

You asked for Firebase originally. Supabase Auth signs people in with Google
directly, so Firebase is not needed here, and adding it would have meant a
second identity system beside the one every security rule in this project is
built on. The result for a student is identical: a Google button, one tap, they
are in. If you ever do need Firebase specifically (a sponsor prize, say), that
is a separate and much larger change, and worth planning on its own.

## 1. Create the OAuth credentials in Google Cloud

1. Open the [Google Cloud console](https://console.cloud.google.com/) and pick a
   project, or create one. The name is only ever seen by you.
2. Go to **APIs and services** then **OAuth consent screen**.
   - User type **External**, then Create.
   - App name: `MeltingPot`. Support email and developer contact email: your
     own address.
   - Skip the Scopes step. The defaults (email, profile, openid) are exactly
     what is needed.
   - Under **Test users**, add any Google accounts you want to sign in with
     while the app is still in testing. Anyone not on that list is refused
     until you publish the consent screen.
3. Go to **APIs and services** then **Credentials**.
   - **Create credentials** then **OAuth client ID**.
   - Application type **Web application**, name it `MeltingPot web`.
   - Under **Authorised JavaScript origins**, add:
     - `https://meltingpot-io.netlify.app`
     - `http://localhost:3111` (only needed for local development)
   - Under **Authorised redirect URIs**, add the Supabase callback exactly:
     - `https://evcfmwxzxwmeiczfupsw.supabase.co/auth/v1/callback`
   - Create, then copy the **Client ID** and **Client secret**. The secret is
     shown once, so keep it somewhere safe.

The redirect URI in step 3 points at Supabase, not at MeltingPot. That trips
people up. Google hands the person back to Supabase, and Supabase then sends
them on to the app.

## 2. Turn the provider on in Supabase

1. Open the [Supabase dashboard](https://supabase.com/dashboard/project/evcfmwxzxwmeiczfupsw/auth/providers)
   for the MeltingPot project, then **Authentication** then **Providers**.
2. Find **Google**, enable it, and paste in the Client ID and Client secret
   from step 1. Save.
3. Still under Authentication, open **URL Configuration** and check:
   - **Site URL**: `https://meltingpot-io.netlify.app`
   - **Redirect URLs** includes both of these:
     - `https://meltingpot-io.netlify.app/auth/callback`
     - `http://localhost:3111/auth/callback`

Supabase refuses to redirect anywhere not on that list, which is what stops
someone forging a link that sends a freshly signed-in person to another site.

## 3. Show the button

The button is behind one environment variable, so it appears only once the two
steps above are done.

**On Netlify:** Site configuration, then Environment variables, then add:

```
NEXT_PUBLIC_GOOGLE_AUTH_ENABLED = on
```

Then redeploy so the new value is baked in. It is a `NEXT_PUBLIC_` variable,
which means it is compiled into the browser bundle rather than read at runtime,
so a redeploy is required rather than optional.

**Locally:** add the same line to `web/.env.local` and restart `pnpm dev`.

## 4. Check it

1. Open the live site and go to Sign in. "Continue with Google" should now be
   above the email and password fields.
2. Sign in with a Google account. You should land on the dashboard with your
   real name on the profile card at the foot of the nav, not "Student".
3. Try it with a class code: open an invite link, press Continue with Google
   from there, and confirm you land inside that Pot as a member.

If the button sends you to a Google error page saying the redirect URI does not
match, the URI in step 1 is wrong. It must be the Supabase one, character for
character.

If you get back to MeltingPot but see "That Google sign in didn't complete",
the provider is on in Supabase but the app's own callback is not in the
Redirect URLs list from step 2.

## What this changed in the code

- `web/components/auth/auth-form.tsx`: the button, and it carries a pending
  class code through the round trip so joining still works.
- `web/app/auth/callback/route.ts`: exchanges Google's code for a session and
  then sends the person to their destination. It only ever redirects to a path
  inside this app.
- `supabase/migrations/0019_oauth_display_name.sql`: the profile trigger now
  reads `full_name` and `name`, which is where Google puts it, and falls back
  to the email local part before ever using "Student".

Nothing about the existing email and password path changed, and no security
rule moved: a Google user is an ordinary Supabase user, so every row level
security policy and every `auth.uid()` check applies to them unchanged.
