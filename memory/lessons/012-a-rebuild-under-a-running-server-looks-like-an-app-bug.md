# A rebuild under a running server looks exactly like an app bug

`next start` serves the `.next` directory it finds at request time, and the
chunk filenames in that directory are content hashed. Delete and rebuild
`.next` while the server is running and the HTML it has already sent still
names the old chunks, so the browser asks for files that no longer exist and
gets a 500. What reaches the screen is the app's own error boundary:

    Something went wrong
    Nothing was lost. Reload to pick up where you left off.

Which is a page written for a failed data fetch, not for a missing asset. It
cost twenty minutes here, because a screenshot run produced that page on
every note in the Pot right after some rows had been deleted from the
database, and the obvious suspicion was a dangling reference the delete had
left behind.

The tell is in the console rather than the page:

    ChunkLoadError: Failed to load chunk /_next/static/chunks/09x9n76g2f2xe.js

A missing chunk is never a data problem. Every page fails, not the ones
touching the changed rows, and restarting the server fixes it with no code
change at all.

The habit: when a deploy and a local server share a working tree, restart the
server after any `pnpm build`. The deploy path in particular does
`rm -rf .next && pnpm build` before zipping, which is precisely the thing
that pulls the floor out from under a server started earlier.
