# 041 The room row is the scoreboard

The game's clients react to one row. 2026-09-12.

**Why one trigger:** players joining and answers landing both need to wake every screen. Rather than three subscriptions, a trigger on `game_players` and `game_answers` bumps `game_rooms.version`, and clients react to the room row alone. One thing to watch, one thing to miss.

**Why the transport carries only a nudge:** the realtime subscription says "look again"; every piece of game truth comes from `game_state`. There is no second path that could leak an answer key, and nothing to keep in sync. A poll runs underneath the push at all times, because a missed push must never freeze a room, and `?transport=poll` forces the poll alone, which is how the dev container (whose HTTP-only Supabase rewrite cannot carry websockets) and the e2e suite drive the whole feature.

**Why the host opens the reveal:** the room does not move on its own when the buzzer goes. The host's screen does it, automatically at zero or by pressing Reveal, so a class that lingers on a question gets to, and the server's deadline still refuses answers that arrive late. Pace is a person's call, not a timer's.
