---
name: branch-check
description: Review the current branch's diff against AGENTS.md and propose updates where the branch has made it stale. Use when a branch is finished, before opening a pull request, or when the user asks to check the project docs against recent work.
---

# Branch check

Decide whether the work on this branch has made `AGENTS.md` inaccurate, and
propose the smallest edit that fixes it.

**Most branches need no change.** Reporting "still accurate" is a success. A
check that pads the file to justify itself makes it worse.

## 1. Read the branch

```bash
git merge-base main HEAD
git diff --stat "$(git merge-base main HEAD)"..HEAD
git log --oneline "$(git merge-base main HEAD)"..HEAD
```

Then read `AGENTS.md` as it currently stands. Read the diff itself for any
file the triggers below point at.

## 2. Look for these triggers

**The rules**

- `package.json` scripts added, removed or renamed → the Commands list
- A test written in a new place or shape, or a test dependency added → Tests
- A new module under `lib/`, or a new import path between layers → Module
  boundary
- `biome.json` or `tsconfig.json` gaining a rule that AGENTS.md states in prose
  → delete the prose; the config now owns it
- A hand-written convention the diff establishes that a reader would otherwise
  guess wrong

**The glossary — `## Language`**

- A domain word in the diff — a type, a route segment, a component name — that
  the glossary does not define
- A glossary word used in the diff to mean something the entry does not say
- An entry describing behaviour the branch has changed

## 3. Report

State the verdict first: what is stale, or that nothing is.

For each proposed change, show the exact edit — the current text and the
replacement — and say which diff hunk drove it. Wait for approval before
touching the file. Do not edit it unattended.

## Boundaries

- Never restate what `biome.json` or `tsconfig.json` enforce.
- Never add architecture overviews, route maps, directory layouts or dependency
  lists. They rot, and Claude can read the tree.
- Never propose ADRs or a `docs/` folder. A decision worth keeping is one
  line in Standing rules.
- Keep the rules under 350 lines; `## Language` does not count towards it. A
  new domain word is a new word and is never refused for length, but a rule
  added and never removed is how the rest grows. If a proposed addition pushes
  the rules past that, propose a cut alongside it.
