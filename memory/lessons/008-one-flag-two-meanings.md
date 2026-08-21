# One flag driving two buttons takes the way out away

`ConfirmDialog` had a `busy` prop that disabled both the confirm button and the
cancel button, which is right for an action in flight. A caller then reached for
it to mean something else: the note-removal dialog asks for a reason first, and
passed `busy={busy || reason.trim().length === 0}` so the confirm button would
stay off until one was typed.

It also switched off Cancel. An empty box meant no way out but Escape, and a
request that hung meant no way out at all.

The fix is not a second boolean bolted on: it is that **cancel is never the
thing to disable**. Closing a dialog is not destructive, and whatever is in
flight finishes or fails on its own either way. Cancel now takes no `disabled`
prop at all, so no caller can turn it off. `confirmDisabled` carries "not ready
yet", separately from `busy` meaning "already going".

When one prop starts meaning two things, the second meaning arrives at a call
site, not at the component, and the component's other behaviours come along
uninvited.
