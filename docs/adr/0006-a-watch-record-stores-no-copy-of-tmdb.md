# A Watch Record stores no copy of TMDB

A Watch Record holds a Viewer, a Kind, a TMDB id, a state and its timestamps.
It does not hold the title, the poster path, the release date, or anything else
TMDB knows. Rendering the Watchlist means asking TMDB for each piece of Media
on it.

Denormalising a label and an image would have made those pages cheap, and the
argument for it is a good one right up until the two copies disagree. TMDB
retitles Media, replaces Artwork and corrects dates. A stored copy is right on
the day it is written and drifts silently afterwards, and nothing in the app
would ever notice — the Watchlist would show one title and the detail page it
links to another.

`CONTEXT.md` opens by saying every fact the app shows about a title comes from
TMDB. That sentence is worth keeping literally true rather than approximately
true.

## Consequences

A list of twenty Watch Records is twenty TMDB requests. That is why the lists
paginate at twenty rather than showing everything a Viewer has ever marked:
the per-page cost is bounded whatever the Viewer's history looks like, and it
is the page size TMDB already sets everywhere else in the app.

A Watch Record whose Media TMDB will not answer for still exists and still has
to render. The app already distinguishes a Kind TMDB did not answer for from a
Kind that matched nothing, and that distinction is reused rather than a third
word being invented for it.

Nothing about a Viewer's records survives TMDB going away, which is the correct
outcome: what survives is the fact that they watched something, and that is
what the row holds.
