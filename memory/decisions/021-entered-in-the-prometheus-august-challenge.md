# The project is entered in the Prometheus August AI Challenge

Decided 2026-08-23 by the owner.

MeltingPot was designed and written for the Pixel Forge AI Hackathon between
17 and 23 August. The owner then entered the same project in the Prometheus
August AI Challenge, which closes 29 August at 11:45pm PDT.

## Why this is within the rules, checked rather than assumed

The Prometheus rules page carries exactly three guidelines: video length,
team size, and originality. The originality one reads:

> All code must be written during the hackathon window (August 17th – 29h).
> Using open-source libraries and pre-trained AI models is encouraged, but
> core application logic must be new.

The repository's only commit before that window is 16 August at 17:29 PDT,
and it contains two files: the MIT `LICENSE` and a one line `README.md`.
Every other commit is 17 August or later. So all of this project's
application logic was in fact written inside their window. The git history
is the evidence and it is public.

There is no exclusivity clause. Nothing on the rules page, the overview, or
the eligibility panel says a project may not be entered in more than one
challenge. The absence of a rule is not the same as written permission, so
the owner was advised to confirm with the hackathon manager. That
conversation is theirs to have; the code does not depend on the answer.

## What changed as a result

Only the things that named the old challenge: the footer credit, the terms
page, one e2e assertion, the README's closing section, and this repo's own
CLAUDE.md. `docs/BUILDLOG.md` and `docs/PLAN.md` still say Pixel Forge
throughout, deliberately. They are a record of what happened on the days
they describe, the git log says the same thing, and quietly rewriting them
to hide where the project came from would be a lie that the commit history
immediately contradicts.

## What the rubric changed about the work

Scoring is 100 points in four equal parts, and two of them redirected real
effort:

- **Creative Use of AI/ML (25)** is explicit that "AI is core to the
  functionality, not just an afterthought". The deterministic fallback
  organizer (`memory/decisions/003`) is a liability under that wording if a
  viewer cannot tell which engine produced a result, and it already cost
  this project once when the API failed mid-recording and the demo showed
  fallback output. Hence the engine and model are now named in the UI.
- **Educational Impact (25)** asks whether the tool helps someone teach, not
  only learn. Everything built so far pointed at the student. The class
  weak-topics readout on the admin Study tab is the answer to the other
  half.
