# Changing a setting looks things up quietly; it never rebuilds the page

The practice setup form stays mounted while the store is asked what it holds.
Only the first look, before anything is on screen, gets a loading state.

## What was wrong

The workspace derived `looking` from `lookedUpKey !== optionsKey` and rendered a
full-card "Looking for what this Pot already has." in place of the entire setup
form whenever the two differed. Since the key changed the instant a setting
changed, every tap on a question count or a difficulty tore the form down,
waited on a round trip, and built it back.

The emphasis field made it much worse than a flicker. `practiceOptionsKey`
includes the emphasis text, so every single keystroke changed the key, unmounted
the input, and took the caret with it. The field could not be typed into.

## What it does now

`peeked` and `opened` are separate state. The lookup only ever writes `peeked`,
so it can learn there is a saved test without touching the form being filled in
or the test being read. The setup form reports the lookup in one line under the
buttons instead of replacing itself with it.

Lookups after the first are debounced by 400ms, so a burst of typing asks once.
The first look is not debounced, because that one is what the page is waiting
for.

`checking` and `settled` are derived from `lookedUpKey`, not stored beside it.
Storing them meant `setState` inside the effect, which the lint rule catches and
which is the same class of mistake as the original bug: state that says what
another piece of state already says, drifting apart the moment one is updated
without the other.
