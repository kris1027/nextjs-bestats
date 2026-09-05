# BeStats

A place to browse what is popular on TMDB and, in time, to record what you have
watched. Every fact the app shows about a title comes from TMDB; nothing about
a viewer exists yet.

## Language

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
by Kind, and a Fact TMDB has no value for is absent rather than blank.
_Avoid_: Attribute, metadata, field, stat

**Trending**:
What TMDB reports as most popular over the past week. The home page shows
nothing else, and the ranking is TMDB's, not the app's.
_Avoid_: Popular, top, featured
