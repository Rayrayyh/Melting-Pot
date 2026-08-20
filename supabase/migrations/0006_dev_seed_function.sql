-- Dev-only reseed helper. No app role can execute it; it is invoked
-- through the management connection before e2e runs. Dropped before the
-- production deploy (plan step 13).

create or replace function public.dev_seed()
returns void
language plpgsql
volatile
security definer
set search_path = public, auth, extensions
as $fn$

declare
  v_maya uuid;
  v_ava uuid;
  v_omar uuid;
  v_priya uuid;
  v_pot uuid;
  v_s1 uuid; v_s2 uuid; v_s3 uuid; v_s4 uuid;
  v_c uuid; v_note uuid; v_ver uuid; v_ver2 uuid;
  v_note_mitosis uuid;
  v_note_osmosis uuid;
  v_prop uuid;
begin
  -- Wipe previous seed data (children cascade from the pot).
  delete from public.pots where class_code = 'BIO101';
  delete from auth.users where email in (
    'maya@meltingpot.dev', 'ava@meltingpot.dev',
    'omar@meltingpot.dev', 'priya@meltingpot.dev'
  );

  -- Users. Shared dev password documented in web/scripts/README.
  v_maya  := public.register_student('maya@meltingpot.dev',  'MeltingPot-dev1', 'Maya Chen');
  v_ava   := public.register_student('ava@meltingpot.dev',   'MeltingPot-dev1', 'Ava Morgan');
  v_omar  := public.register_student('omar@meltingpot.dev',  'MeltingPot-dev1', 'Omar Haddad');
  v_priya := public.register_student('priya@meltingpot.dev', 'MeltingPot-dev1', 'Priya Patel');

  -- Pot with a fixed, memorable code for tests.
  insert into public.pots (title, description, class_code, owner_id)
  values (
    'Biology 101',
    'Everything our class knows about intro biology, gathered in one place. Rough notes welcome.',
    'BIO101',
    v_maya
  )
  returning id into v_pot;

  insert into public.memberships (pot_id, user_id, role) values
    (v_pot, v_maya, 'owner'),
    (v_pot, v_ava, 'member'),
    (v_pot, v_omar, 'member'),
    (v_pot, v_priya, 'member');

  insert into public.sections (pot_id, title, position) values
    (v_pot, 'Week 1: Foundations', 0) returning id into v_s1;
  insert into public.sections (pot_id, title, position) values
    (v_pot, 'Week 2: Cell structure', 1) returning id into v_s2;
  insert into public.sections (pot_id, title, position) values
    (v_pot, 'Week 3: Cell division', 2) returning id into v_s3;
  insert into public.sections (pot_id, title, position) values
    (v_pot, 'Exam review', 3) returning id into v_s4;

  -- Note 1: mitosis vs meiosis (Ava), later corrected by Omar, reviewed by Maya.
  insert into public.contributions (pot_id, author_id, status, raw_text, section_id)
  values (
    v_pot, v_ava, 'shared',
    'ok so mitosis vs meiosis keeps confusing people. mitosis is the normal one, one cell splits into 2 identical cells, body growth and repair. meiosis is for making gametes, it splits twice so you get 4 cells and each has half the chromosomes. mitosis 2 identical, meiosis 4 different. also crossing over happens in meiosis which is why siblings look different lol',
    v_s3
  )
  returning id into v_c;

  insert into public.shared_notes (pot_id, section_id, contribution_id, contributor_id, shared_at)
  values (v_pot, v_s3, v_c, v_ava, now() - interval '3 days')
  returning id into v_note_mitosis;

  insert into public.note_versions (note_id, version_number, title, summary, body, body_text, takeaways, contributor_id, created_at)
  values (
    v_note_mitosis, 1,
    'Mitosis vs meiosis',
    'Mitosis makes two identical body cells; meiosis makes four genetically distinct gametes with half the chromosomes.',
    '[{"type":"paragraph","text":"Mitosis is ordinary cell division. One cell divides once and produces two identical daughter cells. The body uses it for growth and repair."},{"type":"paragraph","text":"Meiosis produces gametes. The cell divides twice, producing four cells, and each carries half the chromosome count. Crossing over during meiosis shuffles genetic material, which is why siblings inherit different combinations."},{"type":"bullets","items":["Mitosis: one division, two identical cells","Meiosis: two divisions, four distinct cells","Meiosis halves the chromosome count","Crossing over only happens in meiosis"]}]'::jsonb,
    'Mitosis is ordinary cell division. One cell divides once and produces two identical daughter cells. The body uses it for growth and repair. Meiosis produces gametes. The cell divides twice, producing four cells, and each carries half the chromosome count. Crossing over during meiosis shuffles genetic material, which is why siblings inherit different combinations.',
    array['Mitosis copies, meiosis mixes.', 'Gametes carry half the chromosome count.'],
    v_ava,
    now() - interval '3 days'
  )
  returning id into v_ver;

  update public.shared_notes set current_version_id = v_ver where id = v_note_mitosis;
  update public.contributions set shared_note_id = v_note_mitosis where id = v_c;

  -- Accepted correction from Omar: "The body uses it for growth and repair."
  insert into public.revision_proposals (
    note_id, pot_id, proposer_id, status, selected_text, proposed_text,
    reason, explanation, source, diff_summary, decided_by, decided_at, decision_note,
    created_at
  )
  values (
    v_note_mitosis, v_pot, v_omar, 'accepted',
    'The body uses it for growth and repair.',
    'The body uses it for growth, repair, and replacing worn-out cells; most of your cells divide this way.',
    'Incomplete',
    'The textbook lists three functions, not two, and the scope matters for the exam.',
    'OpenStax Biology, section 10.2',
    'Expands the functions of mitosis from two to three and notes that most somatic cells divide this way.',
    v_maya, now() - interval '1 day', null,
    now() - interval '2 days'
  )
  returning id into v_prop;

  insert into public.note_versions (
    note_id, version_number, title, summary, body, body_text, takeaways,
    contributor_id, correction_contributor_id, reviewed_by, proposal_id, source,
    change_summary, created_at
  )
  values (
    v_note_mitosis, 2,
    'Mitosis vs meiosis',
    'Mitosis makes two identical body cells; meiosis makes four genetically distinct gametes with half the chromosomes.',
    '[{"type":"paragraph","text":"Mitosis is ordinary cell division. One cell divides once and produces two identical daughter cells. The body uses it for growth, repair, and replacing worn-out cells; most of your cells divide this way."},{"type":"paragraph","text":"Meiosis produces gametes. The cell divides twice, producing four cells, and each carries half the chromosome count. Crossing over during meiosis shuffles genetic material, which is why siblings inherit different combinations."},{"type":"bullets","items":["Mitosis: one division, two identical cells","Meiosis: two divisions, four distinct cells","Meiosis halves the chromosome count","Crossing over only happens in meiosis"]}]'::jsonb,
    'Mitosis is ordinary cell division. One cell divides once and produces two identical daughter cells. The body uses it for growth, repair, and replacing worn-out cells; most of your cells divide this way. Meiosis produces gametes. The cell divides twice, producing four cells, and each carries half the chromosome count. Crossing over during meiosis shuffles genetic material, which is why siblings inherit different combinations.',
    array['Mitosis copies, meiosis mixes.', 'Gametes carry half the chromosome count.'],
    v_ava, v_omar, v_maya, v_prop, 'OpenStax Biology, section 10.2',
    'Expanded the functions of mitosis and noted that most somatic cells divide this way.',
    now() - interval '1 day'
  )
  returning id into v_ver2;

  update public.shared_notes set current_version_id = v_ver2 where id = v_note_mitosis;

  insert into public.proposal_events (proposal_id, actor_id, kind, body, created_at) values
    (v_prop, v_omar, 'submitted', null, now() - interval '2 days'),
    (v_prop, v_maya, 'accepted', 'Good catch, this matches the textbook.', now() - interval '1 day');

  -- Note 2: osmosis (Omar), has a pending proposal from Priya.
  insert into public.contributions (pot_id, author_id, status, raw_text, section_id)
  values (
    v_pot, v_omar, 'shared',
    'osmosis = water moving across a membrane from where there is more water to where there is less water. the membrane lets water through but not the solute. thats why salt on a slug is bad. hypertonic means more solute outside so water leaves the cell and it shrivels, hypotonic means less solute outside so water rushes in and it can burst',
    v_s2
  )
  returning id into v_c;

  insert into public.shared_notes (pot_id, section_id, contribution_id, contributor_id, shared_at)
  values (v_pot, v_s2, v_c, v_omar, now() - interval '2 days')
  returning id into v_note_osmosis;

  insert into public.note_versions (note_id, version_number, title, summary, body, body_text, takeaways, contributor_id, created_at)
  values (
    v_note_osmosis, 1,
    'Osmosis and tonicity',
    'Water crosses a selectively permeable membrane toward the higher solute concentration; tonicity describes which way cells gain or lose water.',
    '[{"type":"definition","term":"Osmosis","text":"The movement of water across a selectively permeable membrane from lower to higher solute concentration. The membrane passes water but not the solute."},{"type":"paragraph","text":"In a hypertonic environment there is more solute outside the cell, so water leaves and the cell shrivels. In a hypotonic environment there is less solute outside, so water rushes in and the cell can swell or burst."},{"type":"example","text":"Salt on a slug pulls water out of its body by osmosis, which is why it is lethal to the slug."}]'::jsonb,
    'Osmosis: the movement of water across a selectively permeable membrane from lower to higher solute concentration. The membrane passes water but not the solute. In a hypertonic environment there is more solute outside the cell, so water leaves and the cell shrivels. In a hypotonic environment there is less solute outside, so water rushes in and the cell can swell or burst. Salt on a slug pulls water out of its body by osmosis, which is why it is lethal to the slug.',
    array['Water follows solute.', 'Hypertonic shrinks cells, hypotonic swells them.'],
    v_omar,
    now() - interval '2 days'
  )
  returning id into v_ver;

  update public.shared_notes set current_version_id = v_ver where id = v_note_osmosis;
  update public.contributions set shared_note_id = v_note_osmosis where id = v_c;

  insert into public.revision_proposals (
    note_id, pot_id, proposer_id, status, selected_text, proposed_text,
    reason, explanation, source, diff_summary, created_at
  )
  values (
    v_note_osmosis, v_pot, v_priya, 'pending',
    'The movement of water across a selectively permeable membrane from lower to higher solute concentration.',
    'The net movement of water across a selectively permeable membrane from lower to higher solute concentration; individual molecules move both ways.',
    'Incorrect fact',
    'It is the net movement that matters. Molecules cross in both directions the whole time.',
    'Lecture 4 slides, slide 12',
    'Clarifies that osmosis describes net water movement rather than one-way flow.',
    now() - interval '6 hours'
  )
  returning id into v_prop;

  insert into public.proposal_events (proposal_id, actor_id, kind, created_at)
  values (v_prop, v_priya, 'submitted', now() - interval '6 hours');

  -- Notes 3 to 6: a healthy feed across sections.
  insert into public.contributions (pot_id, author_id, status, raw_text, section_id)
  values (
    v_pot, v_priya, 'shared',
    'scientific method notes from lecture 1: observation then question then hypothesis then experiment then analyze then conclude. hypothesis must be testable and falsifiable!! a theory is NOT a guess, its an explanation supported by tons of evidence. law describes WHAT happens, theory explains WHY',
    v_s1
  )
  returning id into v_c;
  insert into public.shared_notes (pot_id, section_id, contribution_id, contributor_id, shared_at)
  values (v_pot, v_s1, v_c, v_priya, now() - interval '6 days')
  returning id into v_note;
  insert into public.note_versions (note_id, version_number, title, summary, body, body_text, takeaways, contributor_id, created_at)
  values (
    v_note, 1,
    'The scientific method, laws, and theories',
    'Science moves from observation to testable hypothesis to experiment; a law describes what happens while a theory explains why.',
    '[{"type":"paragraph","text":"The scientific method runs observation, question, hypothesis, experiment, analysis, conclusion. A hypothesis must be testable and falsifiable to count."},{"type":"definition","term":"Scientific theory","text":"An explanation supported by a large body of evidence. It is not a guess."},{"type":"paragraph","text":"A law describes what happens under given conditions. A theory explains why it happens. Gravity has both: the law describes the force, the theory explains it."}]'::jsonb,
    'The scientific method runs observation, question, hypothesis, experiment, analysis, conclusion. A hypothesis must be testable and falsifiable to count. Scientific theory: an explanation supported by a large body of evidence. It is not a guess. A law describes what happens under given conditions. A theory explains why it happens. Gravity has both: the law describes the force, the theory explains it.',
    array['Falsifiable or it is not a hypothesis.', 'Laws describe, theories explain.'],
    v_priya, now() - interval '6 days'
  )
  returning id into v_ver;
  update public.shared_notes set current_version_id = v_ver where id = v_note;
  update public.contributions set shared_note_id = v_note where id = v_c;

  insert into public.contributions (pot_id, author_id, status, raw_text, section_id)
  values (
    v_pot, v_maya, 'shared',
    'organelles cheat sheet - nucleus holds DNA, mitochondria makes ATP (powerhouse yes i said it), ribosomes make proteins, ER rough has ribosomes smooth makes lipids, golgi packages and ships stuff, lysosomes digest waste, chloroplasts only in plants do photosynthesis, cell wall also plants only',
    v_s2
  )
  returning id into v_c;
  insert into public.shared_notes (pot_id, section_id, contribution_id, contributor_id, shared_at)
  values (v_pot, v_s2, v_c, v_maya, now() - interval '5 days')
  returning id into v_note;
  insert into public.note_versions (note_id, version_number, title, summary, body, body_text, takeaways, contributor_id, created_at)
  values (
    v_note, 1,
    'Organelles and what they do',
    'A quick map of the major organelles: where genetic information lives, where energy is made, and how proteins are built and shipped.',
    '[{"type":"bullets","items":["Nucleus: holds DNA","Mitochondria: produces ATP","Ribosomes: build proteins","Rough ER: ribosome-studded, folds proteins","Smooth ER: makes lipids","Golgi apparatus: packages and ships products","Lysosomes: digest waste","Chloroplasts: photosynthesis, plants only","Cell wall: structure, plants only"]},{"type":"paragraph","text":"Plant cells have everything animal cells have plus chloroplasts and a cell wall."}]'::jsonb,
    'Nucleus: holds DNA. Mitochondria: produces ATP. Ribosomes: build proteins. Rough ER: ribosome-studded, folds proteins. Smooth ER: makes lipids. Golgi apparatus: packages and ships products. Lysosomes: digest waste. Chloroplasts: photosynthesis, plants only. Cell wall: structure, plants only. Plant cells have everything animal cells have plus chloroplasts and a cell wall.',
    array['Plants have chloroplasts and cell walls; animals do not.'],
    v_maya, now() - interval '5 days'
  )
  returning id into v_ver;
  update public.shared_notes set current_version_id = v_ver where id = v_note;
  update public.contributions set shared_note_id = v_note where id = v_c;

  insert into public.contributions (pot_id, author_id, status, raw_text, section_id)
  values (
    v_pot, v_ava, 'shared',
    'cell cycle phases: G1 growth, S synthesis (DNA copies), G2 more growth and checking, M mitosis. interphase = G1+S+G2 which is most of the cell''s life. checkpoints stop damaged cells from dividing, p53 is the famous checkpoint protein, when checkpoints fail you can get cancer',
    v_s3
  )
  returning id into v_c;
  insert into public.shared_notes (pot_id, section_id, contribution_id, contributor_id, shared_at)
  values (v_pot, v_s3, v_c, v_ava, now() - interval '4 days')
  returning id into v_note;
  insert into public.note_versions (note_id, version_number, title, summary, body, body_text, takeaways, contributor_id, created_at)
  values (
    v_note, 1,
    'The cell cycle and its checkpoints',
    'Cells spend most of their life in interphase (G1, S, G2) before dividing in M phase; checkpoints keep damaged cells from dividing.',
    '[{"type":"paragraph","text":"The cell cycle has four phases. G1 is growth, S is synthesis where DNA is copied, G2 is further growth and checking, and M is mitosis. Interphase covers G1 through G2 and takes up most of a cell''s life."},{"type":"paragraph","text":"Checkpoints between phases stop damaged cells from dividing. The p53 protein is the best-known checkpoint guard. When checkpoints fail, damaged cells can keep dividing, which is one route to cancer."}]'::jsonb,
    'The cell cycle has four phases. G1 is growth, S is synthesis where DNA is copied, G2 is further growth and checking, and M is mitosis. Interphase covers G1 through G2 and takes up most of a cell''s life. Checkpoints between phases stop damaged cells from dividing. The p53 protein is the best-known checkpoint guard. When checkpoints fail, damaged cells can keep dividing, which is one route to cancer.',
    array['Interphase is most of the cycle.', 'Checkpoints are the brakes; p53 guards them.'],
    v_ava, now() - interval '4 days'
  )
  returning id into v_ver;
  update public.shared_notes set current_version_id = v_ver where id = v_note;
  update public.contributions set shared_note_id = v_note where id = v_c;

  insert into public.contributions (pot_id, author_id, status, raw_text, section_id)
  values (
    v_pot, v_omar, 'shared',
    'exam 1 covers weeks 1-3. prof said focus on: scientific method vocab, organelle functions, membrane transport ESPECIALLY osmosis problems, cell cycle order, mitosis vs meiosis differences. she loves diagram questions. bring a calculator for the surface area ratio question apparently',
    v_s4
  )
  returning id into v_c;
  insert into public.shared_notes (pot_id, section_id, contribution_id, contributor_id, shared_at)
  values (v_pot, v_s4, v_c, v_omar, now() - interval '20 hours')
  returning id into v_note;
  insert into public.note_versions (note_id, version_number, title, summary, body, body_text, takeaways, contributor_id, created_at)
  values (
    v_note, 1,
    'What exam 1 covers',
    'Exam 1 spans weeks 1 to 3, with emphasis on osmosis problems, organelle functions, and the mitosis versus meiosis distinction.',
    '[{"type":"paragraph","text":"Exam 1 covers weeks 1 through 3. The professor called out five focus areas and hinted at diagram questions."},{"type":"bullets","items":["Scientific method vocabulary","Organelle functions","Membrane transport, especially osmosis problems","The order of the cell cycle","Differences between mitosis and meiosis"]},{"type":"paragraph","text":"Bring a calculator: a surface area ratio question is expected."}]'::jsonb,
    'Exam 1 covers weeks 1 through 3. The professor called out five focus areas and hinted at diagram questions. Scientific method vocabulary. Organelle functions. Membrane transport, especially osmosis problems. The order of the cell cycle. Differences between mitosis and meiosis. Bring a calculator: a surface area ratio question is expected.',
    array['Osmosis problems are heavily weighted.', 'Expect diagram questions.'],
    v_omar, now() - interval '20 hours'
  )
  returning id into v_ver;
  update public.shared_notes set current_version_id = v_ver where id = v_note;
  update public.contributions set shared_note_id = v_note where id = v_c;

  -- A draft in progress for Ava (shows on her dashboard and drafts tab).
  insert into public.contributions (pot_id, author_id, status, raw_text)
  values (
    v_pot, v_ava, 'draft',
    'photosynthesis rough notes: light reactions in thylakoid make ATP and NADPH, calvin cycle in stroma uses them to fix CO2 into sugar. need to double check where exactly the water splitting happens'
  );
end;
$fn$;

revoke execute on function public.dev_seed() from public, anon, authenticated;
