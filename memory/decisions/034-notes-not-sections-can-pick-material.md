# 034 Notes, not sections, can pick the material

Study material can be asked for from particular notes. The setup grows a note picker beside the section pills, and when any note is picked it replaces the section choice entirely. 2026-09-12, owner-requested.

**Why:** sections were the only granularity a generation could be aimed at, and a section is the wrong size for "I have a test on Tuesday's two notes". The picker reads the Pot's live note titles (`listNoteTitles`), capped like every other read, and the ids travel inside `options` (`noteIds`), folded into the options key so the fingerprint discipline holds: change the notes, change the set.

**Why replace and not combine:** two independent filters would make a choice mean two things at once. Picking a note clears the parts and picking a part clears the notes, in the UI and in the route (`noteIds` wins, sections are skipped), so what arrives is always one statement about scope.

**Trust boundary:** a note id in the request is a request, not an authority. The route still filters on `pot_id` first, so an id from another Pot matches nothing; picked notes that are missing or removed surface as `no_notes_matched`, said plainly to the reader.
