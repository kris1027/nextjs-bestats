# One route serves both Kinds

`/tv/{id}` and `/movie/{id}` are served by a single `app/[kind]/[id]` route,
guarded by `isKind`, rather than by two sibling routes — so the detail page is
written once and the Kind is a value the page passes along rather than a fork
in the file tree.

## Consequences

Every future top-level route must be a static segment. `app/about/page.tsx`
works, because Next prefers a static segment over a dynamic sibling;
`app/[slug]/page.tsx` would collide with `[kind]` and is not available.

An unknown first segment — `/banana/123` — is rejected by `isKind` before any
request is made and renders `app/not-found.tsx`.
