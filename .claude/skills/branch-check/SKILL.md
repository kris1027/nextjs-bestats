---
name: branch-check
description: Review the current branch's diff against CLAUDE.md and CONTEXT.md and propose updates where the branch has made them stale. Use when a branch is finished, before opening a pull request, or when the user asks to check the project docs against recent work.
---

# Branch check

Decide whether the work on this branch has made `CLAUDE.md` or `CONTEXT.md`
inaccurate, and propose the smallest edit that fixes it.

**Most branches need no change.** Reporting "still accurate" is a success. A
check that pads the file to justify itself makes both documents worse.

## 1. Read the branch

```bash
git merge-base main HEAD
git diff --stat "$(git merge-base main HEAD)"..HEAD
git log --oneline "$(git merge-base main HEAD)"..HEAD
```

Then read `CLAUDE.md` and `CONTEXT.md` as they currently stand. Read the diff
itself for any file the triggers below point at.

## 2. Look for these triggers

**CLAUDE.md**

- `package.json` scripts added, removed or renamed → the Commands list
- A test written in a new place or shape, or a test dependency added → Tests
- A new module under `lib/`, or a new import path between layers → Module
  boundary
- A new file in `docs/adr/` → its rule belongs in Standing rules, one line,
  linked to the ADR
- `biome.json` or `tsconfig.json` gaining a rule that CLAUDE.md states in prose
  → delete the prose; the config now owns it
- A hand-written convention the diff establishes that a reader would otherwise
  guess wrong

**CONTEXT.md**

- A domain word in the diff — a type, a route segment, a component name — that
  the glossary does not define
- A glossary word used in the diff to mean something the entry does not say
- An entry describing behaviour the branch has changed

## 3. Report

State the verdict first: what is stale, or that nothing is.

For each proposed change, show the exact edit — the current text and the
replacement — and say which diff hunk drove it. Wait for approval before
touching either file. Do not edit them unattended.

## Boundaries

- Never restate what `biome.json` or `tsconfig.json` enforce.
- Never add architecture overviews, route maps, directory layouts or dependency
  lists. They rot, and Claude can read the tree.
- Do not draft ADRs. If a branch made a decision that looks worth recording,
  say so in one sentence and leave the writing to the user.
- Keep `CLAUDE.md` under 200 lines. If a proposed addition pushes past that,
  propose a cut alongside it.
