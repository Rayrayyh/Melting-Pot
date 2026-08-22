# The left of X-Forwarded-For belongs to the caller, not to you

`client_ip()` keyed every anonymous rate limit on
`split_part(x-forwarded-for, ',', 1)`. That is the leftmost entry, and it is
the one value in the header a caller can choose. Proxies append: the address
written by the hop nearest the database is the RIGHTMOST entry, and everything
to its left arrived from outside.

Measured on the live project rather than reasoned about:

| sent by the caller | header PostgREST saw |
| --- | --- |
| nothing | `35.253.77.88` |
| `203.0.113.77` | `203.0.113.77,35.253.77.88` |
| `203.0.113.77, 198.51.100.1` | `203.0.113.77, 198.51.100.1,35.253.77.88` |
| `203.0.113.7,` | `203.0.113.7,,34.135.11.159` |

Two anonymous limits were keyed on it, so both were bypassable by changing a
string: `lookup_pot_by_code` (class-code enumeration) and `register_student`
(unlimited account creation). Neither limit was ever reached in testing
because a fresh bucket was one header edit away.

The fix (0032) prefers `cf-connecting-ip`, which the edge overwrites and
which it refuses outright: sending that header yourself returns 403 from
Cloudflare before PostgREST is reached, which is exactly what makes it worth
trusting. It falls back to the rightmost non-empty `x-forwarded-for` entry,
skipping empty segments because a trailing comma is a caller's to send too.

The general rule: a header is evidence only if something you trust wrote it.
Ask which hop wrote the value you are reading, and prove it by trying to forge
it. Both halves of that matter, and the forgery attempt is the half that
actually settles it.
