# Counts are Facts only once a Show has aired

TMDB reports `number_of_seasons: 1` and `number_of_episodes: 1` for Shows that
have never aired — a placeholder, not a measurement. Sampling 40 Shows TMDB
listed as `Planned`: none reported zero for either field, 17 reported the 1/1
placeholder, and 23 had an empty `first_air_date`. So season and episode counts
become Facts only when there is an air date to anchor them.

Do not remove that guard, and do not replace it with a falsy check. The value
is `1`, so `count ? … : null` catches nothing; only the absence of
`first_air_date` distinguishes an unaired Show from a one-season one.

## Consequences

An unaired Show's detail page carries no Facts at all — its date is absent for
the same reason. The page shows its label, rating and overview, and the Fact
row is empty. That is the glossary's rule working as written: a Fact TMDB has
no value for is absent rather than blank.
