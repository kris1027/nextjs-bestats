# The narrow header gives up words

BeStats is laid out for a 390px screen and must not overflow one of 320px.
Two numbers because they do different jobs: 390 is what the base styles are
drawn for, and 320 is a contract — nothing scrolls sideways there, nothing is
clipped, and every control can still be pressed. The first is taste and the
second is checkable, which is why the floor is the one written down.

Nothing had ever been read at either width. The classes were mobile-first by
habit — there is not one `max-*` variant in the repo — but a class order is
not a decision, and the unprefixed layer was whatever desktop happened to
leave behind. The signed-in header is where that showed: "BeStats", two list
links, the avatar, the Viewer's name and "Sign out" measured **503px** of
content in the 288px a 320px screen has inside `px-4`. It overflowed on every
phone ever made, not merely on small ones.

So the header gives up words. Below `sm:` the two list links are the icons the
marking control already spells those states with — `Bookmark` for Planned,
`Check` for Watched — and the Viewer's name is read but not drawn. It measures
278px. "Sign out" keeps its word: it is the one control here with a
consequence, and an icon for leaving is a glyph nobody reads the same way.

## Considered and rejected

- **A disclosure menu behind the avatar.** Holds the name, both lists and
  Sign out, and leaves the row nearly empty. Rejected because it is client-
  gated by definition, and the sign-out is a form posting to a Server Action
  precisely so it works before hydration. It would also make both the primary
  navigation and the way out depend on JavaScript, and add a Base UI menu to
  `components/ui/` — three costs to buy space we did not need.

- **A second row below `sm:`.** Brand and Viewer on one, the list links on the
  other. Rejected because the header's height is fixed on purpose: the Viewer
  control streams in behind a Suspense boundary, and `docs/adr/0010` fixes the
  height so the two pixels between the fallback and the control cannot move
  the page. A row that exists only once that control lands turns those two
  pixels into forty. Reserving the row for everyone instead means every
  Visitor carries an empty band to buy a Viewer a layout nobody asked for.

- **44×44 hit areas.** The platform guidance. Rejected at 44 wide because it
  needs the gaps cut to `gap-2` and leaves 4px of margin at 320 — against
  measurements, not estimates, but still four pixels, and one heavier glyph
  in a rendered font eats them. The links are **32 wide and 44 tall** instead.
  Width is what separates the two links from each other and is the dimension
  the row is short of; height is free inside a 56px header, so it is spent in
  full. 32×44 clears WCAG 2.5.8's 24×24 with room.

- **Hiding the name with `hidden`.** Rejected because it takes the name out of
  the accessibility tree too, and the name is what says which account this is.
  It is `sr-only` instead: absolute, so it adds no width and no gap, and still
  announced. An icon whose label nobody can reach is not a saving.

## Consequences

**`Bookmark` means Planned in two files now.** `ICONS` in
`components/layout/list-links.tsx` mirrors `BUTTONS` in
`components/watch/marking-control.tsx`. They are not shared because that map
also carries the words those buttons wear, which are the state's words and not
a list's — "Planned" against "Watchlist". Nothing enforces the agreement, the
same seam `LinkTabs` has with `TabsTrigger`, and the same instruction applies:
change the one, change the other.

**The avatar can no longer render nothing.** `ViewerAvatar` returned `null`
for a Viewer whose provider served no picture, which cost nothing while the
name sat beside it and would have emptied the header's Viewer half entirely
once the name was hidden. It falls back to a monogram, and `initials` in
`lib/format.ts` is the pure half of that, with tests.

**The floor is stated and unenforced.** Every width in this document was
measured in a browser rather than estimated, but nothing in the repo re-checks
them. A test would mean a browser runner, which is a third Vitest project with
an execution model neither of the two has — it needs a built app or a dev
server, and locally that server points at production's branch per
`docs/adr/0013`. That is its own decision, filed rather than smuggled in here.

**One case still overflows.** Two list tabs wearing five-figure tallies
measure 315px against 288. It needs 10,000 records in one list and degrades to
a page that scrolls sideways rather than to anything unreadable. The fix would
be `overflow-x-auto` inside a fixed-height row, which spends a scrollbar's
height on every platform that does not overlay them — a cost to everyone to
close a case almost nobody reaches.

**Two more pairs have to agree, and one fails quietly.** Beside the `Bookmark`
map above, each marking control's height against the skeleton in
`control-skeleton.tsx` that holds room for it — one skeleton each, since
`docs/adr/0016-a-score-is-what-makes-a-record-watched.md` made the control
two shapes and took the `@min-[200px]` this ADR first named here with it; and
a grid's `grid-cols-*` against the `sizes` of the posters in it. The second is
the one to watch. A skeleton of the wrong height is visible the moment anyone
looks, but a lying `sizes` has no symptom on screen at all — the markup stays
right while every phone fetches a poster far wider than it draws. Both are in
`CLAUDE.md`; only the second needed an argument there.

**The tabs' padding is a third.** `LinkTabs` narrowed to `px-2.5` below `sm:`
to fit the 320px row while `TabsTrigger` keeps `px-4`, so the home page's tabs
take the same pair at their call site rather than diverging from every other
set of tabs at exactly the width this document is about.
