# BeStats

A place to browse what is popular on TMDB and to record what you have watched.
Every fact the app shows about a title comes from TMDB; what a Viewer records
about that title is the app's own.

## Language

These words bind code as much as prose — types, functions, route segments,
filenames. The exceptions are the vendors' own vocabularies — TMDB's (`tv`,
`movie`, the snake_case fields of its payloads) and Neon Auth's (`user`,
`session`, `account`, in the `neon_auth` schema) — which stay spelled as those
vendors spell them.

**Media**:
A thing that can be watched — a Show or a Movie. The word for whichever of the
two you do not yet need to distinguish.
_Avoid_: Title, entry, content

**Show**:
Media told over seasons and episodes. Spelled `tv` in code, in URLs and on the
wire, because that is TMDB's word and TMDB is presently the whole domain;
"Show" is the word the reader sees.
_Avoid_: Series, TV show, programme

**Movie**:
Media told once, with a runtime.
_Avoid_: Film, feature

**Kind**:
Which of the two a piece of Media is. Always one or the other, never absent —
though TMDB declares it only on Trending results, so elsewhere the caller
carries it.
_Avoid_: Type, category, format

**Season**:
A numbered run of a Show's Episodes, in the order they are meant to be
watched. TMDB keeps a Show's specials as a season too, numbered 0; they belong
to no run, so they follow the seasons that do and never decide which Episode
comes next.
_Avoid_: Series, volume, part

**Episode**:
One instalment of a Show, numbered within one of its Seasons. Not Media: a
Viewer records watching an Episode, and how far a Viewer has got through a
Show is read off the Episodes they have watched rather than recorded about the
Show itself.
_Avoid_: Instalment, chapter, part

**Media Item**:
What a card shows: enough of a piece of Media to recognise it in a grid and
follow it to its page.
_Avoid_: Card, result, summary

**Media Details**:
What a piece of Media's detail page shows. Shows and Movies reach it as the
same shape, so the page never learns which Kind it is rendering.
_Avoid_: Full media, page data

**Listing**:
What a row in a list of Seasons or Episodes shows: the number, the name and its
Facts, enough to follow the row to its page. Not a Media Item, which is what a
card shows, since neither a Season nor an Episode is Media on a card.
_Avoid_: Item, entry, row

**Fact**:
One short, finished statement about a piece of Media, a Season or an Episode —
its release, its length, how many seasons it ran. Facts are the only part of
Media Details that differ by Kind, and a Fact TMDB has no value for is absent
rather than blank — including where TMDB supplies a placeholder in place of
one. An Episode's air date is the exception: where TMDB has none, the absence
is stated, since an Episode without one cannot be scored.
_Avoid_: Attribute, metadata, field, stat

**Query**:
The words a visitor typed to find Media. TMDB's word too, so it stays spelled
`query` on the wire and in code; the address bar shortens it to `q`.
_Avoid_: Search term, keyword, input

**Matches**:
What a Query finds for one Kind — the Media Items TMDB matched, and how many
it matched in all. Only the first page is fetched, so the count is usually
larger than the list, and the page says so rather than letting the list stand
for the whole. A Kind TMDB did not answer for has no Matches at all, which is
not the same as matching nothing and is never shown as an empty list or a
count of zero.
_Avoid_: Results, hits, search results

**Unanswered**:
What the app has when it asked a source a question and got no answer — a
Kind TMDB did not answer for, a Viewer's Watch Records the database did not
return, whether a Visitor is a Viewer when the sign-in could not be checked.
Not the same as an answer of nothing: an Unanswered question is never
shown as an empty list, a count of zero, or an absence, and whatever depended
on the answer is left out rather than drawn as if the answer had been "none".
_Avoid_: Failed, error, missing, empty

**Gone**:
Media TMDB once had and no longer has. Not the same as Unanswered, which may
answer next time: Gone is TMDB's answer. A Watch Record for Gone Media still
exists and still renders, since what survives is that the Viewer watched
something. TMDB no longer says whether Gone Media is out, so it is drawn on
both the Watchlist and Upcoming rather than placed on one.
_Avoid_: Deleted, removed, missing, 404

**Rating**:
TMDB's average score for a piece of Media or an Episode, out of ten.
Everyone's, and never one Viewer's — what a Viewer thinks of a piece of Media
is a Score. Media nobody has voted on has no Rating: TMDB reports a `0`, which
is a placeholder standing in for an absent score rather than a score of zero,
so it is left out the way an absent Fact is.
_Avoid_: Stars, vote, review

**Artwork**:
A picture TMDB supplies — a Poster or a Backdrop for a piece of Media, or a
Still for an Episode.
_Avoid_: Image, art, kind

**Trending**:
What TMDB reports as most popular over the past week. It is the only Media the
home page shows, and the ranking is TMDB's, not the app's.
_Avoid_: Popular, top, featured

**Visitor**:
Anyone using BeStats. Everything the app shows is shown to a Visitor, signed in
or not; signing in is what makes one a Viewer.
_Avoid_: User, guest, anonymous

**Viewer**:
A Visitor who has signed in. Spelled `user` where Neon Auth spells it, for
the same reason a Show is spelled `tv`; Viewer is the word the reader sees, and
the only thing a Watch Record can belong to.
_Avoid_: User, account, member, profile

**Watch Record**:
One Viewer's recorded relationship to one Movie, Show or Episode, in exactly
one state. A Movie's is Planned, or Watched with a Score; a Show's is Planned
or Stopped; an Episode's is Watched with a Score. Whatever a Viewer has said
nothing about has no Watch Record at all, which is not a further state — and a
Show a Viewer is partway through has none of its own either, since that it is
under way is read off the Watch Records of its Episodes.
_Avoid_: Entry, mark, status, tracking

**Planned**:
The state of a Watch Record for a Movie or Show a Viewer means to watch. A
Show's Planned record lasts only until the Viewer watches one of its Episodes.
_Avoid_: Todo, saved, wishlist, want

**Watched**:
The state of a Watch Record for a Movie or Episode a Viewer has watched, which
always carries their Score: watching something and saying what you thought of
it are one act here, and there is no way to record the first without the
second. It replaces Planned rather than joining it, because you no longer mean
to watch what you have watched, and the Score does not survive the move back.
A Show is never Watched: a Show is finished when it has ended and the Viewer
has watched its every Episode.
_Avoid_: Seen, done, finished

**Stopped**:
The state of a Watch Record for a Show a Viewer has given up on. It keeps the
Show off the Watchlist and Upcoming without touching the Scores its Episodes
carry, and watching another of its Episodes takes the Viewer back to where they
were.
_Avoid_: Dropped, abandoned, archived, paused, hidden

**Score**:
What one Viewer thinks of a Movie or an Episode, in whole stars from 1 to 10. A
Score is the Viewer's own and TMDB never sees it, which is what separates it
from a Rating; giving one is what makes a Watch Record Watched, so a Score
never sits on a Planned record and a Watched record never lacks one.
_Avoid_: Rating, vote, review, grade

**Watchlist**:
What a Viewer can watch now: each Planned Movie that has been released, and
each Show they are under way with or have Planned, at its next Episode once
that has aired. The next Episode is the one after the furthest the Viewer has
watched, Specials aside, and the first of the Show when they have watched
none. What is Upcoming, Stopped or finished is not on it.
_Avoid_: Queue, saved, list, favourites

**Upcoming**:
What a Viewer is waiting for: Planned Movies not yet released, and Shows whose
next Episode has not aired — at its air date, or with none announced. A Show
that has ended and has no Episode left for the Viewer is not waiting for
anything, and is not Upcoming.
_Avoid_: Coming soon, scheduled, calendar, future

**Tracked**:
A Movie or Show a Viewer is following, which is what the lists are placed
from: each one they have Planned, and each Show they have watched an Episode
of, whether or not it has a record of its own. A Watched Movie is not tracked,
and neither is anything the Viewer has said nothing about. Not a state: a
Show under way is tracked with no Watch Record at all.
_Avoid_: Followed, active, in progress

**Mark**:
To give a Movie, Show or Episode a Watch Record in one of the states it can
hold, replacing whichever it had. Marking what a Watch Record already says
unmarks it, which deletes the record: pressing Planned on a Planned record, or
a Viewer's own Score on a Watched one. The verb only: the thing it makes is a
Watch Record, never "a mark". What that record says — its state, and its Score
when Watched — is its Marking, and that is the only noun the verb lends.
_Avoid_: Save, add, track, toggle, set
