# 039 Graphs choose how carefully they are drawn

The graph study kind asks one question no other kind asks: how carefully should this be drawn. Two tiers, named for the reader's experience, not the machinery. 2026-09-12, owner chose "AI-generated graphs from notes" with the model choice attached.

**Why the labels say nothing about models:** decision 017 keeps vendor and model names out of the interface. "Drawn quickly" and "Drawn carefully" say what the reader gets either way; the tier maps onto the two configured models in exactly one place, the study route, which is where configuration belongs. The stored set records which engine ran, as every set does; the page does not print it.

**Why no silent fallback:** the reasoning tier could not finish a practice test inside the platform's ceiling, and a careful drawing may not either. The setup screen warns up front, and a timeout answers "That took longer than the server allows. The quicker drawing usually gets through." Quietly substituting the quick drawing would lie about what the reader bought: a careful map that arrives as a sketch is worse than one that arrives not at all, because the reader cannot tell.

**Why the layout is layers, not forces:** the same map always draws the same way, so two drawings can be compared as content. Breadth-first depth from the best-connected node, alphabetical tie-breaks at every step (`lib/study/graph-layout.ts`), tolerating whatever edges slip past the normalizer rather than throwing on them. The normalizer itself drops unknown endpoints, self edges and duplicates, and caps the map at twelve nodes and eighteen edges, because a map that fills more than a screen is a wall of names.

**Fingerprint:** the tier folds into the options key (`graph:fast` / `graph:careful`), so the two drawings of one Pot store separately. The tier deliberately does not live in `PracticeOptions`, so no set stored before graphs existed changes its fingerprint.
