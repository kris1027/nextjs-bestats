# A Score is what makes a record Watched

A Watch Record is Planned, or Watched at a Score of one to ten whole stars.
There is no way to record that a Viewer watched something without saying what
they thought of it, and no way to score something they have not watched. The
row carries the state enum it already had and a nullable `score` beside it,
and a check constraint says which pairs exist:

```sql
check ((state = 'planned' and score is null)
    or (state = 'watched' and score is not null and score between 1 and 10))
```

The `is not null` is load-bearing, and reads like a redundancy next to the
range beside it. A check constraint admits a row when its expression is true
*or* null, and `null between 1 and 10` is null rather than false, so the
version of this without that test admitted the one row it was written to
forbid: Watched, with no Score. The integration test that inserts exactly that
row is what found it, and it is why the constraint has a migration of its own
correcting it — `drizzle/0006_a_watched_row_without_a_score.sql`.

Marking Watched used to be a button. It is now the act of giving a Score, and
`marked` compares the whole marking rather than the state alone: pressing the
Score a record already holds unmarks it, pressing a different one rescores it.

## Why Watched cannot stand alone

An optional Score was the obvious shape and the wrong one. It would have left
`state = 'watched' and score is null` legal, which is a Watched record in two
kinds — scored and not — and every read would have had to decide what the
second kind meant: whether a card shows a badge, whether a list can be
ordered, what an empty star row is claiming. That is the argument
`docs/adr/0007-watchlist-and-watched-are-one-record.md` made against two
booleans, arriving a second time in a different column.

Dropping the enum and letting a null Score mean Planned would have been
tighter still — as many rows as the domain has states, and nothing to check.
It was not worth a rewrite migration on a Postgres enum, and `WatchState` is
the spine of `LISTS`, the two routes, the Kind tabs and the tallies. The check
constraint buys the same guarantee: Postgres will not store the pairs the
domain does not have, so no read has to decide.

A Score in a table of its own was rejected for the reason a second table is
usually rejected here. "Watched implies a Score" would have become a rule
spanning two tables that no constraint can state, and every list read would
have grown a join to find out whether a record was legal.

## Consequences

Every Watch Record that was Watched before this is deleted, in a migration of
its own that runs before the constraint exists. They cannot satisfy it, and
the alternatives were both lies: inventing a Score states a fact nobody gave,
which `docs/adr/0002-placeholder-facts-are-not-facts.md` refuses, and moving
them to Planned claims a Viewer means to watch what they have watched. The
Watched list starts empty for everyone, on purpose.

The Score does not survive a move back to Planned, because the constraint will
not hold it there. A press of Planned on a record scored 9 destroys the 9 with
nothing to undo it. There is still no history — the same sentence 0007 wrote
about the state now covers the Score.

Scoring happens on the detail page alone, because that is the only place ten
stars are still ten targets. The slot there is `max-w-xs` — 320px — and the
only screen where it is narrower is the 320px floor, where the page's `px-4`
gets there first and leaves 288px. Nine 2px gaps out of that is 27px a star,
on a row 36px tall. A grid card at the same floor is 136px — `MediaGrid` is
two columns and `MediaCard` is `calc(50vw - 24px)` — and a control there sits
inside `px-2.5`, so the same ten would be under 10px apiece. 27px clears the
24px WCAG 2.2 asks of a target and 10px is less than half of it, which is the
whole of the argument: the row does not shrink to fit, it moves.

Marking then left the card altogether rather than staying there as the half a
card had room for. A Planned button beside a star row nobody could reach from
the same place meant a card could put a record into one state and never into
the other, and it bought that with a client subtree around markup that
otherwise had nothing to do. A card says what the Viewer said and links to the
page that changes it, which costs a navigation where marking used to cost a
press. That is the price of not putting a 10px touch target in a grid.

`AbsentCard` is the exception, and it is the reason the Planned button still
exists outside the detail page at all. Gone Media 404s there and the card
deliberately has no link to one, so a Watch Record whose Media is Gone can be
reached from nowhere else. Removing it is two presses of Planned: the first
moves the record and drops the Score, the second deletes it. It is the only
card that marks anything, and the only caller `MarkableCard` has.

A card shows one star and one number: TMDB's Rating until the Viewer has
scored the Media, their own Score after. Two ten-point scores a few pixels
apart in a 136px title bar is exactly the confusion `CONTEXT.md` separates
Rating from Score to avoid. The cost is that a scored card no longer shows
what everyone else thought; the detail page still shows both, where there is
room to tell them apart.

On a `MediaCard` that badge is a server render and nothing more, since only a
navigation can change what it says. On an `AbsentCard` the badge and the
Planned button have to agree the instant a press lands, so they share one
optimistic marking — which is what `MarkableCard` spans, and the one client
boundary marking still puts around a card.
