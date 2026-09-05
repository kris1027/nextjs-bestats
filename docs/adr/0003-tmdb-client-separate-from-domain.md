# The TMDB client is separate from the domain

`lib/tmdb.ts` speaks TMDB's vocabulary — its payload shapes, its snake_case
fields, its image hosts. `lib/media.ts` speaks the glossary's, and is the only
module that maps between the two. `app/` and `components/` import from
`lib/media` and never from `lib/tmdb`.

They are split even though TMDB is presently the whole domain, because the two
change for different reasons — one when TMDB's API moves, the other when the
words on the page do — and because the watch records this app is eventually
for need a home that is not named after a third-party API.

## Consequences

`lib/tmdb.ts` exports its wire types so `lib/media.ts` can map them. That is
the only place they are allowed to be imported.
