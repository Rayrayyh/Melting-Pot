# 038 The tutor asks one question at a time

The Feynman method arrives as a tutor that speaks, but never as a chat. 2026-09-12, owner chose the back-and-forth voice tutor; the no-chatbot rule is older and stands.

**Why one question in focus:** a chat feed rewards the model for talking and the reader for scrolling. The method this feature exists for is the opposite: one question, one answer out loud, and the reader's eyes on their own thinking. So the screen holds the current question, the answer beneath it, and earlier turns folded into a "So far" strip. The blurt side is the same shape taken further: no turns at all, one write and one read-back in three fixed groups.

**Why the transcript travels and nothing is remembered:** each turn's request carries the whole session, so the server keeps no session state, can lose none, and cannot be walked out of order. Eight turns is the cap; a tutor that asks forever is a conversation.

**Voice, honestly supported:** the browser's speech recognition is Chromium and Safari, so the typed path is always one glance away and Firefox gets no apology, just the box. The tutor's voice out is the browser's own speech synthesis with a stored mute (`mp:tts-muted`), no service and no download. This is the reason `Permissions-Policy` moved from `microphone=()` to `microphone=(self)`; camera and geolocation stay closed because nothing asks for them.

**Everything traces back:** every item the coach returns names the note it rests on, and a title that matches none of the supplied notes is replaced with "Not traced to a note" rather than passed to a reader who cannot check it.
