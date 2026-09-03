# The moment comes back, as the stir

Chosen 2026-09-02 by the owner, from the four celebration mockups: "I like this mockup, let's go with a light and dark version of it."

Decision 030 removed the celebration entirely on the research finding that no product studied fires one on page load. The owner has now put a moment back, in the "still stirring" shape: the brand pot mid stir, the day count in Fraunces ("Day 5, still stirring."), a line saying what the days were ("Five days of putting something in or taking something out."), the week as seven dots, "Your record, nobody else's.", and one orange button, "Back to it".

What the research still holds is the timing, and this keeps it. The moment does not fire on page load and there is no once a day storage gate. The three completion screens (share success, flashcard results, practice results) ask the server, after their write has landed, whether that action was the first thing to count today; only that one opens the card. A second share or study run on the same day gets the sentence and nothing more. The record card on Home and Contributions is unchanged and still never opens anything.

The pot runs one eight second loop of the existing StirPot and parks, so nothing animates behind a card nobody is watching. Under reduced motion the card arrives with no movement, the pot uses its still variant, and the dots appear at once. Day one reads "Day one. The pot is on." rather than forcing the stirring phrase onto a single day. Both themes were shot from a real flashcard round: the light card on warm white, the dark on the raised surface, the orange button the only filled element in either.

The stray zero the first mockups had is gone with the counting fix: the number is the run that includes today, never a count up from nothing.

The wording is a pool, not one line. A single sentence would be wallpaper by the second week, so `lib/contributions/stir-lines.ts` holds eight everyday pairs, two for the first day, and named milestones at seven, fourteen, thirty, fifty and a hundred days. The day itself picks by a hash of its date, so the same day always shows the same line and tomorrow shows a different one, with no random source to make two renders disagree. House rules for anything added to the pool are written at the top of that file and enforced by its tests: sentence case, no emoji, no em dash, nothing that threatens the run, nothing that compares the person to anyone, and nothing that reads as a slogan.

