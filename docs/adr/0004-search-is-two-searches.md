# Search is two searches

`/search` calls `/search/tv` and `/search/movie` in parallel and presents them
as two lists, one Kind each, rather than calling `/search/multi`.

`/search/multi` is the tempting one. It is the only search endpoint that
declares `media_type`, and it ranks Shows and Movies against each other, which
is what a search box leads a visitor to expect. It also returns People —
sampling `query=tom`, 5 of the 20 results on the first page were People, and
the app has nothing to say about a person. Dropping them leaves a page of
unpredictable length, and a `total_results` that no longer counts what was
rendered. The app would be re-ranking and re-sizing a list it tells the visitor
is TMDB's.

The per-Kind endpoints declare no `media_type`, so the Kind is the caller's to
supply — the same arrangement `mediaDetails` already has, and the one the
glossary describes.

## Consequences

Two requests per search rather than one. They are independent, so they are
issued together.

Relevance is ranked within a Kind and never across, and the visitor picks a
tab to cross between them. The best match overall can sit behind the tab that
is not open.

Which tab is open is therefore part of the address (`?kind=`), guarded by the
same `isKind` as the `[kind]` route segment. That lets the server open the tab
that has something in it — a Query matching only Movies opens on Movies — and
it is why those tabs are links rather than `components/ui/tabs.tsx`, whose
state lives in the client where the address cannot see it.

Being links, they cannot wear `TabsTrigger`'s classes either. That string sits
inline in a generated file, and its selected state hangs off the `data-active`
Base UI sets rather than the `aria-current` a link carries, so
`components/search/kind-tabs.tsx` mirrors the styling by hand and says so in
its own comment. Restyling the trending tabs therefore leaves the search tabs
untouched: carry the change across, or let the two differ, but decide it rather
than discover it.

Those links replace rather than push. A tab toggle is a step within one search,
not a search of its own, and the page carries a Back that `router.back()`
drives whenever there is history behind it — so an entry per toggle would
leave the visitor walking back through their own toggles instead of returning
to trending.

People are unreachable through search. Searching an actor's name finds Media
whose own name matches it, not the actor.

Each Kind carries its own `total`, so paging, if it is ever added, belongs to
the active Kind and is coupled to `kind` rather than independent of it.
