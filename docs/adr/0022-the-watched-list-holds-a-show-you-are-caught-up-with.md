# The Watched list holds a Show you are caught up with

A Viewer is caught up with a Show when TMDB lists no Episode after the
furthest one they have scored and announces no season after it either. That,
and not whether TMDB says the Show has ended, is what puts a Show on the
Watched list.

This narrows `docs/adr/0018-a-show-is-followed-through-its-episodes.md`, which
put a Show on Watched only once TMDB called it `Ended` or `Canceled` and left
everything else with nothing to watch on Upcoming.

A season TMDB lists with no Episodes in it keeps a Show on Upcoming, and so
does a next Episode TMDB lists without an air date. Both are something the
Viewer has not watched; neither is a day they can be told.

## Considered

Leaving it as 0018 had it. 0018 reasoned that wrongly calling a Show finished
is a claim about the Viewer while wrongly leaving one to wait is only visible,
so anything the app was not sure had ended waited. The claim it refused is
still one nobody may make, and it is not the one this makes: a Show on Watched
says the Viewer has watched every Episode there is, which is what their
Episode records say and nothing more. What 0018 undercounted is the cost of
waiting. A Show between seasons has nothing to wait for and no day to wait
until, so it sat undated at the foot of Upcoming — below every Movie with a
real release day, for however long the gap ran — on a list whose whole word is
what a Viewer is waiting for.

Moving an announced season's Show to Watched too, which is the same rule read
one step further. TMDB naming a season is TMDB saying more is coming, and the
card already says so — `Next season · S5 · No date yet`. A card on Watched
draws no lead, so the announcement would leave the lists altogether.

Leaving a caught-up Show off every list. It answers the complaint about
Upcoming without touching what Watched means, and costs the Viewer the Show:
it would be reachable from nowhere they keep until TMDB aired something.

## Consequences

A Show leaves Watched. Once TMDB dates the next Episode the Show moves to the
Watchlist or to Upcoming with nobody touching it, which is what a derived list
does and what 0018 already accepted for a cancelled Show picked up again. It
is between-seasons Shows that move; a Show part-way through an airing season
stays put, since TMDB lists the rest of its Episodes with days on them.

`hasFinished` keeps the `ended` check and `caughtUp` is the half without it.
The lists read `caughtUpAt`; `showProgress` goes on reading `hasFinished`, so
a Show still running is under way however little is left of it and its page
goes on offering Stop watching. Were it finished there, `showPress` would pick
nothing, and a Viewer caught up with a running Show would have no way to give
it up before the next season pulled it back onto the Watchlist.

Watched → Shows is ordered by `caughtUpAt` — when the Viewer scored the last
Episode TMDB lists — where it was ordered by when they finished. For a Show
that has ended the two are the same moment, so nothing already on the list
moves.

The tab now holds two things its cards cannot tell apart: a Show that is over,
and a Show between seasons. Both are true readings of having watched every
Episode there is, and the Show's own page still says which, since
`showProgress` knows. A lead saying which on the card would need `PlacedMedia`
to carry whether TMDB said the Show ended, and a fresh answer for the Watched
skeleton's height at the 320px floor — worth paying when the tab is confusing,
not before.
