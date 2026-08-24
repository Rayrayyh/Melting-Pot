# Two minute demo script

For the Prometheus August AI Challenge. The cap is hard: the rules say
anything past 2:00 is not watched, so this is written to land at about 1:52
with room to breathe rather than 1:59 with none.

The rubric gives 25 points to the pitch and 25 to "AI is core to the
functionality, not just an afterthought". Both are won in the same place, by
showing the model doing work rather than saying that it does.

## Shape

Four beats. Problem, student, teacher, close. No logo animation, no feature
tour, no talking head over slides. Screen recording with voiceover throughout.

| Beat | Runs | Ends at |
|---|---|---|
| 1. The problem | 0:15 | 0:15 |
| 2. A student writes and shares | 0:45 | 1:00 |
| 3. The teacher finds out what to reteach | 0:40 | 1:40 |
| 4. Close | 0:12 | 1:52 |

---

## Beat 1: the problem (0:00 to 0:15)

**On screen:** the landing page, then scroll once so the messy note melts
into the organized one. Do not narrate the scroll, let it land.

> Every class produces knowledge all day long, and almost none of it
> survives. One student takes good notes nobody sees. The answer is in the
> group chat, forty scrolls up.
>
> Meltingpot is where a class keeps it all in one place.

## Beat 2: a student writes and shares (0:15 to 1:00)

**On screen:** join with a class code, land in the Pot without an account
wall. Then Add contribution. Paste something genuinely messy: lowercase, no
punctuation, an "i think" that is not certain.

> A student joins with a six character code and is reading the class vault
> before making an account.
>
> Then they write. Badly, on purpose. This is what notes actually look like
> between classes.

**On screen:** hit the organize button. Let the wait screen run. When it
lands, hold on the split view for a beat, then point at two things.

> The model rebuilds it: a title, structure, key takeaways. The original is
> right there and never changes.
>
> Two things it will not do. It will not quietly fix a claim it doubts, it
> flags it here for a person to settle. And it says which engine wrote this,
> by name, so you always know whether you are reading the model or the
> fallback.

**On screen:** Share with class. Then the note in the feed.

> Nothing publishes itself. The student decides.

## Beat 3: the teacher finds out what to reteach (1:00 to 1:40)

**On screen:** cut to the owner's account. Pot, then Admin, then the Study
tab. Scroll past the per-member record to the readout. Click "Read the
results". Hold while it thinks, then let the result sit on screen long
enough to actually read one item.

> Now the other side. This class has been sitting practice tests built from
> their own notes.
>
> The database counts what they got wrong, grouped by the note each question
> came from. The model reads those counts and tells the teacher what to go
> over again, and one concrete thing to try.

**On screen:** scroll to the counts table underneath.

> The numbers are the database's, not the model's, and they are printed
> underneath so a teacher can check the claim instead of trusting it.
>
> No student is named or ranked anywhere in this. It stays quiet until
> enough people have practiced to mean anything. It is about the material,
> not the people.

## Beat 4: close (1:40 to 1:52)

**On screen:** the Pot feed with several notes, then hold on the landing.

> A class writes badly, on purpose, and ends up with one set of notes worth
> revising from, and a teacher who knows what to say on Monday.
>
> Meltingpot. Open source, and live now.

---

## Recording notes

- **Record at 1920x1080.** The app is desktop first and the admin tables need
  the width.
- **Light theme.** It is the default now and it reads better compressed.
- **Set the model key before recording.** The whole of beat 2 depends on the
  organizer being the model and not the fallback, and the on-screen credit
  will say which one it was. This is the exact failure that spoiled the last
  recording; now it is visible rather than silent, which is better but only
  if you check it before you press record.
- **Have the practice results in place first.** The readout will refuse to
  say anything under twenty first-pass answers from two people, and that
  refusal on camera would cost the whole beat.
- **Do not speed up the model waits.** A visible two second wait is evidence
  that something is being computed. Cutting it looks like a mock.
- **Cut on action, not on silence.** Every cut here lands on a click.
- **Say the sentence about the counts.** "The numbers are the database's, not
  the model's" is the one line that separates this from a project that asks a
  chatbot for an opinion, and it is worth a quarter of the score.
