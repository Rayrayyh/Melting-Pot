# 036 Card backs mirror for duplex

The printed backs page reverses each row of cards. 2026-09-12, owner chose cut-out duplex cards.

**Why:** a printer that flips on the long edge turns the sheet over left to right. Backs printed in the same order as fronts come out of the printer in reversed columns, so card 4's answer sits behind card 2. Reversing within each row (`mirrorRows` in `lib/study/print-layout.ts`) is the whole fix; no corner rotation, no second layout.

**Why a bare page:** the sheet is the paper, so the print page renders no shell and `@page { margin: 0 }` lets the cut grid reach the edge the preview showed. The controls carry `print:hidden`. The sheet hard-codes white paper and dark ink because a printout does not follow the theme, and the deck or note cards it prints are never secured material: answer keys live in `study_set_keys` and cannot reach this page even in principle.

**Where it prints from:** a saved deck in the flashcard session, and the hand-written cards on a note. Both sources are readable by every Pot member, so printing is too.
