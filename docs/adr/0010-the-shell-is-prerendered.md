# The shell is prerendered

`cacheComponents` is on. Every route prerenders a shell — the header, a
page's frame, its form, its tabs — and streams the rest into Suspense
boundaries, so the static rendering the header cost when it started reading
the session came back without the header giving that up. The build enforces
it: an uncached read outside a boundary — `cookies()`, `params`,
`searchParams`, a `fetch`, a database query — refuses to build rather than
quietly making the route dynamic, which is what happened before and what
nobody noticed.

This was tried once before the boundaries existed and reverted, because the
flag asked for every one of them at once. It landed when the boundaries
were the work being done anyway.

## What the flag changes that the code cannot say

**The TMDB cache is a directive, not a fetch option.** `lib/tmdb` used to
cache with `next: { revalidate: 3600 }` on the fetch. Under the flag that
option is superseded: the migration guide moves it into a `use cache`
function with `cacheLife`, and the two fetchers carry that directive now,
with the hours profile whose revalidate is the hour the option said. Still
in `lib/tmdb`, since it is the one module that knows a request is made at
all; `lib/media` and `app/` never learn a request is cached. A thrown
request never reaches the cache, so Unanswered stays a per-request answer.
A 404 does, which is fine: Gone Media stops being asked for.

**A page's request-time reads sit inside its own boundary, not under a
`loading.tsx`.** What is outside a boundary is the shell, so a `loading.tsx`
per route would make every shell the header alone. The pages draw their own
boundaries around what waits, and `loading.tsx` exists only where the whole
page follows a check — `/settings`, `/sign-in`. Every fallback is a
skeleton the height of what replaces it.

**A theme preference cannot be a cookie.** The class that picks the palette
sits on `<html>`, above every boundary, and reading a cookie there is the
one request-time read no boundary can contain. When the toggle arrives it
reads the browser's storage before first paint, from a script, and the
server never knows the theme.

## Consequences

The flag is one line, but turning it off leaves the directive and the
boundaries doing nothing anyone asked for, and turning it back on means
learning again what the build refuses. That is the reason this is written
down.

A Visitor sees the shell before the stream: a Viewer's list shows its
heading and tabs for the moment before a Visitor is redirected to sign in,
the way the header shows nothing in the Viewer control's place. That moment
is the price of the shell and was accepted in step 2 for the header.

Neon's session wrapper reads cookies inside a try of its own, and during a
prerender that read hangs and then rejects. `lib/auth` awaits `cookies()`
first, outside any try, so the renderer sees the hang the ordinary way; a
catch around the wrapper alone logged every build as an outage.
