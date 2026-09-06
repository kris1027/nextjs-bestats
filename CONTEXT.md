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

**Media Item**:
What a card shows: enough of a piece of Media to recognise it in a grid and
follow it to its page.
_Avoid_: Card, result, summary

**Media Details**:
What a detail page shows. Shows and Movies reach it as the same shape, so the
page never learns which Kind it is rendering.
_Avoid_: Full media, page data

**Fact**:
One short, finished statement about a piece of Media — its release, its length,
how many seasons it ran. Facts are the only part of Media Details that differ
by Kind, and a Fact TMDB has no value for is absent rather than blank —
including where TMDB supplies a placeholder in place of one.
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
return. Not the same as an answer of nothing: an Unanswered question is never
shown as an empty list, a count of zero, or an absence, and whatever depended
on the answer is left out rather than drawn as if the answer had been "none".
_Avoid_: Failed, error, missing, empty

**Gone**:
Media TMDB once had and no longer has. Not the same as Unanswered, which may
answer next time: Gone is TMDB's answer. A Watch Record for Gone Media still
exists and still renders, since what survives is that the Viewer watched
something.
_Avoid_: Deleted, removed, missing, 404

**Rating**:
TMDB's average score for a piece of Media, out of ten. Media nobody has voted
on has no Rating: TMDB reports a `0`, which is a placeholder standing in for
an absent score rather than a score of zero, so it is left out the way an
absent Fact is.
_Avoid_: Score, stars, vote

**Artwork**:
A picture TMDB supplies for a piece of Media — a Poster or a Backdrop.
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
One Viewer's recorded relationship to one piece of Media. It is in exactly one
state — Planned or Watched — and a piece of Media a Viewer has said nothing
about has no Watch Record at all, which is not a third state.
_Avoid_: Entry, mark, status, tracking

**Planned**:
The state of a Watch Record for Media a Viewer means to watch.
_Avoid_: Todo, saved, wishlist, want

**Watched**:
The state of a Watch Record for Media a Viewer has watched. It replaces Planned
rather than joining it, because you no longer mean to watch what you have
watched.
_Avoid_: Seen, done, finished

**Watchlist**:
A Viewer's Planned Watch Records — the Media they mean to watch. Watched Media
is not on it.
_Avoid_: Queue, saved, list, favourites

**Mark**:
To give a piece of Media a Watch Record in a state, Planned or Watched,
replacing whichever it had. Marking the state a Watch Record already has
unmarks it, which deletes the record. The verb only: the thing it makes is a
Watch Record, never "a mark".
_Avoid_: Save, add, track, toggle, set
