# Vitest replaces the Node test runner

`CLAUDE.md` said, in as many words, that there is no Vitest or Jest and none
should be added. This overturns that rule rather than quietly editing it away,
because the rule was written deliberately and deserves an argument.

The rule was right while the suite was `lib/format.test.mts`. Node strips the
types itself, there is nothing to configure, and a runner that ships with the
runtime cannot rot. What changed is that v1 needs two suites with different
requirements, not one. Unit tests are pure and belong on every commit.
Integration tests talk to Postgres, take seconds rather than milliseconds, need
credentials, and must never run on a commit hook. One command that means both
of those things is a command that will be run wrongly.

Two things the Node runner does not do were decisive together rather than
separately. It does not read `tsconfig` paths, so every test import is relative
and carries its extension while every other import in the repo says `@/` — a
divergence `CLAUDE.md` had to document because it could not be fixed. And it
has no answer at all for rendering a React component, which the marking control
will need the moment it exists.

## Considered options

Node's runner with `imports` subpaths in `package.json` — `#lib/format.ts` —
and two globs for the two suites. This is genuinely cheaper and would have
solved the aliases and the split. It was rejected because it solves neither the
component tests nor the fact that the alias it introduces is a third spelling
of the same import, alongside `@/` and the relative one.

Keeping the runner and deferring the decision to the step that adds the
control. Rejected because the CI workflow lands with the split, and building
that workflow against one runner to rewrite it against another shortly after is
the more expensive path.

## Consequences

Tests move from `.test.mts` to `.test.ts` and sit beside their source as
before. `@/` works in them, so test imports finally look like every other
import in the repo.

There is a config file where there was none, and a dependency that can break on
its own schedule. That is the price.
