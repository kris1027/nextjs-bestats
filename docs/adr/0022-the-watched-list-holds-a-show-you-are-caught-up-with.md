# The Watched list holds a Show you are caught up with

A Viewer is caught up with a Show when they have watched an Episode of it and
TMDB names no day for anything after the furthest they watched. Being caught
up, and not whether TMDB says the Show has ended, is what puts a Show on the
Watched list.

So the lists read one thing about a Show: a day ahead of the Viewer is
Upcoming, or the Watchlist once that day has passed, and no day ahead is
Watched. An Episode TMDB lists without an air date names no day, and neither
does a season TMDB announces with no Episodes in it yet. Both say more is
coming without saying when, which is nothing to watch and nothing to wait
until.

This narrows `docs/adr/0018-a-show-is-followed-through-its-episodes.md`, which
put a Show on Watched only once TMDB called it `Ended` or `Canceled` and left
everything else with nothing to watch on Upcoming.

## Considered

Leaving it as 0018 had it. 0018 reasoned that wrongly calling a Show finished
is a claim about the Viewer while wrongly leaving one to wait is only visible,
so anything the app was not sure had ended waited. The claim it refused is
still one nobody may make, and it is not the one this makes: a Show on Watched
says the Viewer has watched everything of it that has a date, which is what
their Episode records say and nothing more. What 0018 undercounted is the cost
of waiting. A Show between seasons has nothing to wait for and no day to wait
until, so it sat undated at the foot of Upcoming — below every Movie with a
real release day, for however long the gap ran — on a list whose whole word is
what a Viewer is waiting for.

Dropping only the `ended` check, and keeping a Show on Upcoming where TMDB had
announced a season or listed an undated Episode. The argument was that an
announcement is something to wait for, and that the card already said so.
It was built that way first and was wrong in use: the two shapes are how TMDB
usually spells a gap between seasons, so the Shows this decision is about went
on landing undated at the foot of Upcoming, reached by a different route. A
rule with three clauses also has room for a fourth shape nobody has met yet,
where "is there a day ahead" has none.

Leaving a caught-up Show off every list. It answers the complaint about
Upcoming without touching what Watched means, and costs the Viewer the Show:
it would be reachable from nowhere they keep until TMDB aired something.

## Consequences

A Show leaves Watched. Once TMDB dates the next Episode the Show moves to the
Watchlist or to Upcoming with nobody touching it, which is what a derived list
does and what 0018 already accepted for a cancelled Show picked up again.

`caughtUpAt` is the moment the Viewer scored the furthest Episode they have,
not the last Episode TMDB lists. The two are the same Episode only when
nothing is left at all, which is no longer what being caught up means.
Watched → Shows is ordered by it, where it was ordered by when they finished;
for a Show that has ended the two are the same moment, so nothing already on
the list moves.

Scoring no Episode of a Show is not being caught up with it, however little
TMDB has dated. Otherwise a Planned Show whose first Episode TMDB has
announced without a day would arrive on Watched having been watched by
nobody. A scored Special is not a run and does not start a Show either.

Such a Show waits on Upcoming rather than falling off the lists, which is the
one place the rule above is not the whole of it. Waiting is all a Viewer can
do with something they have not started, as it is with an undated Movie, and a
Planned Show that appeared on no list at all would be reachable from nowhere
they keep — the cost this decision refused to pay when it refused to leave a
caught-up Show off every list. Only a Show a Viewer is under way with leaves
Upcoming for want of a day.

`hasFinished` keeps the narrower rule — ended, and nothing listed after the
furthest scored — and goes on being what `showProgress` reads. An Episode
TMDB lists without a day is still an Episode left, so a Show with one is under
way on its own page however the lists place it, and goes on drawing Stop
watching. Were it finished there, `showPress` would pick nothing and a Viewer
caught up with a running Show would have no way to give it up before the next
season pulled it back onto the Watchlist.

A card on Watched draws the line Upcoming drew — **S4E1 · No date yet**, **S5
· No date yet** — so what TMDB has announced is still somewhere on the lists.
A Show with nothing ahead of the Viewer at all draws no line, which is what
tells the tab's two kinds of Show apart: one that is over, and one between
seasons. The grid's skeleton stands short there all the same, as it does on
the Watchlist and for the reason written beside it — the fallback is drawn
before the address is read, only some of the tab's Shows draw a line, and none
of its Movies do.
