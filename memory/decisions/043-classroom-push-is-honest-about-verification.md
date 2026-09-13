# 043 Classroom push is honest about verification

The push sends Google a link; the material stays here. And the card says plainly that only test users can use it yet. 2026-09-12, owner chose full OAuth over the share link.

**Why a link and not the material:** the assignment Google receives is one URL into the app (`/p/[potId]/study/set/[setId]`, the permalink this feature created). The material, the secured answer keys, and the marking all stay in the product, where the enforcement layer already lives. A student who follows the link is a member of the Pot or is not, which is the same check every other surface applies. Nothing about Classroom becomes an authority here.

**Why no due date:** the product has none, on purpose (the calendar page says so in its first paragraph). The coursework body carries `workType`, a description, and a link material; the unit test asserts no `dueDate` key exists anywhere, so the omission cannot rot by accident.

**Why the verification constraint is on the card, not in a footnote:** Classroom's scopes are restricted. Until Google verifies the app, only test users on the project can grant them, which means the feature works for the owner's accounts and quietly refuses for everyone else. The settings card says that in one sentence, so a maintainer who hits Google's warning screen is surprised by nothing. The state cookie, the narrower of the two scopes, and the error words (`denied` when the maintainer says no, `failed` when anything else breaks) are all carried in the callback redirect so the card can show what happened.
