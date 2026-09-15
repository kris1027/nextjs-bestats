# A migration never uses the enum value it adds

A migration that adds a value to a Postgres enum names that value nowhere
else: no check constraint, default, index predicate or data statement in any
migration that can be pending beside it. A constraint that has to speak about
the new value says what the other values allow instead.

`drizzle-kit migrate` applies every pending migration in one transaction, and
Postgres refuses to use an enum value in the transaction that added it:
`ALTER TYPE … ADD VALUE` succeeds, and the first statement that names the
value fails with "unsafe use of new value". Splitting the addition and its use
into two migrations does not help, because both are pending together wherever
neither has run: on every CI branch, which applies every migration at once,
and on `main` whenever the person who migrates it is more than one behind.
— `docs/adr/0009-every-environment-is-a-neon-branch.md`

So `drizzle/0011_a_show_can_be_stopped.sql` adds `stopped` to `watch_state`
and keeps it to a Show without naming it. `watch_records_stopped_is_a_show`
says a Movie's row is Planned or Watched, and
`watch_records_score_matches_state` says anything but Watched carries no
Score, which is the same rule as "Planned or Stopped carries none" written
with the one value the transaction already had.

## Considered

Recreating the enum — a new type with the value, a column cast across, the
old type dropped — can name the value in the same migration, and rewrites
every row of `watch_records` to do it. Running the `ALTER TYPE` by hand
before `db:migrate` is a step no migration records, where 0009 has a database
brought up to date by running `pnpm db:migrate` and nothing else. Neither buys
more than a constraint phrased the other way round.

## Consequences

The check constraints read as what a row cannot be rather than what it can,
which is a sentence longer each. A later migration, applied once the value
exists, may name it; nothing yet needs to.

A migration that breaks this rule passes `db:generate`, the type checker and
every unit test, and fails only when `db:migrate` runs — so the rule lives in
CLAUDE.md rather than in a check.
