# Re-check authorization at time of use, not time of grant

Security-definer RPCs and RLS policies both rotted the same way: they validated a condition that was true when the row was created and assumed it stayed true.

- share_contribution checked only author_id and status. Membership was checked at draft creation (contributions_insert RLS), but the RPC ran later, after the author could have been removed from the Pot. Every privileged function must re-check membership and Pot state (archived_at) against the row it is about to act on, at call time.
- contributions_update RLS checked ownership but not the mutable pot_id column. WITH CHECK must re-validate every column the client can change, not just identity. If insert requires is_pot_member(pot_id), update's WITH CHECK needs it too, or the insert check is a fence with an open gate.
- decide_proposal trusted client-computed content against the version the client happened to load. Server-side staleness checks (expected version id + the selected text still occurring) plus a row lock on the note turn a silent lost-update into an explicit conflict.
- Policy pairs must match: attachments_delete had the status <> 'shared' guard but attachments_insert did not, so the "immutable once shared" rule held in one direction only. When two policies express one invariant, diff them against each other.

Found by the step 12 adversarial review (five lenses, per-finding skeptic verification); fixed in migrations 0011 and 0012.
