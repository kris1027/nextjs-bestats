---
name: branch-check
description: Review the current branch's diff against AGENTS.md, CLAUDE.md and README.md and propose updates where the branch has made them stale. Use when a branch is finished, before opening a pull request, or when the user asks to check the project docs against recent work.
---

# Branch check

Decide whether the work on this branch has made `AGENTS.md`, `CLAUDE.md` or
`README.md` inaccurate, and propose the smallest edit that fixes it.

These three are the project's only documentation, and the check reads and
proposes edits to nothing else. `CLAUDE.md` is a symlink to `AGENTS.md`, so
it is checked by confirming it still is one; its content is `AGENTS.md`'s.

**Most branches need no change.** Reporting "still accurate" is a success. A
check that pads a file to justify itself makes it worse.

## 1. Read the branch

```bash
git merge-base main HEAD
git diff --stat "$(git merge-base main HEAD)"..HEAD
git log --oneline "$(git merge-base main HEAD)"..HEAD
test -L CLAUDE.md && readlink CLAUDE.md
```

Then read `AGENTS.md` and `README.md` as they currently stand. Read the diff
itself for any file the triggers below point at.

## 2. Look for these triggers

**`AGENTS.md` — the rules**

- `package.json` scripts added, removed or renamed → the Commands list
- A test written in a new place or shape, or a test dependency added → Tests
- A new module under `lib/`, or a new import path between layers → Module
  boundary
- `biome.json` or `tsconfig.json` gaining a rule that AGENTS.md states in prose
  → delete the prose; the config now owns it
- A hand-written convention the diff establishes that a reader would otherwise
  guess wrong

**`AGENTS.md` — the glossary, `## Language`**

- A domain word in the diff — a type, a route segment, a component name — that
  the glossary does not define
- A glossary word used in the diff to mean something the entry does not say
- An entry describing behaviour the branch has changed

**`CLAUDE.md`**

- No longer a symlink to `AGENTS.md`, or a file of its own content → restore
  the link

**`README.md`**

- `package.json` scripts added, removed or renamed → the Commands table
- An environment variable added, removed or renamed in `.env.example` → the
  Environment table
- A route, or a top-level directory under `app/`, `components/` or `lib/`, added
  or removed → What it does, and Structure
- A prerequisite changed — the Node version, the package manager, a service
  the app needs → Prerequisites and Setup
- A sentence the branch has made false — a feature it describes, a limit it
  states, a boundary it names

## 3. Report

State the verdict first, per file: what is stale, or that nothing is.

For each proposed change, show the exact edit — the file, the current text and
the replacement — and say which diff hunk drove it. Wait for approval before
touching a file. Do not edit them unattended.

## Boundaries

- Never propose a new documentation file — no ADRs, no `docs/` folder, no
  second README. A decision worth keeping is one line in Standing rules.
- Never restate what `biome.json` or `tsconfig.json` enforce.
- Never add architecture overviews, route maps, directory layouts or dependency
  lists to `AGENTS.md`. They rot, and Claude can read the tree. `README.md`'s
  Structure section is the one layout the project keeps; keep it accurate
  rather than growing it.
- Keep the rules under 350 lines; `## Language` does not count towards it. A
  new domain word is a new word and is never refused for length, but a rule
  added and never removed is how the rest grows. If a proposed addition pushes
  the rules past that, propose a cut alongside it.
